import { Router, Request, Response, NextFunction } from 'express';
import { TenantsController } from './tenants.controller.js';
import { query } from '../../config/database.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';

export const tenantsRouter = Router();

// 1. Onboarding de Nuevo Tenant (Empresa + Admin + Proyecto Base + Canal WA)
tenantsRouter.post('/onboarding', TenantsController.onboard);

// 2. Listar todos los tenants activos con métricas agregadas
tenantsRouter.get('/', TenantsController.listar);

// 3. Obtener detalle de un tenant por slug o UUID
tenantsRouter.get('/:idOrSlug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idOrSlug } = req.params;
    const result = await query(`
      SELECT * FROM core.tenants 
      WHERE (id::text = $1 OR slug = $1) AND activo = TRUE
      LIMIT 1;
    `, [String(idOrSlug).toLowerCase()]);

    if (result.rows.length === 0) {
      return sendError(res, 'Tenant no encontrado', 404);
    }

    return sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// 4. Actualizar configuración o branding de un tenant
tenantsRouter.patch('/:id/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const nuevaConfig = req.body;

    const result = await query(`
      UPDATE core.tenants
      SET config = config || $1::jsonb
      WHERE id = $2 AND activo = TRUE
      RETURNING *;
    `, [JSON.stringify(nuevaConfig), id]);

    if (result.rows.length === 0) {
      return sendError(res, 'Tenant no encontrado', 404);
    }

    return sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
});
