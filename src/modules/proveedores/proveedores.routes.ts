import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';

export const proveedoresRouter = Router();

// Listar proveedores
proveedoresRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant, busqueda } = req.query;

    let sql = `
      SELECT p.*, t.slug as tenant_slug, t.razon_social as tenant_razon_social
      FROM core.proveedores p
      JOIN core.tenants t ON t.id = p.tenant_id
      WHERE p.activo = TRUE
    `;

    const params: any[] = [];
    if (tenant) {
      params.push(String(tenant).toLowerCase());
      sql += ` AND (t.slug = $${params.length} OR t.id::text = $${params.length})`;
    }
    if (busqueda) {
      params.push(`%${String(busqueda).toLowerCase()}%`);
      sql += ` AND (LOWER(p.razon_social) LIKE $${params.length} OR p.rut LIKE $${params.length} OR LOWER(COALESCE(p.giro, '')) LIKE $${params.length})`;
    }

    sql += ` ORDER BY p.razon_social ASC LIMIT 200;`;

    const result = await query(sql, params);
    return sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
});
