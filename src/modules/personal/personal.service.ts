import { query } from '../../config/database.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { normalizarTelefonoChileno } from '../../shared/utils/phone.js';
import { WhatsAppService } from '../../shared/utils/whatsapp.js';

export interface FiltrosPersonal {
  tenant?: string;
  proyecto?: string;
  cargo?: string;
  rol?: string;
  busqueda?: string;
}

export class PersonalService {
  /**
   * Listar personal con filtros
   */
  static async listar(filtros: FiltrosPersonal) {
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
    if (filtros.tenant) {
      params.push(String(filtros.tenant).toLowerCase());
      sql += ` AND (t.slug = $${params.length} OR t.id::text = $${params.length})`;
    }
    if (filtros.proyecto) {
      params.push(String(filtros.proyecto));
      sql += ` AND (pr.codigo = $${params.length} OR pr.id::text = $${params.length})`;
    }
    if (filtros.rol) {
      params.push(String(filtros.rol).toLowerCase());
      sql += ` AND p.rol_organizacional = $${params.length}`;
    }
    if (filtros.busqueda) {
      params.push(`%${String(filtros.busqueda).toLowerCase()}%`);
      sql += ` AND (LOWER(p.nombre_completo) LIKE $${params.length} OR p.rut LIKE $${params.length} OR p.telefono_whatsapp LIKE $${params.length})`;
    }

    sql += ` ORDER BY p.nombre_completo ASC LIMIT 200;`;
    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Eliminar personal (hard delete o baja)
   */
  static async eliminar(id: string, tenantId: string) {
    // 1. Obtener datos antes de eliminar para posible limpieza en Supabase Auth
    const findRes = await query(
      'SELECT id, nombre_completo, email, auth_user_id FROM core.personal WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (findRes.rowCount === 0) return null;
    const personal = findRes.rows[0];

    // 2. Eliminar de core.personal_proyectos y core.personal
    await query('DELETE FROM core.personal_proyectos WHERE personal_id = $1', [id]);
    await query('DELETE FROM core.personal WHERE id = $1 AND tenant_id = $2', [id, tenantId]);

    // 3. Si tenía cuenta en Supabase Auth y no es super_admin, remover de Auth opcionalmente
    if (personal.auth_user_id) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(personal.auth_user_id);
        console.log(`🗑️ Usuario Auth eliminado para ${personal.email}`);
      } catch (authErr: any) {
        console.warn(`Aviso al eliminar de auth.users: ${authErr.message}`);
      }
    }

    return personal;
  }

  /**
   * Despachar invitaciones y enlace
   */
  static async procesarInvitacion(personal: any, rawTelefono?: string | null) {
    if (!personal.email) return '';
    let inviteUrl = '';
    const emailNorm = personal.email.toLowerCase().trim();
    const redirectUrl = `https://app.lukeapp.cl/admin/crear-clave.html?email=${encodeURIComponent(emailNorm)}`;

    try {
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: emailNorm,
        options: {
          redirectTo: redirectUrl,
          data: {
            nombre: personal.nombre_completo,
            role: personal.rol_organizacional,
            tenant_id: personal.tenant_id
          }
        }
      });

      if (linkData?.properties?.action_link) {
        inviteUrl = linkData.properties.action_link;
        if (linkData.user) {
          await query('UPDATE core.personal SET auth_user_id = $1 WHERE id = $2', [linkData.user.id, personal.id]);
        }
      } else if (linkErr) {
        const { data: recovData } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: emailNorm,
          options: { redirectTo: redirectUrl }
        });
        if (recovData?.properties?.action_link) {
          inviteUrl = recovData.properties.action_link;
          if (recovData.user) {
            await query('UPDATE core.personal SET auth_user_id = $1 WHERE id = $2', [recovData.user.id, personal.id]);
          }
        }
      }
    } catch (genErr: any) {
      console.warn('⚠️ Error al generar action_link:', genErr.message);
    }

    try {
      await supabaseAdmin.auth.admin.inviteUserByEmail(emailNorm, {
        redirectTo: redirectUrl,
        data: { nombre: personal.nombre_completo, role: personal.rol_organizacional, tenant_id: personal.tenant_id }
      });
    } catch (mailErr: any) {
      console.warn('⚠️ Aviso email invite:', mailErr.message);
    }

    if (rawTelefono) {
      try {
        const telefonoNorm = normalizarTelefonoChileno(rawTelefono);
        const urlParaAcceso = inviteUrl || redirectUrl;
        const msgWa =
          `🎉 *¡Invitación a LukeAPPs!*\n\n` +
          `Hola *${personal.nombre_completo}*,\n` +
          `Has sido invitado/a como *${personal.cargo || 'Administrador'}* en LukeAPPs.\n\n` +
          `🔐 *Activa tu cuenta y crea tu contraseña aquí con un solo toque:*\n` +
          `👉 ${urlParaAcceso}\n\n` +
          `_Usuario: ${emailNorm}_`;

        await WhatsAppService.enviarMensaje({ to: telefonoNorm || rawTelefono, text: msgWa });
      } catch (waErr: any) {
        console.warn('⚠️ No se pudo enviar WhatsApp:', waErr.message);
      }
    }

    return inviteUrl;
  }
}
