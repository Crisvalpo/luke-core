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
        t.slug AS tenant_slug,
        t.razon_social AS tenant_razon_social,
        pr.codigo AS proyecto_codigo,
        pr.nombre AS proyecto_nombre
      FROM core.equipos eq
      JOIN core.tenants t ON t.id = eq.tenant_id
      LEFT JOIN core.proyectos pr ON pr.id = eq.proyecto_id
      WHERE eq.activo = TRUE
    `;

    const params: any[] = [];
    if (tenant) {
      params.push(String(tenant).toLowerCase());
      sql += ` AND (t.slug = $${params.length} OR t.id::text = $${params.length})`;
    }
    if (proyecto) {
      params.push(String(proyecto));
      sql += ` AND (pr.codigo = $${params.length} OR pr.id::text = $${params.length})`;
    }
    if (categoria) {
      params.push(String(categoria));
      sql += ` AND eq.categoria = $${params.length}`;
    }
    if (busqueda) {
      params.push(`%${String(busqueda).toLowerCase()}%`);
      sql += ` AND (LOWER(eq.codigo_interno) LIKE $${params.length} OR LOWER(COALESCE(eq.patente, '')) LIKE $${params.length} OR LOWER(eq.descripcion) LIKE $${params.length})`;
    }

    sql += ` ORDER BY eq.codigo_interno ASC LIMIT 200;`;

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
      UPDATE core.equipos 
      SET ultimo_contador = $1
      WHERE id = $2 AND activo = TRUE
      RETURNING *;
    `, [nuevo_contador, id]);

    if (result.rows.length === 0) {
      return sendError(res, 'Equipo no encontrado', 404);
    }

    return sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
});
