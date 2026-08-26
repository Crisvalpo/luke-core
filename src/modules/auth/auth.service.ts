import { query } from '../../config/database.js';
import { env } from '../../config/env.js';
import { normalizarRut } from '../../shared/utils/rut.js';
import { LoginInput } from './auth.schema.js';
import crypto from 'crypto';

export interface UserSession {
  id: string;
  nombre_completo: string;
  email: string;
  rol: 'super_admin' | 'admin' | 'supervisor' | 'worker';
  tenant_id: string | null;
  tenant_slug?: string;
  tenant_razon_social?: string;
  token: string;
}

export class AuthService {
  /**
   * Genera un token HMAC firmado para la sesión
   */
  static generarToken(payload: any): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const data = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
    const signature = crypto
      .createHmac('sha256', env.CORE_ADMIN_API_KEY)
      .update(`${header}.${data}`)
      .digest('base64url');
    return `${header}.${data}.${signature}`;
  }

  /**
   * Valida un token HMAC firmado
   */
  static validarToken(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, data, signature] = parts;

      const expectedSignature = crypto
        .createHmac('sha256', env.CORE_ADMIN_API_KEY)
        .update(`${header}.${data}`)
        .digest('base64url');

      if (signature !== expectedSignature) return null;

      const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
      if (payload.exp && Date.now() > payload.exp) return null; // Expirado

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Autenticación unificada: Soporta Super-Admin de plataforma y Administradores de Tenant
   */
  static async login(input: LoginInput): Promise<UserSession> {
    const ident = input.identificador.trim().toLowerCase();
    const rutLimpio = normalizarRut(ident);

    // 1. Acceso Super-Admin Maestro (Plataforma Luke Core)
    const esSuperAdmin = 
      (ident === 'admin' || ident === 'admin@lukeapp.cl' || ident === 'cluke@eimontajes.cl') &&
      (input.password === env.CORE_ADMIN_API_KEY || input.password === 'admin123' || input.password === 'LukeAdmin2026!');

    if (esSuperAdmin) {
      const payload = {
        id: '00000000-0000-0000-0000-000000000000',
        nombre_completo: 'Cristian Cabello (Super-Admin)',
        email: 'cluke@eimontajes.cl',
        rol: 'super_admin' as const,
        tenant_id: null
      };

      return {
        ...payload,
        token: this.generarToken(payload)
      };
    }

    // 2. Acceso por Base de Datos (Personal con rol 'admin' de un Tenant)
    const personalRes = await query(`
      SELECT 
        p.id, p.nombre_completo, p.email, p.rut, p.rol_organizacional,
        t.id AS tenant_id, t.slug AS tenant_slug, t.razon_social AS tenant_razon_social
      FROM core.personal p
      JOIN core.tenants t ON t.id = p.tenant_id
      WHERE (LOWER(p.email) = $1 OR p.rut = $2)
        AND p.activo = TRUE 
        AND t.activo = TRUE
      LIMIT 1;
    `, [ident, rutLimpio]);

    if (personalRes.rows.length === 0) {
      throw new Error('Credenciales inválidas o usuario no registrado');
    }

    const user = personalRes.rows[0];

    // Validación de clave para usuarios de tenant (por defecto o API key)
    if (input.password !== env.CORE_ADMIN_API_KEY && input.password !== 'Luke2026!') {
      throw new Error('Contraseña incorrecta');
    }

    const payload = {
      id: user.id,
      nombre_completo: user.nombre_completo,
      email: user.email,
      rol: user.rol_organizacional,
      tenant_id: user.tenant_id,
      tenant_slug: user.tenant_slug,
      tenant_razon_social: user.tenant_razon_social
    };

    return {
      ...payload,
      token: this.generarToken(payload)
    };
  }
}
