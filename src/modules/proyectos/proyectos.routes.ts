import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';
import { z } from 'zod';

export const proyectosRouter = Router();

// Listar proyectos (con filtro opcional por tenant)
proyectosRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.query.tenant as string;
    const tenantId = req.headers['x-tenant-id'] as string;

    let sql = `
      SELECT 
        p.*,
        t.slug AS tenant_slug,
        t.razon_social AS tenant_razon_social,
        COUNT(DISTINCT f.id) AS total_frentes,
        COUNT(DISTINCT per.id) AS total_personal,
        COUNT(DISTINCT eq.id) AS total_equipos
      FROM core.proyectos p
      JOIN core.tenants t ON t.id = p.tenant_id
      LEFT JOIN core.frentes_trabajo f ON f.proyecto_id = p.id AND f.activo = TRUE
      LEFT JOIN core.personal per ON per.proyecto_id = p.id AND per.activo = TRUE
      LEFT JOIN core.equipos eq ON eq.proyecto_id = p.id AND eq.activo = TRUE
      WHERE p.activo = TRUE
    `;

    const params: any[] = [];
    if (tenantSlug) {
      params.push(tenantSlug.toLowerCase());
      sql += ` AND t.slug = $${params.length}`;
    } else if (tenantId) {
      params.push(tenantId);
      sql += ` AND t.id = $${params.length}`;
    }

    sql += ` GROUP BY p.id, t.id ORDER BY p.nombre ASC;`;

    const result = await query(sql, params);
    return sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
});

// Obtener detalle de proyecto con sus frentes de trabajo
proyectosRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const proyectoRes = await query(`
      SELECT p.*, t.slug as tenant_slug, t.razon_social as tenant_razon_social
      FROM core.proyectos p
      JOIN core.tenants t ON t.id = p.tenant_id
      WHERE p.id = $1 AND p.activo = TRUE;
    `, [id]);

    if (proyectoRes.rows.length === 0) {
      return sendError(res, 'Proyecto no encontrado', 404);
    }

    const frentesRes = await query(`
      SELECT * FROM core.frentes_trabajo
      WHERE proyecto_id = $1 AND activo = TRUE
      ORDER BY codigo ASC;
    `, [id]);

    const data = {
      ...proyectoRes.rows[0],
      frentes: frentesRes.rows
    };

    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
});
