import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';
import { normalizarRut, validarRut } from '../../shared/utils/rut.js';
import { normalizarTelefonoChileno } from '../../shared/utils/phone.js';
import { WhatsAppService } from '../../shared/utils/whatsapp.js';
import { z } from 'zod';

export const personalRouter = Router();

// Listar personal con filtros
personalRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant, proyecto, cargo, rol, busqueda } = req.query;

    let sql = `
      SELECT 
        p.*,
        t.slug AS tenant_slug,
        t.business_name AS tenant_razon_social,
        pr.codigo AS proyecto_codigo,
        pr.nombre AS proyecto_nombre
      FROM core.personal p
      JOIN core.tenants t ON t.id = p.tenant_id
      LEFT JOIN core.proyectos pr ON pr.id = p.proyecto_id
      WHERE p.activo = TRUE
    `;

    const params: any[] = [];
    if (tenant) {
      params.push(String(tenant).toLowerCase());
      sql += ` AND (t.slug = $${params.length} OR t.id::text = $${params.length})`;
    }
    if (proyecto) {
      params.push(String(proyecto));
      sql += ` AND (pr.codigo = $${params.length} OR pr.id::text = $${params.length})`;
    }
    if (rol) {
      params.push(String(rol).toLowerCase());
      sql += ` AND p.rol_organizacional = $${params.length}`;
    }
    if (busqueda) {
      params.push(`%${String(busqueda).toLowerCase()}%`);
      sql += ` AND (LOWER(p.nombre_completo) LIKE $${params.length} OR p.rut LIKE $${params.length} OR p.telefono_whatsapp LIKE $${params.length})`;
    }

    sql += ` ORDER BY p.nombre_completo ASC LIMIT 200;`;

    const result = await query(sql, params);
    return sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
});

const createPersonalSchema = z.object({
  tenant_id: z.string().uuid(),
  proyecto_id: z.string().uuid().optional().nullable(),
  rut: z.string().min(8),
  nombre_completo: z.string().min(3),
  cargo: z.string().min(2),
  rol_organizacional: z.string().default('operario'),
  telefono_whatsapp: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  turno: z.string().optional().nullable(),
  usuario_windows: z.string().optional().nullable(),
  puede_sincronizar_excel: z.boolean().default(true)
});

// Crear personal
personalRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userRole = (req as any).user?.rol;
    if (userRole === 'operario') {
      return sendError(res, 'No tienes permisos para registrar o invitar personal al sistema.', 403);
    }

    const body = createPersonalSchema.parse(req.body);
    const rutLimpio = normalizarRut(body.rut);

    if (!validarRut(rutLimpio)) {
      return sendError(res, 'RUT inválido', 400);
    }

    // Prevenir escalamiento de privilegios: solo super_admin o fundador pueden crear fundadores
    if (body.rol_organizacional === 'fundador' || body.rol_organizacional === 'admin_empresa') {
      if (userRole !== 'super_admin' && userRole !== 'fundador' && userRole !== 'admin_empresa' && userRole !== 'admin') {
        return sendError(res, 'No tienes permisos para otorgar el rol de Fundador / Gerencia General', 403);
      }
    }

    const telefonoNorm = body.telefono_whatsapp ? normalizarTelefonoChileno(body.telefono_whatsapp) : null;
    const usuarioWindowsNorm = body.usuario_windows ? body.usuario_windows.trim() : null;

    const result = await query(`
      INSERT INTO core.personal (
        tenant_id, proyecto_id, rut, nombre_completo, cargo, rol_organizacional, 
        telefono_whatsapp, email, turno, usuario_windows, puede_sincronizar_excel
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `, [
      body.tenant_id,
      body.proyecto_id || null,
      rutLimpio,
      body.nombre_completo,
      body.cargo,
      body.rol_organizacional,
      telefonoNorm,
      body.email || null,
      body.turno || null,
      usuarioWindowsNorm,
      body.puede_sincronizar_excel
    ]);

    const nuevoPersonal = result.rows[0];

    // Si viene asignado a un proyecto, asegurar registro en core.personal_proyectos
    if (body.proyecto_id) {
      await query(`
        INSERT INTO core.personal_proyectos (personal_id, proyecto_id, puede_sincronizar)
        VALUES ($1, $2, $3)
        ON CONFLICT (personal_id, proyecto_id) DO UPDATE SET puede_sincronizar = $3;
      `, [nuevoPersonal.id, body.proyecto_id, body.puede_sincronizar_excel]);
    }

    // Si se especificó email, generar enlace directo, enviar invitación y WhatsApp
    let inviteUrl = '';
    if (body.email) {
      try {
        const { supabaseAdmin } = await import('../../config/supabase.js');
        const emailNorm = body.email.toLowerCase().trim();
        const redirectUrl = `https://app.lukeapp.cl/admin/crear-clave.html?email=${encodeURIComponent(emailNorm)}`;

        // 1. Intentar generar enlace directo de invitación
        try {
          const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email: emailNorm,
            options: {
              redirectTo: redirectUrl,
              data: {
                nombre: body.nombre_completo,
                role: body.rol_organizacional,
                tenant_id: body.tenant_id
              }
            }
          });

          if (linkData?.properties?.action_link) {
            inviteUrl = linkData.properties.action_link;
            if (linkData.user) {
              await query('UPDATE core.personal SET auth_user_id = $1 WHERE id = $2', [linkData.user.id, nuevoPersonal.id]);
            }
          } else if (linkErr) {
            // Si el usuario ya existe, generar enlace de recuperación/activación directa
            const { data: recovData } = await supabaseAdmin.auth.admin.generateLink({
              type: 'recovery',
              email: emailNorm,
              options: { redirectTo: redirectUrl }
            });
            if (recovData?.properties?.action_link) {
              inviteUrl = recovData.properties.action_link;
              if (recovData.user) {
                await query('UPDATE core.personal SET auth_user_id = $1 WHERE id = $2', [recovData.user.id, nuevoPersonal.id]);
              }
            }
          }
        } catch (genErr: any) {
          console.warn('⚠️ Error al generar action_link de invitación:', genErr.message);
        }

        // 2. Despachar correo oficial de invitación por Supabase / Resend
        try {
          await supabaseAdmin.auth.admin.inviteUserByEmail(emailNorm, {
            redirectTo: redirectUrl,
            data: { nombre: body.nombre_completo, role: body.rol_organizacional, tenant_id: body.tenant_id }
          });
          console.log(`📧 [EMAIL] Invitación enviada a ${emailNorm} para rol ${body.rol_organizacional}`);
        } catch (mailErr: any) {
          console.warn('⚠️ Aviso al enviar correo invite:', mailErr.message);
        }

        // 3. Si se indicó teléfono WhatsApp, enviar mensaje con enlace directo infalible
        if (body.telefono_whatsapp) {
          try {
            const urlParaAcceso = inviteUrl || redirectUrl;
            const msgWa =
              `🎉 *¡Invitación a LukeAPPs!*\n\n` +
              `Hola *${body.nombre_completo}*,\n` +
              `Has sido invitado/a como *${body.cargo || 'Administrador'}* en LukeAPPs.\n\n` +
              `🔐 *Activa tu cuenta y crea tu contraseña aquí con un solo toque:*\n` +
              `👉 ${urlParaAcceso}\n\n` +
              `_Usuario: ${emailNorm}_`;

            await WhatsAppService.enviarMensaje({ to: telefonoNorm || body.telefono_whatsapp, text: msgWa });
          } catch (waErr: any) {
            console.warn('⚠️ No se pudo enviar WhatsApp al usuario invitado:', waErr.message);
          }
        }
      } catch (authErr: any) {
        console.warn('⚠️ Aviso Supabase Auth en personal:', authErr.message);
      }
    }

    const respuestaData = { ...nuevoPersonal, invite_url: inviteUrl };
    return sendSuccess(res, respuestaData, 201, { mensaje: `Personal '${nuevoPersonal.nombre_completo}' registrado con éxito.` });
  } catch (error) {
    next(error);
  }
});

// Endpoint para generar enlace de activación directo bajo demanda para un personal existente
personalRouter.post('/:id/enlace-invitacion', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const persRes = await query('SELECT * FROM core.personal WHERE id = $1', [id]);
    if (persRes.rowCount === 0) return sendError(res, 'Personal no encontrado', 404);
    const persona = persRes.rows[0];
    if (!persona.email) return sendError(res, 'Este personal no tiene email registrado', 400);

    const { supabaseAdmin } = await import('../../config/supabase.js');
    const emailNorm = persona.email.toLowerCase().trim();
    const redirectUrl = `https://app.lukeapp.cl/admin/crear-clave.html?email=${encodeURIComponent(emailNorm)}`;

    let inviteUrl = '';
    const { data: recovData, error: recovErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: emailNorm,
      options: { redirectTo: redirectUrl }
    });

    if (recovData?.properties?.action_link) {
      inviteUrl = recovData.properties.action_link;
    } else {
      const { data: invData } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: emailNorm,
        options: { redirectTo: redirectUrl }
      });
      inviteUrl = invData?.properties?.action_link || redirectUrl;
    }

    return sendSuccess(res, { invite_url: inviteUrl, email: emailNorm, nombre: persona.nombre_completo });
  } catch (error) {
    next(error);
  }
});
