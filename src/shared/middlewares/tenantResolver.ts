import { Request, Response, NextFunction } from 'express';
import { query } from '../../config/database.js';
import { sendError } from '../utils/response.js';

export interface TenantContext {
  id: string;
  slug: string;
  razon_social: string;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

/**
 * Middleware para resolver y validar el tenant desde cabeceras (x-tenant-slug o x-tenant-id) o query params
 */
export async function tenantResolver(req: Request, res: Response, next: NextFunction) {
  const tenantSlug = req.headers['x-tenant-slug'] as string || req.query.tenant as string;
  const tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantSlug && !tenantId) {
    return next();
  }

  try {
    let result;
    if (tenantId) {
      result = await query('SELECT id, slug, razon_social FROM core.tenants WHERE id = $1 AND activo = TRUE', [tenantId]);
    } else {
      result = await query('SELECT id, slug, razon_social FROM core.tenants WHERE slug = $1 AND activo = TRUE', [tenantSlug.toLowerCase()]);
    }

    if (result.rows.length > 0) {
      req.tenant = result.rows[0];
    } else {
      return sendError(res, 'Tenant no encontrado o inactivo', 404);
    }
    next();
  } catch (error) {
    next(error);
  }
}
