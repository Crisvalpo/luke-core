import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';
import { normalizarRut, validarRut } from '../../shared/utils/rut.js';
import { z } from 'zod';

export const tenantsRouter = Router();

// Listar todos los tenants activos
tenantsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(`
      SELECT 
        t.id, t.slug, t.razon_social, t.rut, t.config, t.activo, t.created_at,
        COUNT(DISTINCT p.id) AS total_proyectos,
        COUNT(DISTINCT per.id) AS total_personal,
        COUNT(DISTINCT eq.id) AS total_equipos
      FROM core.tenants t
      LEFT JOIN core.proyectos p ON p.tenant_id = t.id AND p.activo = TRUE
      LEFT JOIN core.personal per ON per.tenant_id = t.id AND per.activo = TRUE
      LEFT JOIN core.equipos eq ON eq.tenant_id = t.id AND eq.activo = TRUE
      WHERE t.activo = TRUE
      GROUP BY t.id
      ORDER BY t.razon_social ASC;
    `);
    return sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
});

// Obtener detalle de un tenant por slug o ID
tenantsRouter.get('/:idOrSlug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idOrSlug } = req.params;
    const result = await query(`
      SELECT * FROM core.tenants 
      WHERE (id::text = $1 OR slug = $1) AND activo = TRUE
      LIMIT 1;
    `, [idOrSlug.toLowerCase()]);

    if (result.rows.length === 0) {
      return sendError(res, 'Tenant no encontrado', 404);
    }

    return sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
});

const createTenantSchema = z.object({
  slug: z.string().min(2).max(32).regex(/^[a-z0-9-]+$/, 'El slug debe contener solo minúsculas, números y guiones'),
  razon_social: z.string().min(3),
  rut: z.string().min(8),
  config: z.record(z.any()).optional()
});

// Crear nuevo tenant
tenantsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createTenantSchema.parse(req.body);
    const rutLimpio = normalizarRut(body.rut);

    if (!validarRut(rutLimpio)) {
      return sendError(res, 'RUT inválido', 400);
    }

    const result = await query(`
      INSERT INTO core.tenants (slug, razon_social, rut, config)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `, [body.slug, body.razon_social, rutLimpio, JSON.stringify(body.config || {})]);

    return sendSuccess(res, result.rows[0], 201);
  } catch (error) {
    next(error);
  }
});
