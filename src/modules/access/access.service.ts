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
      const firstTenant = await query('SELECT id FROM core.tenants WHERE activo = TRUE ORDER BY created_at ASC LIMIT 1');
      tenantId = firstTenant.rows[0]?.id || null;
    }

    // 2. Guardar solicitud en core.solicitudes_acceso
    const insertRes = await query(`
      INSERT INTO core.solicitudes_acceso (
        usuario_windows, telefono, nombre, equipo, tenant_id, estado, created_at, updated_at
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
        SELECT * FROM core.solicitudes_acceso 
        WHERE estado = 'PENDIENTE' 
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
        SELECT id, tenant_id, codigo, nombre 
        FROM core.proyectos 
        WHERE (codigo = $1 OR id::text = $1) AND activo = TRUE 
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

        // 3. Crear o actualizar core.personal
        const usuarioNorm = solicitud.usuario_windows.trim();
        const soloUser = usuarioNorm.includes('\\') ? usuarioNorm.split('\\')[1] : usuarioNorm;

        const persExist = await client.query(`
          SELECT id FROM core.personal 
          WHERE (
            UPPER(usuario_windows) = UPPER($1) 
            OR UPPER(usuario_windows) = UPPER($2) 
            OR telefono_whatsapp = $3
          )
          LIMIT 1;
        `, [usuarioNorm, soloUser, solicitud.telefono]);

        let personalId: string;

        if (persExist.rows.length > 0) {
          personalId = persExist.rows[0].id;
          await client.query(`
            UPDATE core.personal SET 
              usuario_windows = $1,
              telefono_whatsapp = $2,
              nombre_completo = $3,
              puede_sincronizar_excel = TRUE,
              activo = TRUE,
              updated_at = NOW()
            WHERE id = $4;
          `, [usuarioNorm, solicitud.telefono, solicitud.nombre, personalId]);
        } else {
          // Generar RUT identificador provisional único
          const rutTemp = `TEMP-${Date.now().toString().slice(-7)}`;
          const insertPers = await client.query(`
            INSERT INTO core.personal (
              tenant_id, proyecto_id, rut, nombre_completo, cargo, rol_organizacional,
              telefono_whatsapp, usuario_windows, puede_sincronizar_excel, activo, created_at, updated_at
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

        // 4. Vincular en core.personal_proyectos
        await client.query(`
          INSERT INTO core.personal_proyectos (personal_id, proyecto_id, puede_sincronizar, created_at)
          VALUES ($1, $2, TRUE, NOW())
          ON CONFLICT (personal_id, proyecto_id) DO UPDATE SET puede_sincronizar = TRUE;
        `, [personalId, proyecto.id]);

        // 5. Actualizar la solicitud
        await client.query(`
          UPDATE core.solicitudes_acceso SET 
            estado = 'APROBADA',
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
        SELECT * FROM core.solicitudes_acceso 
        WHERE estado = 'PENDIENTE' 
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
        UPDATE core.solicitudes_acceso SET 
          estado = 'RECHAZADA',
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
}
