import { dbPool } from '../../config/database.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { normalizarRut, validarRut } from '../../shared/utils/rut.js';
import { normalizarTelefonoChileno } from '../../shared/utils/phone.js';
import { WhatsAppService } from '../../shared/utils/whatsapp.js';
import { OnboardTenantInput } from './tenants.schema.js';

export interface OnboardingResult {
  tenant: any;
  proyecto?: any;
  administrador: any;
  sesion_whatsapp?: any;
}

export class TenantsService {
  /**
   * Proceso Atómico de Onboarding para dar de alta a una nueva Empresa / Tenant
   */
  static async onboardTenant(input: OnboardTenantInput): Promise<OnboardingResult> {
    const rutTenant = normalizarRut(input.rut);
    if (!validarRut(rutTenant)) {
      throw new Error(`RUT de empresa inválido: ${input.rut}`);
    }

    const rutAdmin = normalizarRut(input.administrador_inicial.rut);
    if (!validarRut(rutAdmin)) {
      throw new Error(`RUT de administrador inválido: ${input.administrador_inicial.rut}`);
    }

    const telWhatsApp = normalizarTelefonoChileno(input.administrador_inicial.telefono_whatsapp);
    if (!telWhatsApp) {
      throw new Error(`Teléfono WhatsApp de administrador inválido: ${input.administrador_inicial.telefono_whatsapp}`);
    }

    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      // 1. Verificar unicidad de slug y RUT de empresa
      const slugCheck = await client.query(
        'SELECT id FROM core.tenants WHERE slug = $1 OR tax_id = $2',
        [input.slug.toLowerCase(), rutTenant]
      );
      if (slugCheck.rows.length > 0) {
        throw new Error(`Ya existe una empresa registrada con el slug '${input.slug}' o RUT '${rutTenant}'`);
      }

      // 2. Insertar Tenant Maestro
      const tenantRes = await client.query(
        `
        INSERT INTO core.tenants (slug, business_name, tax_id, config, is_active)
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING *;
        `,
        [input.slug.toLowerCase(), input.razon_social, rutTenant, JSON.stringify(input.config)]
      );
      const tenant = tenantRes.rows[0];

      // 3. Crear Proyecto Inicial (Entorno de Entrenamiento / Sandbox)
      let proyecto = null;
      const projInput = input.proyecto_inicial || {
        codigo: 'BASE-01',
        nombre: 'Proyecto Base (Entrenamiento / Sandbox)',
        ubicacion: 'Entorno de Pruebas y Aprendizaje'
      };
      const projMeta = { es_entrenamiento: true, nota: 'Entorno controlado para pruebas' };

      const projRes = await client.query(
        `INSERT INTO core.projects (tenant_id, code, name, cost_center, location, status, metadata)
         VALUES ($1, $2, $3, $4, $5, 'en_ejecucion', $6::jsonb) RETURNING *;`,
        [tenant.id, projInput.codigo, projInput.nombre, projInput.centro_costo || null, projInput.ubicacion || null, JSON.stringify(projMeta)]
      );
      proyecto = projRes.rows[0];

      // 3.1 Crear Frente de Trabajo Base
      await client.query(
        `
        INSERT INTO core.work_fronts (tenant_id, project_id, code, name, discipline)
        VALUES ($1, $2, 'FR-00', 'Frente General', 'GENERAL')
        ON CONFLICT (project_id, code) DO NOTHING;
        `,
        [tenant.id, proyecto.id]
      );

      // 4. Clonar Matriz de Roles Estándar según Industria (industrial o transporte)
      const tipoIndustria = input.config?.tipo_industria || 'industrial';
      await client.query('SELECT core.clonar_roles_estandar($1, $2)', [tenant.id, tipoIndustria]);

      // 4.1 Clonar roles al proyecto inicial
      await client.query('SELECT core.clonar_roles_a_proyecto($1, $2)', [tenant.id, proyecto.id]);

      // 4.2 Obtener el ID del Rol ADMIN_GENERAL del proyecto (o plantilla)
      const rolAdminRes = await client.query(
        'SELECT id FROM core.roles_empresa WHERE tenant_id = $1 AND codigo = $2 AND (proyecto_id = $3 OR proyecto_id IS NULL) ORDER BY proyecto_id NULLS LAST LIMIT 1',
        [tenant.id, 'ADMIN_GENERAL', proyecto.id]
      );
      const rolAdminId = rolAdminRes.rows[0]?.id || null;

      // 5. Crear Administrador Inicial en core.personnel vinculado al rol funcional
      const adminRes = await client.query(
        `
        INSERT INTO core.personnel (
          tenant_id, project_id, rol_funcional_id, national_id, full_name, job_title, org_role, phone_number, email, shift, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'admin', $7, $8, '5x2', TRUE)
        RETURNING *;
        `,
        [
          tenant.id,
          proyecto.id,
          rolAdminId,
          rutAdmin,
          input.administrador_inicial.nombre_completo,
          input.administrador_inicial.cargo,
          telWhatsApp,
          input.administrador_inicial.email.toLowerCase()
        ]
      );
      const administrador = adminRes.rows[0];
      const emailAdmin = input.administrador_inicial.email.toLowerCase();

      // 5.1 Enviar Invitación por Correo Oficial vía Supabase Auth & Resend
      try {
        const { data: authData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(emailAdmin, {
          redirectTo: `https://app.lukeapp.cl/admin/crear-clave.html?email=${encodeURIComponent(emailAdmin)}`,
          data: {
            nombre: input.administrador_inicial.nombre_completo,
            role: 'admin',
            tenant_slug: tenant.slug
          }
        });

        if (authData?.user) {
          await client.query('UPDATE core.personnel SET auth_user_id = $1 WHERE id = $2', [
            authData.user.id,
            administrador.id
          ]);
          console.log(`📧 [EMAIL] Correo de invitación enviado con éxito a ${emailAdmin} desde noreply@lukeapp.cl`);
        } else if (inviteErr) {
          console.warn(`⚠️ Aviso al invitar usuario por email (${emailAdmin}):`, inviteErr.message);

          // Si el usuario ya existe en Supabase Auth, enlazar su auth_user_id y enviar correo de clave
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = listData?.users?.find(u => u.email?.toLowerCase() === emailAdmin);

          if (existingUser) {
            await client.query('UPDATE core.personnel SET auth_user_id = $1 WHERE id = $2', [
              existingUser.id,
              administrador.id
            ]);

            await supabaseAdmin.auth.resetPasswordForEmail(emailAdmin, {
              redirectTo: `https://app.lukeapp.cl/admin/crear-clave.html?email=${encodeURIComponent(emailAdmin)}`
            });
            console.log(`📧 [EMAIL] Correo de restablecimiento/creación de clave enviado a usuario existente: ${emailAdmin}`);
          }
        }
      } catch (authErr: any) {
        console.warn('⚠️ Supabase Auth invite aviso:', authErr.message);
      }

      // 6. Inicializar Sesión Conversacional de WhatsApp para el Admin
      const sesionRes = await client.query(
        `
        INSERT INTO core.sesiones_canal (
          tenant_id, canal, identificador_remoto, personal_id, proyecto_id, estado_conversacion, ultimo_mensaje_at
        )
        VALUES ($1, 'whatsapp', $2, $3, $4, 'onboarded', NOW())
        RETURNING *;
        `,
        [tenant.id, telWhatsApp, administrador.id, proyecto.id]
      );
      const sesion_whatsapp = sesionRes.rows[0];

      // 7. Notificar al Administrador Fundador vía WhatsApp con enlace de activación
      try {
        const nombreAdmin = administrador.full_name || input.administrador_inicial.nombre_completo;
        const msgWa = 
          `🎉 *¡Bienvenido a LukeAPPs!*\n\n` +
          `Hola *${nombreAdmin}*,\n` +
          `Tu empresa *${tenant.business_name}* ha sido dada de alta exitosamente en la plataforma.\n\n` +
          `🔐 *Activa tu usuario fundador y crea tu contraseña aquí:*\n` +
          `👉 https://app.lukeapp.cl/admin/crear-clave.html\n\n` +
          `_Correo: ${emailAdmin}_\n` +
          `_Faena: ${proyecto.name}_`;

        await WhatsAppService.enviarMensaje({ to: telWhatsApp, text: msgWa });
      } catch (waErr: any) {
        console.warn('⚠️ No se pudo enviar WhatsApp de bienvenida al fundador:', waErr.message);
      }

      // 8. Registrar en Audit Logs
      await client.query(
        `
        INSERT INTO core.audit_logs (tenant_id, tabla, registro_id, accion, payload_nuevo, ejecutado_por)
        VALUES ($1, 'core.tenants', $2, 'ONBOARDING', $3, 'sistema')
        `,
        [tenant.id, tenant.id, JSON.stringify({ slug: tenant.slug, admin: administrador.email })]
      );

      await client.query('COMMIT');

      return {
        tenant,
        proyecto,
        administrador,
        sesion_whatsapp
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Listar todos los tenants con resumen métrico (filtrado por tenantId si no es super_admin)
   */
  static async listarTenants(tenantId?: string | null) {
    let sql = `
      SELECT 
        t.*,
        COUNT(DISTINCT p.id) AS total_proyectos,
        COUNT(DISTINCT per.id) AS total_personal,
        COUNT(DISTINCT eq.id) AS total_equipos
      FROM core.tenants t
      LEFT JOIN core.projects p ON p.tenant_id = t.id AND p.is_active = TRUE
      LEFT JOIN core.personnel per ON per.tenant_id = t.id AND per.is_active = TRUE
      LEFT JOIN core.equipment eq ON eq.tenant_id = t.id AND eq.is_active = TRUE
      WHERE t.is_active = TRUE
    `;
    const params: any[] = [];
    if (tenantId) {
      params.push(tenantId);
      sql += ` AND t.id = $1`;
    }
    sql += ` GROUP BY t.id ORDER BY t.business_name ASC;`;

    const res = await dbPool.query(sql, params);
    return res.rows;
  }
}
