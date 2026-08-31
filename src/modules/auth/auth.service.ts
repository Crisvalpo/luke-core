import jwt from 'jsonwebtoken';
import { supabase, supabaseAdmin } from '../../config/supabase.js';
import { query } from '../../config/database.js';
import { env } from '../../config/env.js';
import { LoginInput } from './auth.schema.js';

export interface UserSession {
  id: string;
  nombre_completo: string;
  email: string;
  rol: 'super_admin' | 'admin' | 'supervisor' | 'worker';
  tenant_id: string | null;
  tenant_slug?: string;
  tenant_razon_social?: string;
  access_token: string;
}

export class AuthService {
  /**
   * Valida un token JWT (local de Super-Admin o emitido por Supabase GoTrue)
   */
  static async validarToken(token: string): Promise<any | null> {
    try {
      // 1. Verificar si es un token local de Super-Admin
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as any;
        if (decoded && decoded.rol === 'super_admin') {
          return decoded;
        }
      } catch {}

      // 2. Validar directamente contra Supabase Auth en Oracle Cloud
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) {
        return null;
      }

      // Buscar el perfil de personal y tenant en PostgreSQL (core.personal)
      const personalRes = await query(`
        SELECT 
          p.id, p.nombre_completo, p.email, p.rol_organizacional,
          t.id AS tenant_id, t.slug AS tenant_slug, t.razon_social AS tenant_razon_social
        FROM core.personal p
        LEFT JOIN core.tenants t ON t.id = p.tenant_id
        WHERE p.auth_user_id = $1 OR LOWER(p.email) = $2
        LIMIT 1;
      `, [data.user.id, data.user.email?.toLowerCase()]);

      if (personalRes.rows.length > 0) {
        const user = personalRes.rows[0];
        return {
          id: user.id,
          auth_user_id: data.user.id,
          nombre_completo: user.nombre_completo,
          email: data.user.email,
          rol: user.rol_organizacional || 'admin',
          tenant_id: user.tenant_id,
          tenant_slug: user.tenant_slug
        };
      }

      // Super-Admin registrado en auth.users sin ficha en tenant específico
      return {
        id: data.user.id,
        auth_user_id: data.user.id,
        nombre_completo: data.user.user_metadata?.nombre || data.user.email,
        email: data.user.email,
        rol: data.user.user_metadata?.role || 'super_admin',
        tenant_id: null
      };
    } catch {
      return null;
    }
  }

  /**
   * Iniciar Sesión 100% Real contra Supabase Auth (auth.users en Oracle Cloud)
   */
  static async login(input: LoginInput): Promise<UserSession> {
    const identificador = input.identificador.trim().toLowerCase();

    // 1. Acceso Maestro de Super-Administrador (vía API Key o Master Password)
    if (input.password === env.CORE_ADMIN_API_KEY || (identificador === 'admin' && input.password === env.CORE_ADMIN_API_KEY)) {
      const superAdminPayload = {
        id: '00000000-0000-0000-0000-000000000000',
        nombre_completo: 'Super Administrador',
        email: identificador.includes('@') ? identificador : 'admin@lukeapp.cl',
        rol: 'super_admin',
        tenant_id: null
      };

      const token = jwt.sign(superAdminPayload, env.JWT_SECRET, { expiresIn: '7d' });

      return {
        id: superAdminPayload.id,
        nombre_completo: superAdminPayload.nombre_completo,
        email: superAdminPayload.email,
        rol: 'super_admin',
        tenant_id: null,
        access_token: token
      };
    }

    // 2. Autenticación estándar con Supabase GoTrue en Oracle Cloud
    const email = identificador;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: input.password
    });

    if (error || !data.session || !data.user) {
      throw new Error(error?.message || 'Credenciales inválidas en Supabase Auth');
    }

    // 2. Resolver ficha y contexto del usuario en core.personal
    const personalRes = await query(`
      SELECT 
        p.id, p.nombre_completo, p.email, p.rol_organizacional, p.activo, p.auth_user_id,
        t.id AS tenant_id, t.slug AS tenant_slug, t.razon_social AS tenant_razon_social, t.activo AS tenant_activo
      FROM core.personal p
      LEFT JOIN core.tenants t ON t.id = p.tenant_id
      WHERE (p.auth_user_id = $1 OR LOWER(p.email) = $2)
        AND p.activo = TRUE
      ORDER BY (p.rol_organizacional = 'super_admin') DESC, p.created_at DESC
      LIMIT 1;
    `, [data.user.id, email]);

    const perfil = personalRes.rows[0];
    const isSuperAdminUser = perfil?.rol_organizacional === 'super_admin' || data.user.app_metadata?.role === 'super_admin';

    // Separación de Apps: Si el usuario existe en Supabase Auth (e.g. Quiz o Ruleta) pero no en Luke Core
    if (!perfil && !isSuperAdminUser) {
      throw new Error('Acceso denegado: Su cuenta no tiene una empresa o perfil activo en Luke Core. Solicite acceso a su Administrador.');
    }

    if (perfil && perfil.tenant_activo === false && !isSuperAdminUser) {
      throw new Error(`Acceso suspendido: La empresa '${perfil.tenant_razon_social || perfil.tenant_slug}' se encuentra inactiva.`);
    }

    // Vincular auth_user_id si aún no estaba asignado
    if (perfil && !perfil.auth_user_id) {
      await query(`UPDATE core.personal SET auth_user_id = $1 WHERE id = $2`, [data.user.id, perfil.id]);
    }

    // Sincronizar App Metadata en Supabase Auth
    try {
      await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
        app_metadata: {
          ...data.user.app_metadata,
          apps_habilitadas: Array.from(new Set([...(data.user.app_metadata?.apps_habilitadas || []), 'core', 'piping'])),
          tenant_id: perfil?.tenant_id || null,
          tenant_slug: perfil?.tenant_slug || null,
          rol: perfil?.rol_organizacional || 'super_admin'
        }
      });
    } catch (metaErr: any) {
      console.warn('⚠️ No se pudo sincronizar app_metadata:', metaErr.message);
    }

    return {
      id: perfil?.id || data.user.id,
      nombre_completo: perfil?.nombre_completo || data.user.user_metadata?.nombre || email,
      email: data.user.email!,
      rol: perfil?.rol_organizacional || data.user.user_metadata?.role || (isSuperAdminUser ? 'super_admin' : 'worker'),
      tenant_id: perfil?.tenant_id || null,
      tenant_slug: perfil?.tenant_slug,
      tenant_razon_social: perfil?.tenant_razon_social,
      access_token: data.session.access_token
    };
  }

  /**
   * Permite activar o actualizar contraseña directamente mediante el motor de Supabase
   */
  static async establecerClaveDirecta(email: string, password: string): Promise<UserSession> {
    const emailNorm = email.trim().toLowerCase();

    // 1. Buscar usuario en core.personal
    const personalRes = await query(`
      SELECT p.id, p.auth_user_id, p.nombre_completo, p.rol_organizacional, t.id AS tenant_id, t.slug AS tenant_slug, t.razon_social AS tenant_razon_social
      FROM core.personal p
      LEFT JOIN core.tenants t ON t.id = p.tenant_id
      WHERE LOWER(p.email) = $1
      LIMIT 1;
    `, [emailNorm]);

    let authUserId = personalRes.rows[0]?.auth_user_id;

    if (!authUserId) {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = usersData?.users?.find(u => u.email?.toLowerCase() === emailNorm);
      if (authUser) {
        authUserId = authUser.id;
      }
    }

    if (!authUserId) {
      const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: emailNorm,
        password,
        email_confirm: true
      });
      if (createErr) throw new Error(createErr.message);
      authUserId = createData.user.id;
    } else {
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password,
        email_confirm: true
      });
      if (updateErr) throw new Error(updateErr.message);
    }

    if (personalRes.rows[0]?.id && !personalRes.rows[0]?.auth_user_id) {
      await query(`UPDATE core.personal SET auth_user_id = $1 WHERE id = $2`, [authUserId, personalRes.rows[0].id]);
    }

    return this.login({ identificador: emailNorm, password });
  }

  /**
   * Genera y envía un OTP de 6 dígitos por WhatsApp al usuario de Excel / Windows
   * Aplica Rate Limiting: Máximo 3 solicitudes cada 10 minutos
   * Consulta directamente la tabla de Personal del Tenant (core.personal)
   */
  static async solicitarOtpExcel(usuarioWindows: string, ipOrigen?: string) {
    const usuarioNorm = usuarioWindows.trim();
    const soloUsername = usuarioNorm.includes('\\') ? usuarioNorm.split('\\')[1] : usuarioNorm;

    // 1. Buscar usuario autorizado en core.personal
    const userRes = await query(`
      SELECT p.id, p.tenant_id, p.nombre_completo, p.telefono_whatsapp, p.usuario_windows, p.activo, p.puede_sincronizar_excel
      FROM core.personal p
      WHERE (
        UPPER(p.usuario_windows) = UPPER($1) 
        OR UPPER(p.usuario_windows) = UPPER($2)
        OR UPPER(SPLIT_PART(p.usuario_windows, '\\', 2)) = UPPER($2)
      ) 
      AND p.activo = TRUE 
      AND (p.puede_sincronizar_excel IS TRUE OR p.puede_sincronizar_excel IS NULL)
      LIMIT 1;
    `, [usuarioNorm, soloUsername]);

    if (userRes.rows.length === 0) {
      throw new Error(`El usuario de Windows '${usuarioNorm}' no está registrado o habilitado como personal de la empresa.`);
    }

    const usuario = userRes.rows[0];

    if (!usuario.telefono_whatsapp) {
      throw new Error(`El usuario '${usuario.nombre_completo}' no tiene un teléfono de WhatsApp registrado en su ficha de personal.`);
    }

    // 2. Control de Rate Limit: Máximo 3 solicitudes por 10 minutos
    const rateRes = await query(`
      SELECT COUNT(*) AS total
      FROM core.auth_otps
      WHERE usuario_id = $1 
        AND created_at > NOW() - INTERVAL '10 minutes';
    `, [usuario.id]);

    const totalEnVentana = parseInt(rateRes.rows[0]?.total || '0', 10);
    if (totalEnVentana >= 3) {
      throw new Error('Límite de solicitudes excedido: Máximo 3 códigos PIN cada 10 minutos. Por favor espere antes de reintentar.');
    }

    // 3. Generar PIN de 6 dígitos numéricos
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Guardar OTP con 5 minutos de vigencia
    await query(`
      INSERT INTO core.auth_otps (usuario_id, otp_hash, expires_at, used, ip_origen)
      VALUES ($1, $2, NOW() + INTERVAL '5 minutes', FALSE, $3)
    `, [usuario.id, otp, ipOrigen || null]);

    // 5. Enviar WhatsApp vía microservicio Baileys
    const { WhatsAppService } = await import('../../shared/utils/whatsapp.js');
    await WhatsAppService.enviarOtpExcel(usuario.telefono_whatsapp, usuario.nombre_completo, otp);

    const tel = usuario.telefono_whatsapp;
    const telefonoMask = tel.length > 4 
      ? `+${tel.slice(0, 3)}*****${tel.slice(-4)}` 
      : 'su WhatsApp registrado';

    return {
      enviado: true,
      mensaje: `Código de verificación enviado a ${telefonoMask}. Válido por 5 minutos.`,
      usuario_windows: usuario.usuario_windows || usuarioNorm,
      nombre: usuario.nombre_completo,
      expira_en_minutos: 5
    };
  }

  /**
   * Verifica el OTP ingresado en Excel y emite un JWT firmado de 4 horas (scope: excel_sync)
   */
  static async verificarOtpExcel(usuarioWindows: string, otp: string) {
    const usuarioNorm = usuarioWindows.trim();
    const soloUsername = usuarioNorm.includes('\\') ? usuarioNorm.split('\\')[1] : usuarioNorm;
    const otpNorm = otp.trim();

    // 1. Buscar usuario en core.personal
    const userRes = await query(`
      SELECT p.id, p.tenant_id, p.nombre_completo, p.telefono_whatsapp, p.usuario_windows
      FROM core.personal p
      WHERE (
        UPPER(p.usuario_windows) = UPPER($1) 
        OR UPPER(p.usuario_windows) = UPPER($2)
        OR UPPER(SPLIT_PART(p.usuario_windows, '\\', 2)) = UPPER($2)
      ) 
      AND p.activo = TRUE 
      LIMIT 1;
    `, [usuarioNorm, soloUsername]);

    if (userRes.rows.length === 0) {
      throw new Error(`Usuario '${usuarioNorm}' no autorizado.`);
    }

    const usuario = userRes.rows[0];

    // 2. Validar OTP vigente y no usado
    const otpRes = await query(`
      SELECT id FROM core.auth_otps 
      WHERE usuario_id = $1 
        AND otp_hash = $2 
        AND used = FALSE 
        AND expires_at > NOW()
      ORDER BY created_at DESC 
      LIMIT 1;
    `, [usuario.id, otpNorm]);

    if (otpRes.rows.length === 0) {
      throw new Error('Código PIN incorrecto o expirado. Solicite un nuevo código en Excel.');
    }

    // 3. Consumir inmediatamente el OTP (un solo uso garantizado)
    await query('UPDATE core.auth_otps SET used = TRUE WHERE id = $1', [otpRes.rows[0].id]);

    // 4. Generar Token JWT firmado con vigencia de 4 horas vinculando tenant_id y personal_id
    const payload = {
      sub: usuario.usuario_windows || usuarioNorm,
      personal_id: usuario.id,
      tenant_id: usuario.tenant_id,
      scope: 'excel_sync',
      nombre: usuario.nombre_completo,
      telefono: usuario.telefono_whatsapp
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '4h' });

    return {
      token,
      usuario_windows: usuario.usuario_windows || usuarioNorm,
      nombre: usuario.nombre_completo,
      tenant_id: usuario.tenant_id,
      expira_en: '4h'
    };
  }
}
