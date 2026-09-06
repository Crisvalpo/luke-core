import { dbPool, query } from '../../config/database.js';
import { SolicitudAccesoInput } from './access.schema.js';
import { WhatsAppService } from '../../shared/utils/whatsapp.js';
import { normalizarTelefonoChileno } from '../../shared/utils/phone.js';

export class AccessService {
  /**
   * Registra una nueva solicitud de acceso desde Excel y notifica al Administrador por WhatsApp
   */
  static async crearSolicitud(input: SolicitudAccesoInput) {
    const telefonoNorm = normalizarTelefonoChileno(input.telefono);
    const usuarioWindows = input.usuario_windows.trim();

    // 1. Resolver Tenant
    let tenantId: string | null = null;
    if (input.tenant) {
      const tenantRes = await query(
        'SELECT id FROM core.tenants WHERE slug = $1 OR id::text = $1 LIMIT 1',
        [input.tenant.toLowerCase()]
      );
      tenantId = tenantRes.rows[0]?.id || null;
    }

    if (!tenantId) {
      const firstTenant = await query('SELECT id FROM core.tenants WHERE is_active = TRUE ORDER BY created_at ASC LIMIT 1');
      tenantId = firstTenant.rows[0]?.id || null;
    }

    // 2. Guardar solicitud en core.access_requests
    const insertRes = await query(`
      INSERT INTO core.access_requests (
        usuario_windows, telefono, nombre, equipo, tenant_id, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, 'PENDIENTE', NOW(), NOW())
      RETURNING *;
    `, [
      usuarioWindows,
      telefonoNorm,
      input.nombre,
      input.equipo || null,
      tenantId
    ]);

    const solicitud = insertRes.rows[0];

    // 3. Resolver teléfono del Administrador
    let adminTelefono: string | null = null;

    if (tenantId) {
      const adminRes = await query(`
        SELECT telefono_whatsapp 
        FROM core.personal 
        WHERE tenant_id = $1 
          AND rol_organizacional IN ('super_admin', 'admin') 
          AND telefono_whatsapp IS NOT NULL 
          AND activo = TRUE 
        ORDER BY CASE WHEN rol_organizacional = 'super_admin' THEN 1 ELSE 2 END 
        LIMIT 1;
      `, [tenantId]);
      adminTelefono = adminRes.rows[0]?.telefono_whatsapp || null;
    }

    // Fallback al administrador principal del sistema
    if (!adminTelefono) {
      adminTelefono = '+56935264052';
    }

    // 4. Enviar notificación interactiva por WhatsApp al Administrador
    const mensajeAdmin = 
      `🔐 *NUEVA SOLICITUD LUKEAPP*\n\n` +
      `*Nombre:*\n${solicitud.nombre}\n\n` +
      `*Usuario Windows:*\n${solicitud.usuario_windows}\n\n` +
      `*Teléfono:*\n${solicitud.telefono}\n\n` +
      `*Equipo:*\n${solicitud.equipo || 'No especificado'}\n\n` +
      `*Responda a este mensaje:*\n\n` +
      `👉 *APROBAR <codigo_proyecto>*\n` +
      `_(ejemplo: *APROBAR 501* o *APROBAR 413*)_\n\n` +
      `👉 *RECHAZAR*`;

    await WhatsAppService.enviarMensaje({
      to: adminTelefono,
      text: mensajeAdmin
    });

    return {
      ok: true,
      solicitud_id: solicitud.id,
      mensaje: 'Solicitud de acceso enviada al administrador vía WhatsApp.'
    };
  }

  /**
   * Procesa mensajes entrantes desde el Webhook de WhatsApp (Baileys)
   */
  static async procesarMensajeWhatsApp(remitente: string, mensajeTexto: string) {
    if (!mensajeTexto || typeof mensajeTexto !== 'string') return;

    const texto = mensajeTexto.trim();
    const telRemitente = normalizarTelefonoChileno(remitente) || remitente.replace(/[^0-9]/g, '');

    if (!telRemitente) return;

    // ─────────────────────────────────────────────────────────────
    // CASO A: COMANDO "APROBAR <codigo_proyecto>"
    // ─────────────────────────────────────────────────────────────
    const matchAprobar = texto.match(/^APROBAR\s+([a-zA-Z0-9_\-\.]+)/i);
    if (matchAprobar) {
      const codigoProyecto = matchAprobar[1].trim();

      // 1. Buscar la última solicitud PENDIENTE
      const solRes = await query(`
        SELECT * FROM core.access_requests 
        WHERE status = 'PENDIENTE' 
        ORDER BY created_at DESC 
        LIMIT 1;
      `);

      if (solRes.rows.length === 0) {
        await WhatsAppService.enviarMensaje({
          to: telRemitente,
          text: '⚠️ No hay solicitudes de acceso pendientes para aprobar en este momento.'
        });
        return;
      }

      const solicitud = solRes.rows[0];

      // 2. Buscar el proyecto
      const proyRes = await query(`
        SELECT id, tenant_id, code AS codigo, name AS nombre 
        FROM core.projects 
        WHERE (code = $1 OR id::text = $1) AND is_active = TRUE 
        LIMIT 1;
      `, [codigoProyecto]);

      if (proyRes.rows.length === 0) {
        await WhatsAppService.enviarMensaje({
          to: telRemitente,
          text: `❌ No se encontró el proyecto con código '*${codigoProyecto}*'. Verifique el código de faena y responda nuevamente (ej: *APROBAR 501*).`
        });
        return;
      }

      const proyecto = proyRes.rows[0];
      const client = await dbPool.connect();

      try {
        await client.query('BEGIN');

        // 3. Crear o actualizar core.personnel
        const usuarioNorm = solicitud.usuario_windows.trim();
        const soloUser = usuarioNorm.includes('\\') ? usuarioNorm.split('\\')[1] : usuarioNorm;

        const persExist = await client.query(`
          SELECT id FROM core.personnel 
          WHERE (
            UPPER(usuario_windows) = UPPER($1) 
            OR UPPER(usuario_windows) = UPPER($2) 
            OR phone_number = $3
          )
          LIMIT 1;
        `, [usuarioNorm, soloUser, solicitud.telefono]);

        let personalId: string;

        if (persExist.rows.length > 0) {
          personalId = persExist.rows[0].id;
          await client.query(`
            UPDATE core.personnel SET 
              usuario_windows = $1,
              phone_number = $2,
              full_name = $3,
              puede_sincronizar_excel = TRUE,
              is_active = TRUE,
              updated_at = NOW()
            WHERE id = $4;
          `, [usuarioNorm, solicitud.telefono, solicitud.nombre, personalId]);
        } else {
          // Generar RUT identificador provisional único
          const rutTemp = `TEMP-${Date.now().toString().slice(-7)}`;
          const insertPers = await client.query(`
            INSERT INTO core.personnel (
              tenant_id, project_id, national_id, full_name, job_title, org_role,
              phone_number, usuario_windows, puede_sincronizar_excel, is_active, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, 'Cubicador Piping', 'operario', $5, $6, TRUE, TRUE, NOW(), NOW())
            RETURNING id;
          `, [
            proyecto.tenant_id,
            proyecto.id,
            rutTemp,
            solicitud.nombre,
            solicitud.telefono,
            usuarioNorm
          ]);
          personalId = insertPers.rows[0].id;
        }

        // 4. Vincular en core.project_personnel
        await client.query(`
          INSERT INTO core.project_personnel (personnel_id, project_id, puede_sincronizar, created_at)
          VALUES ($1, $2, TRUE, NOW())
          ON CONFLICT (personnel_id, project_id) DO UPDATE SET puede_sincronizar = TRUE;
        `, [personalId, proyecto.id]);

        // 5. Actualizar la solicitud
        await client.query(`
          UPDATE core.access_requests SET 
            status = 'APROBADA',
            proyecto_id = $1,
            aprobado_por = $2,
            updated_at = NOW()
          WHERE id = $3;
        `, [proyecto.id, telRemitente, solicitud.id]);

        await client.query('COMMIT');

        // 6. Confirmar al Administrador
        await WhatsAppService.enviarMensaje({
          to: telRemitente,
          text: `✅ *ACCESO APROBADO*\n\n` +
                `*Usuario:*\n${solicitud.usuario_windows}\n\n` +
                `*Nombre:*\n${solicitud.nombre}\n\n` +
                `*Proyecto Asignado:*\n${proyecto.codigo} — ${proyecto.nombre}`
        });

        // 7. Notificar al Cubicador solicitante
        if (solicitud.telefono) {
          await WhatsAppService.enviarMensaje({
            to: solicitud.telefono,
            text: `🎉 *LukeApp — Acceso Habilitado*\n\n` +
                  `Hola *${solicitud.nombre}*,\n` +
                  `Tu solicitud de acceso para el proyecto *${proyecto.codigo} (${proyecto.nombre})* ha sido *APROBADA*.\n\n` +
                  `Ya puedes abrir tu archivo Excel e *Iniciar Sesión* o *Publicar*.`
          });
        }

      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Error aprobando solicitud:', err);
        await WhatsAppService.enviarMensaje({
          to: telRemitente,
          text: `❌ Error al procesar la aprobación: ${err.message}`
        });
      } finally {
        client.release();
      }
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // CASO B: COMANDO "RECHAZAR"
    // ─────────────────────────────────────────────────────────────
    if (texto.toUpperCase() === 'RECHAZAR') {
      const solRes = await query(`
        SELECT * FROM core.access_requests 
        WHERE status = 'PENDIENTE' 
        ORDER BY created_at DESC 
        LIMIT 1;
      `);

      if (solRes.rows.length === 0) {
        await WhatsAppService.enviarMensaje({
          to: telRemitente,
          text: '⚠️ No hay solicitudes pendientes para rechazar.'
        });
        return;
      }

      const solicitud = solRes.rows[0];

      await query(`
        UPDATE core.access_requests SET 
          status = 'RECHAZADA',
          aprobado_por = $1,
          updated_at = NOW()
        WHERE id = $2;
      `, [telRemitente, solicitud.id]);

      await WhatsAppService.enviarMensaje({
        to: telRemitente,
        text: `❌ *ACCESO RECHAZADO*\n\n*Usuario:*\n${solicitud.usuario_windows}\n\n*Nombre:*\n${solicitud.nombre}`
      });

      if (solicitud.telefono) {
        await WhatsAppService.enviarMensaje({
          to: solicitud.telefono,
          text: `⚠️ *LukeApp — Notificación de Acceso*\n\n` +
                `Hola *${solicitud.nombre}*,\n` +
                `Tu solicitud de acceso no fue aprobada en esta oportunidad.\n` +
                `Por favor contacta al administrador de faena para mayor información.`
        });
      }
    }
  }

  /**
   * Obtiene los proyectos autorizados para el usuario autenticado (JWT)
   */
  static async obtenerMisProyectos(usuarioWindows: string, personalId?: string, tenantId?: string) {
    const usuarioNorm = usuarioWindows.trim();
    const soloUser = usuarioNorm.includes('\\') ? usuarioNorm.split('\\')[1] : usuarioNorm;

    // 1. Resolver usuario en core.personnel
    let personal: any = null;
    if (personalId) {
      const pRes = await query('SELECT id, tenant_id, full_name AS nombre_completo, usuario_windows, org_role AS rol_organizacional FROM core.personnel WHERE id = $1', [personalId]);
      personal = pRes.rows[0];
    }

    if (!personal) {
      const pRes = await query(`
        SELECT id, tenant_id, full_name AS nombre_completo, usuario_windows, org_role AS rol_organizacional 
        FROM core.personnel 
        WHERE UPPER(usuario_windows) = UPPER($1) OR UPPER(usuario_windows) = UPPER($2) 
        LIMIT 1;
      `, [usuarioNorm, soloUser]);
      personal = pRes.rows[0];
    }

    if (!personal) {
      throw new Error(`Personal no encontrado para el usuario ${usuarioWindows}`);
    }

    let proyectos: any[] = [];

    // 2. Si es super_admin o admin, tiene acceso a todos los proyectos del tenant
    if (personal.rol_organizacional === 'super_admin' || personal.rol_organizacional === 'admin') {
      const proyRes = await query(`
        SELECT id, code AS codigo, name AS nombre, cost_center AS centro_costo, is_active AS activo, TRUE AS puede_sincronizar
        FROM core.projects
        WHERE tenant_id = $1 AND is_active = TRUE
        ORDER BY code ASC;
      `, [personal.tenant_id]);
      proyectos = proyRes.rows;
    } else {
      // 3. Si es operario/cubicador, buscar en core.project_personnel
      const proyRes = await query(`
        SELECT DISTINCT pr.id, pr.code AS codigo, pr.name AS nombre, pr.cost_center AS centro_costo, pr.is_active AS activo, pp.puede_sincronizar
        FROM core.projects pr
        JOIN core.project_personnel pp ON pp.project_id = pr.id
        WHERE pp.personnel_id = $1 AND pr.is_active = TRUE AND pp.puede_sincronizar = TRUE
        ORDER BY pr.code ASC;
      `, [personal.id]);
      proyectos = proyRes.rows;
    }

    return {
      personal_id: personal.id,
      usuario_windows: personal.usuario_windows || usuarioNorm,
      nombre: personal.nombre_completo,
      proyectos: proyectos.map(p => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        centro_costo: p.centro_costo,
        estado: p.activo ? 'activo' : 'inactivo',
        puede_sincronizar: p.puede_sincronizar === true
      }))
    };
  }
}
