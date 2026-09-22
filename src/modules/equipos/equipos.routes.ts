import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';
import { z } from 'zod';

export const equiposRouter = Router();

// Listar equipos / flota
equiposRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant, proyecto, categoria, busqueda } = req.query;

    let sql = `
      SELECT 
        eq.*,
        eq.internal_code AS codigo_interno,
        eq.license_plate AS patente,
        eq.description AS descripcion,
        eq.category AS categoria,
        eq.meter_type AS tipo_medicion,
        eq.last_reading AS ultimo_contador,
        eq.is_active AS activo,
        eq.project_id AS proyecto_id,
        t.slug AS tenant_slug,
        t.business_name AS tenant_razon_social,
        pr.code AS proyecto_codigo,
        pr.name AS proyecto_nombre
      FROM core.equipment eq
      JOIN core.tenants t ON t.id = eq.tenant_id
      LEFT JOIN core.projects pr ON pr.id = eq.project_id
      WHERE eq.is_active = TRUE
    `;

    const params: any[] = [];
    if (tenant) {
      params.push(String(tenant).toLowerCase());
      sql += ` AND (t.slug = $${params.length} OR t.id::text = $${params.length})`;
    }
    if (proyecto) {
      params.push(String(proyecto));
      sql += ` AND (pr.code = $${params.length} OR pr.id::text = $${params.length})`;
    }
    if (categoria) {
      params.push(String(categoria));
      sql += ` AND eq.category = $${params.length}`;
    }
    if (busqueda) {
      params.push(`%${String(busqueda).toLowerCase()}%`);
      sql += ` AND (LOWER(eq.internal_code) LIKE $${params.length} OR LOWER(COALESCE(eq.license_plate, '')) LIKE $${params.length} OR LOWER(eq.description) LIKE $${params.length})`;
    }

    sql += ` ORDER BY eq.internal_code ASC LIMIT 200;`;

    const result = await query(sql, params);
    return sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
});

const updateContadorSchema = z.object({
  nuevo_contador: z.number().positive('El contador debe ser positivo')
});

// Actualizar horómetro / odómetro de un equipo
equiposRouter.patch('/:id/contador', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { nuevo_contador } = updateContadorSchema.parse(req.body);

    const result = await query(`
      UPDATE core.equipment 
      SET last_reading = $1, updated_at = NOW()
      WHERE id = $2 AND is_active = TRUE
      RETURNING *, last_reading AS ultimo_contador, internal_code AS codigo_interno;
    `, [nuevo_contador, id]);

    if (result.rows.length === 0) {
      return sendError(res, 'Equipo no encontrado', 404);
    }

    return sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
});
