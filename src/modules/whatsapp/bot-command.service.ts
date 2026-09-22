import { query } from '../../config/database.js';
import { normalizarTelefonoChileno } from '../../shared/utils/phone.js';
import { normalizarRut, validarRut } from '../../shared/utils/rut.js';
import { TenantsService } from '../tenants/tenants.service.js';

export interface MensajeEntranteWhatsApp {
  telefonoRemoto: string;
  texto: string;
  nombreRemoto?: string;
}

export class BotCommandService {
  /**
   * Procesa cualquier mensaje entrante de WhatsApp y ejecuta el motor de comandos o máquina de estados
   */
  static async procesarMensajeEntrante(input: MensajeEntranteWhatsApp): Promise<string> {
    const telNorm = normalizarTelefonoChileno(input.telefonoRemoto);
    if (!telNorm) return '';

    const textoLimpio = input.texto.trim();
    const comando = textoLimpio.toLowerCase();

    // 1. Resolver identidad y perfil del usuario
    const userRes = await query(`
      SELECT p.*, p.full_name AS nombre_completo, p.org_role AS rol_organizacional, p.phone_number AS telefono_whatsapp, t.slug as tenant_slug 
      FROM core.personnel p
      JOIN core.tenants t ON t.id = p.tenant_id
      WHERE p.phone_number = $1 AND p.is_active = TRUE
      LIMIT 1;
    `, [telNorm]);

    const esSuperAdmin = userRes.rows.length > 0 && (
      userRes.rows[0].rol_organizacional === 'super_admin' || 
      userRes.rows[0].rol_organizacional === 'staff' ||
      userRes.rows[0].email?.endsWith('@eimontajes.cl') ||
      userRes.rows[0].email?.endsWith('@lukeapp.cl')
    );

    const user = userRes.rows[0] || null;

    // 2. Obtener o inicializar la sesión conversacional en core.sesiones_canal
    const sesionRes = await query(`
      SELECT * FROM core.sesiones_canal
      WHERE identificador_remoto = $1 AND canal = 'whatsapp'
      ORDER BY updated_at DESC LIMIT 1;
    `, [telNorm]);

    let sesion = sesionRes.rows[0] || null;

    if (!sesion) {
      const defaultTenantId = user?.tenant_id || (await query('SELECT id FROM core.tenants LIMIT 1')).rows[0]?.id;
      if (defaultTenantId) {
        const createSesion = await query(`
          INSERT INTO core.sesiones_canal (tenant_id, canal, identificador_remoto, personal_id, estado_conversacion, flujo_activo, contexto_ia)
          VALUES ($1, 'whatsapp', $2, $3, 'inicio', NULL, '{}'::jsonb)
          RETURNING *;
        `, [defaultTenantId, telNorm, user?.id || null]);
        sesion = createSesion.rows[0];
      }
    }

    // 3. Comandos Globales de Cancelación
    if (comando === '/cancelar' || comando === 'cancelar') {
      if (sesion) {
        await query(`
          UPDATE core.sesiones_canal
          SET flujo_activo = NULL, estado_conversacion = 'inicio', contexto_ia = '{}'::jsonb, updated_at = NOW()
          WHERE id = $1;
        `, [sesion.id]);
      }
      return '❌ Asistente cancelado exitosamente. Envía */menu* o */ayuda* para ver las opciones disponibles.';
    }

    // 4. Si hay un flujo activo en curso paso a paso
    if (sesion && sesion.flujo_activo === 'NUEVO_CLIENTE' && !comando.startsWith('/')) {
      return await this.procesarFlujoNuevoCliente(sesion, textoLimpio);
    }

    // 5. Manejo de Comandos Explícitos con '/'
    if (comando === '/ayuda' || comando === '/menu' || comando === 'hola' || comando === 'menu') {
      return this.generarMenuAyuda(esSuperAdmin, user);
    }

    if (comando === '/estado' || comando === '/status') {
      return await this.generarReporteEstado();
    }

    // Comandos Exclusivos de Staff (Super-Admin)
    if (comando === '/nuevocliente' || comando === '/nuevaempresa') {
      if (!esSuperAdmin) {
        return '🚫 *Acceso Restringido*: El comando `/nuevocliente` está reservado exclusivamente para el equipo Staff LukeAPP.';
      }
      return await this.iniciarFlujoNuevoCliente(sesion, telNorm, user);
    }

    if (comando === '/empresas' || comando === '/clientes') {
      if (!esSuperAdmin) {
        return '🚫 *Acceso Restringido*: El comando `/empresas` está reservado exclusivamente para Staff LukeAPP.';
      }
      return await this.generarReporteEmpresas();
    }

    return '❓ Comando no reconocido. Envía */menu* o */ayuda* para ver la lista de comandos válidos.';
  }

  /**
   * Genera el menú interactivo con formato estilo Telegram
   */
  private static generarMenuAyuda(esSuperAdmin: boolean, user: any): string {
    const nombre = user?.nombre_completo || 'Colaborador';
    let menu = `⚡ *LukeCore Bot Assistant*\nHola *${nombre}*, aquí tienes los comandos disponibles:\n\n`;

    if (esSuperAdmin) {
      menu += `👑 *COMANDOS STAFF LUKEAPP*\n`;
      menu += `• */nuevocliente* : Alta interactiva de nueva empresa (paso a paso)\n`;
      menu += `• */empresas* : Lista y estado de todas las empresas clientes\n`;
      menu += `• */estado* : Diagnóstico del servidor y base de datos\n`;
      menu += `• */cancelar* : Cancelar asistente conversacional activo\n\n`;
    }

    menu += `📋 *COMANDOS GENERALES*\n`;
    menu += `• */ayuda* : Ver este menú interactivo de opciones\n`;
    menu += `• */cancelar* : Reiniciar interacción\n`;

    return menu;
  }

  /**
   * Inicia el flujo conversacional paso a paso de /nuevocliente
   */
  private static async iniciarFlujoNuevoCliente(sesion: any, telNorm: string, user: any): Promise<string> {
    const tenantId = user?.tenant_id || sesion?.tenant_id || (await query('SELECT id FROM core.tenants LIMIT 1')).rows[0]?.id;

    await query(`
      INSERT INTO core.sesiones_canal (tenant_id, canal, identificador_remoto, personal_id, estado_conversacion, flujo_activo, contexto_ia)
      VALUES ($1, 'whatsapp', $2, $3, 'PASO_1_RAZON_SOCIAL', 'NUEVO_CLIENTE', '{}'::jsonb)
      ON CONFLICT (tenant_id, canal, identificador_remoto)
      DO UPDATE SET 
        flujo_activo = 'NUEVO_CLIENTE',
        estado_conversacion = 'PASO_1_RAZON_SOCIAL',
        contexto_ia = '{}'::jsonb,
        updated_at = NOW();
    `, [tenantId, telNorm, user?.id || null]);

    return `🏢 *ASISTENTE ALTA DE NUEVA EMPRESA*\n\n*Paso 1 de 7*: Por favor, responde a este mensaje con la *Razón Social* o Nombre Legal de la Empresa:\n\n_(Ej: Inversiones Andina SpA)_`;
  }

  /**
   * Procesa cada paso de la máquina de estados de /nuevocliente
   */
  private static async procesarFlujoNuevoCliente(sesion: any, texto: string): Promise<string> {
    const estado = sesion.estado_conversacion;
    const contexto = sesion.contexto_ia || {};

    if (estado === 'PASO_1_RAZON_SOCIAL') {
      if (texto.length < 3) return '⚠️ La Razón Social debe tener al menos 3 caracteres. Por favor, ingresa el nombre de la empresa:';
      contexto.razon_social = texto;
      await this.guardarPasoSesion(sesion.id, 'PASO_2_RUT_EMPRESA', contexto);
      return `✍️ Razón Social: *${texto}*\n\n*Paso 2 de 7*: Ingresa el *RUT de la Empresa*:\n\n_(Ej: 76.123.456-K)_`;
    }

    if (estado === 'PASO_2_RUT_EMPRESA') {
      const rutNorm = normalizarRut(texto);
      if (!validarRut(rutNorm)) return '❌ RUT de empresa inválido. Por favor ingresa un RUT válido con dígito verificador (Ej: 76.123.456-K):';
      contexto.rut_empresa = rutNorm;
      await this.guardarPasoSesion(sesion.id, 'PASO_3_SLUG', contexto);
      return `🆔 RUT Empresa: *${rutNorm}*\n\n*Paso 3 de 7*: Ingresa el *Slug Identificador* (nombre corto en minúsculas sin espacios o acentos):\n\n_(Ej: constructora-andina)_`;
    }

    if (estado === 'PASO_3_SLUG') {
      const slugLimpio = texto.toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (slugLimpio.length < 2) return '⚠️ El slug debe contener letras y números sin espacios. Intenta de nuevo:';
      contexto.slug = slugLimpio;
      await this.guardarPasoSesion(sesion.id, 'PASO_4_NOMBRE_ADMIN', contexto);
      return `🔗 Slug: *${slugLimpio}*\n\n*Paso 4 de 7*: Ingresa el *Nombre Completo* del Administrador / Fundador inicial:`;
    }

    if (estado === 'PASO_4_NOMBRE_ADMIN') {
      if (texto.length < 3) return '⚠️ El nombre del administrador debe ser válido. Intenta de nuevo:';
      contexto.nombre_admin = texto;
      await this.guardarPasoSesion(sesion.id, 'PASO_5_RUT_ADMIN', contexto);
      return `👤 Admin: *${texto}*\n\n*Paso 5 de 7*: Ingresa el *RUT del Administrador*:\n\n_(Ej: 15.678.901-2)_`;
    }

    if (estado === 'PASO_5_RUT_ADMIN') {
      const rutNorm = normalizarRut(texto);
      if (!validarRut(rutNorm)) return '❌ RUT de administrador inválido. Por favor reingresa el RUT con dígito verificador:';
      contexto.rut_admin = rutNorm;
      await this.guardarPasoSesion(sesion.id, 'PASO_6_EMAIL_ADMIN', contexto);
      return `🆔 RUT Admin: *${rutNorm}*\n\n*Paso 6 de 7*: Ingresa el *Email de Contacto* del Administrador:`;
    }

    if (estado === 'PASO_6_EMAIL_ADMIN') {
      if (!texto.includes('@') || !texto.includes('.')) return '❌ Correo electrónico inválido. Por favor reingresa el Email:';
      contexto.email_admin = texto.toLowerCase().trim();
      await this.guardarPasoSesion(sesion.id, 'PASO_7_TEL_ADMIN', contexto);
      return `✉️ Email Admin: *${contexto.email_admin}*\n\n*Paso 7 de 7*: Finalmente, ingresa el *Teléfono WhatsApp* del Administrador:\n\n_(Ej: +56912345678)_`;
    }

    if (estado === 'PASO_7_TEL_ADMIN') {
      const telNorm = normalizarTelefonoChileno(texto);
      if (!telNorm) return '❌ Número WhatsApp inválido. Ingresa un número válido (Ej: +56912345678):';
      contexto.telefono_admin = telNorm;

      // ¡PASO FINAL: EJECUTAR ALTA EN BASE DE DATOS!
      try {
        const resultado = await TenantsService.onboardTenant({
          razon_social: contexto.razon_social,
          rut: contexto.rut_empresa,
          slug: contexto.slug,
          config: {
            pais: 'CL',
            tipo_industria: 'industrial',
            color_primario: '#10b981',
            modulos_activos: ['core', 'piping', 'equipos', 'ingesta_masiva', 'cuadrillas']
          },
          administrador_inicial: {
            nombre_completo: contexto.nombre_admin,
            rut: contexto.rut_admin,
            cargo: 'Fundador / Administrador General',
            email: contexto.email_admin,
            telefono_whatsapp: contexto.telefono_admin
          }
        });

        // Limpiar sesión conversacional
        await query(`
          UPDATE core.sesiones_canal
          SET flujo_activo = NULL, estado_conversacion = 'inicio', contexto_ia = '{}'::jsonb, updated_at = NOW()
          WHERE id = $1;
        `, [sesion.id]);

        return `🎉 *¡EMPRESA DADA DE ALTA EXITOSAMENTE EN LUKECORE!*\n\n` +
          `🏢 *Empresa*: ${resultado.tenant.business_name}\n` +
          `🆔 *RUT*: ${resultado.tenant.tax_id}\n` +
          `🔗 *Slug*: ${resultado.tenant.slug}\n` +
          `👤 *Admin*: ${resultado.administrador.nombre_completo}\n` +
          `📱 *WhatsApp*: ${resultado.administrador.telefono_whatsapp}\n` +
          `✉️ *Email*: ${resultado.administrador.email}\n\n` +
          `⚡ *URL Acceso*: https://app.lukeapp.cl/admin/`;
      } catch (err: any) {
        console.error('Error procesando onboarding en bot:', err);
        return `❌ *Error al dar de alta empresa*: ${err.message}\n\nUsa */cancelar* o intenta con */nuevocliente* nuevamente.`;
      }
    }

    return '❓ Paso no reconocido. Envía */cancelar* para reiniciar.';
  }

  private static async guardarPasoSesion(sesionId: string, siguienteEstado: string, contexto: any) {
    await query(`
      UPDATE core.sesiones_canal
      SET estado_conversacion = $1, contexto_ia = $2::jsonb, updated_at = NOW()
      WHERE id = $3;
    `, [siguienteEstado, JSON.stringify(contexto), sesionId]);
  }

  private static async generarReporteEmpresas(): Promise<string> {
    const res = await query(`
      SELECT t.slug, t.business_name, t.tax_id, t.is_active,
             COUNT(DISTINCT p.id) as total_proyectos,
             COUNT(DISTINCT pers.id) as total_personal
      FROM core.tenants t
      LEFT JOIN core.projects p ON p.tenant_id = t.id
      LEFT JOIN core.personnel pers ON pers.tenant_id = t.id AND pers.is_active = TRUE
      GROUP BY t.id, t.slug, t.business_name, t.tax_id, t.is_active
      ORDER BY t.business_name ASC;
    `);

    if (res.rows.length === 0) return '🏢 No hay empresas registradas en Luke Core.';

    let reporte = `🏢 *EMPRESAS REGISTRADAS EN LUKE CORE (${res.rows.length})*\n\n`;
    res.rows.forEach(t => {
      const estado = t.is_active ? '🟢 Activa' : '🔴 Pausada';
      reporte += `• *${t.business_name}* (${t.slug})\n  RUT: ${t.tax_id} | ${estado}\n  Proyectos: ${t.total_proyectos} | Dotación: ${t.total_personal}\n\n`;
    });

    return reporte;
  }

  private static async generarReporteEstado(): Promise<string> {
    const uptimeMin = Math.floor(process.uptime() / 60);
    const dbRes = await query('SELECT count(*) FROM core.tenants');
    return `⚡ *ESTADO DE INFRAESTRUCTURA LUKE CORE*\n\n` +
      `• *Servicio Core*: 🟢 ONLINE\n` +
      `• *Uptime*: ${uptimeMin} minutos\n` +
      `• *Empresas Activas*: ${dbRes.rows[0].count}\n` +
      `• *Servidor*: Oracle Cloud ARM 24/7\n` +
      `• *Versión*: v1.2.0`;
  }
}
