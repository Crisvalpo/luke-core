import { supabase } from '../../config/supabase.js';
import { query } from '../../config/database.js';
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
   * Valida un token JWT emitido por Supabase Auth en Oracle Cloud
   */
  static async validarToken(token: string): Promise<any | null> {
    try {
      // Validar directamente contra el endpoint Auth de Supabase en Oracle Cloud
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
    const email = input.identificador.trim().toLowerCase();

    // 1. Autenticación real con Supabase GoTrue en Oracle Cloud
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
        p.id, p.nombre_completo, p.email, p.rol_organizacional,
        t.id AS tenant_id, t.slug AS tenant_slug, t.razon_social AS tenant_razon_social
      FROM core.personal p
      LEFT JOIN core.tenants t ON t.id = p.tenant_id
      WHERE p.auth_user_id = $1 OR LOWER(p.email) = $2
      LIMIT 1;
    `, [data.user.id, email]);

    const perfil = personalRes.rows[0] || {};

    return {
      id: perfil.id || data.user.id,
      nombre_completo: perfil.nombre_completo || data.user.user_metadata?.nombre || email,
      email: data.user.email!,
      rol: perfil.rol_organizacional || data.user.user_metadata?.role || 'super_admin',
      tenant_id: perfil.tenant_id || null,
      tenant_slug: perfil.tenant_slug,
      tenant_razon_social: perfil.tenant_razon_social,
      access_token: data.session.access_token
    };
  }
}
