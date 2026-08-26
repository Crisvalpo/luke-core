import { supabase, supabaseAdmin } from '../../config/supabase.js';
import { query } from '../../config/database.js';
import { env } from '../../config/env.js';
import { LoginInput } from './auth.schema.js';
import jwt from 'jsonwebtoken';

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
   * Valida un token JWT emitido por Supabase Auth
   */
  static async validarToken(token: string): Promise<any | null> {
    try {
      // 1. Validar directamente contra el endpoint Auth de Supabase
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        // Buscar el perfil de personal y tenant en la base de datos
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

        // Si es usuario registrado en Supabase Auth pero no está en core.personal (Super-Admin)
        return {
          id: data.user.id,
          auth_user_id: data.user.id,
          nombre_completo: data.user.user_metadata?.nombre || data.user.email,
          email: data.user.email,
          rol: data.user.user_metadata?.role || 'super_admin',
          tenant_id: null
        };
      }

      // 2. Fallback de verificación criptográfica local con JWT_SECRET
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Iniciar Sesión con Supabase Auth (Email & Password)
   */
  static async login(input: LoginInput): Promise<UserSession> {
    const email = input.identificador.trim().toLowerCase();

    // 1. Intento de autenticación oficial con Supabase GoTrue
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: input.password
    });

    if (!error && data.session && data.user) {
      // Obtener ficha en core.personal
      const personalRes = await query(`
        SELECT 
          p.id, p.nombre_completo, p.email, p.rol_organizacional,
          t.id AS tenant_id, t.slug AS tenant_slug, t.razon_social AS tenant_razon_social
        FROM core.personal p
        LEFT JOIN core.tenants t ON t.id = p.tenant_id
        WHERE p.auth_user_id = $1 OR LOWER(p.email) = $2
        LIMIT 1;
      `, [data.user.id, email]);

      let perfil = personalRes.rows[0] || {};

      return {
        id: perfil.id || data.user.id,
        nombre_completo: perfil.nombre_completo || data.user.user_metadata?.nombre || email,
        email: data.user.email!,
        rol: perfil.rol_organizacional || data.user.user_metadata?.role || 'admin',
        tenant_id: perfil.tenant_id || null,
        tenant_slug: perfil.tenant_slug,
        tenant_razon_social: perfil.tenant_razon_social,
        access_token: data.session.access_token
      };
    }

    // 2. Super-Admin Master Login (Fallback de Plataforma si el usuario no está aún en auth.users)
    const esSuperAdminMaster = 
      (email === 'admin' || email === 'admin@lukeapp.cl' || email === 'cluke@eimontajes.cl') &&
      (input.password === env.CORE_ADMIN_API_KEY || input.password === 'LukeAdmin2026!');

    if (esSuperAdminMaster) {
      // Intentar auto-crear el usuario en Supabase Auth si no existe
      try {
        await supabaseAdmin.auth.admin.createUser({
          email: 'cluke@eimontajes.cl',
          password: input.password,
          email_confirm: true,
          user_metadata: { nombre: 'Cristian Cabello', role: 'super_admin' }
        });
      } catch {}

      // Generar JWT firmado compatible con Supabase
      const token = jwt.sign(
        {
          sub: '00000000-0000-0000-0000-000000000000',
          email: 'cluke@eimontajes.cl',
          role: 'super_admin',
          nombre_completo: 'Cristian Cabello (Super-Admin)',
          tenant_id: null
        },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        id: '00000000-0000-0000-0000-000000000000',
        nombre_completo: 'Cristian Cabello (Super-Admin)',
        email: 'cluke@eimontajes.cl',
        rol: 'super_admin',
        tenant_id: null,
        access_token: token
      };
    }

    throw new Error(error?.message || 'Credenciales inválidas en Supabase Auth');
  }
}
