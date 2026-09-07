import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';
import { normalizarRut, validarRut } from '../../shared/utils/rut.js';
import { normalizarTelefonoChileno } from '../../shared/utils/phone.js';
import { PersonalService } from './personal.service.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { z } from 'zod';

export const personalRouter = Router();

// Listar personal con filtros
personalRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant, proyecto, cargo, rol, busqueda } = req.query;
    const personal = await PersonalService.listar({
      tenant: tenant as string,
      proyecto: proyecto as string,
      cargo: cargo as string,
      rol: rol as string,
      busqueda: busqueda as string
    });
    return sendSuccess(res, personal);
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

    if (body.proyecto_id) {
      await query(`
        INSERT INTO core.personal_proyectos (personal_id, proyecto_id, puede_sincronizar)
        VALUES ($1, $2, $3)
        ON CONFLICT (personal_id, proyecto_id) DO UPDATE SET puede_sincronizar = $3;
      `, [nuevoPersonal.id, body.proyecto_id, body.puede_sincronizar_excel]);
    }

    let inviteUrl = '';
    if (body.email) {
      inviteUrl = await PersonalService.procesarInvitacion(nuevoPersonal, body.telefono_whatsapp);
    }

    const respuestaData = { ...nuevoPersonal, invite_url: inviteUrl };
    return sendSuccess(res, respuestaData, 201, { mensaje: `Personal '${nuevoPersonal.nombre_completo}' registrado con éxito.` });
  } catch (error) {
    next(error);
  }
});

// Eliminar personal definitivamente
personalRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userRole = (req as any).user?.rol;
    if (userRole === 'operario') {
      return sendError(res, 'No tienes permisos para eliminar personal de la empresa.', 403);
    }

    const tenantId = (req as any).tenant?.id || (req as any).user?.tenant_id;
    if (!tenantId && userRole !== 'super_admin') {
      return sendError(res, 'Falta contexto de empresa (tenant)', 400);
    }

    const id = String(req.params.id);
    const resultado = await PersonalService.eliminar(id, tenantId);

    if (!resultado) {
      return sendError(res, 'Personal no encontrado o no pertenece a tu empresa', 404);
    }

    return sendSuccess(res, resultado, 200, {
      mensaje: `Personal '${resultado.nombre_completo}' eliminado exitosamente de la dotación.`
    });
  } catch (error) {
    next(error);
  }
});

// Endpoint para generar enlace de activación directo bajo demanda
personalRouter.post('/:id/enlace-invitacion', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const persRes = await query('SELECT * FROM core.personal WHERE id = $1', [id]);
    if (persRes.rowCount === 0) return sendError(res, 'Personal no encontrado', 404);
    const persona = persRes.rows[0];
    if (!persona.email) return sendError(res, 'Este personal no tiene email registrado', 400);

    const emailNorm = persona.email.toLowerCase().trim();
    const redirectUrl = `https://app.lukeapp.cl/admin/crear-clave.html?email=${encodeURIComponent(emailNorm)}`;

    let inviteUrl = '';
    const { data: recovData } = await supabaseAdmin.auth.admin.generateLink({
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
