import { Router, Request, Response, NextFunction } from 'express';
import { TenantsController } from './tenants.controller.js';
import { query } from '../../config/database.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';
import { normalizarRut, validarRut } from '../../shared/utils/rut.js';

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
      WHERE (id::text = $1 OR slug = $1)
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

// 4. Actualizar datos completos de una empresa (Razón Social, RUT, Slug, Activo, Configuración)
tenantsRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { razon_social, rut, slug, config, activo } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (razon_social) {
      params.push(razon_social.trim());
      updates.push(`razon_social = $${params.length}`);
    }

    if (rut) {
      const rutLimpio = normalizarRut(rut);
      if (!validarRut(rutLimpio)) {
        return sendError(res, 'RUT inválido', 400);
      }
      params.push(rutLimpio);
      updates.push(`rut = $${params.length}`);
    }

    if (slug) {
      params.push(slug.trim().toLowerCase());
      updates.push(`slug = $${params.length}`);
    }

    if (config) {
      params.push(JSON.stringify(config));
      updates.push(`config = $${params.length}`);
    }

    if (typeof activo === 'boolean') {
      params.push(activo);
      updates.push(`activo = $${params.length}`);
    }

    if (updates.length === 0) {
      return sendError(res, 'No se enviaron campos para actualizar', 400);
    }

    params.push(id);
    const sql = `
      UPDATE core.tenants
      SET ${updates.join(', ')}
      WHERE id = $${params.length}
      RETURNING *;
    `;

    const result = await query(sql, params);
    if (result.rows.length === 0) {
      return sendError(res, 'Empresa no encontrada', 404);
    }

    return sendSuccess(res, result.rows[0], 200, { mensaje: 'Empresa actualizada con éxito' });
  } catch (error) {
    next(error);
  }
});

// 5. Actualizar configuración o branding de un tenant
tenantsRouter.patch('/:id/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const nuevaConfig = req.body;

    const result = await query(`
      UPDATE core.tenants
      SET config = config || $1::jsonb
      WHERE id = $2
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
