import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';

/**
 * Middleware que exige un tenant válido en el request.
 * Debe usarse DESPUÉS de tenantResolver.
 * Garantiza que req.tenant esté presente antes de continuar.
 */
export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.tenant || !req.tenant.id) {
    return sendError(
      res,
      'Tenant requerido: Envíe el header x-tenant-id o x-tenant-slug para identificar la empresa.',
      400
    );
  }
  next();
}
