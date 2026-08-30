import { Router, Request, Response, NextFunction } from 'express';
import { TenantsController } from './tenants.controller.js';
import { query } from '../../config/database.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';
import { normalizarRut, validarRut } from '../../shared/utils/rut.js';
import { requireSuperAdmin } from '../../shared/middlewares/authGuard.js';

export const tenantsRouter = Router();

// 1. Onboarding de Nuevo Tenant (Exclusivo Super-Admin)
tenantsRouter.post('/onboarding', requireSuperAdmin, TenantsController.onboard);

// 2. Listar tenants (Super-Admin lista todos; Admin de empresa lista su propio tenant)
tenantsRouter.get('/', TenantsController.listar);

// 3. Obtener detalle de un tenant por slug o UUID
tenantsRouter.get('/:idOrSlug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idOrSlug } = req.params;
    const user = req.user;

    const result = await query(`
      SELECT * FROM core.tenants 
      WHERE (id::text = $1 OR slug = $1)
      LIMIT 1;
    `, [String(idOrSlug).toLowerCase()]);

    if (result.rows.length === 0) {
      return sendError(res, 'Tenant no encontrado', 404);
    }

    const tenant = result.rows[0];
    if (user && user.rol !== 'super_admin' && user.tenant_id && user.tenant_id !== tenant.id) {
      return sendError(res, 'Permiso denegado: No tiene acceso a este tenant', 403);
    }

    return sendSuccess(res, tenant);
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

// 6. Eliminar empresa y todo su contenido en Cascada (Exclusivo Super-Admin)
tenantsRouter.delete('/:id', requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // 1. Obtener datos antes de borrar
    const tenantRes = await query('SELECT * FROM core.tenants WHERE id = $1', [id]);
    if (tenantRes.rows.length === 0) {
      return sendError(res, 'Empresa no encontrada', 404);
    }
    const tenant = tenantRes.rows[0];

    // 2. Obtener auth_user_id del personal para limpiar en Supabase Auth
    const personalRes = await query(
      'SELECT auth_user_id FROM core.personal WHERE tenant_id = $1 AND auth_user_id IS NOT NULL',
      [id]
    );

    // 3. Borrado en Cascada en PostgreSQL
    await query('DELETE FROM core.tenants WHERE id = $1', [id]);

    // 4. Limpiar usuarios en Supabase Auth y archivo de logo en Supabase Storage
    const { supabaseAdmin } = await import('../../config/supabase.js');

    // 4.1 Borrar archivo físico del logotipo del bucket core-logos si existe
    const logoUrl = tenant.config?.logo_url;
    if (logoUrl && logoUrl.includes('/core-logos/')) {
      const filePath = logoUrl.split('/core-logos/')[1];
      if (filePath) {
        try {
          await supabaseAdmin.storage.from('core-logos').remove([filePath]);
          console.log(`🗑️ [STORAGE] Logotipo '${filePath}' eliminado de Supabase Storage.`);
        } catch (storageErr) {
          console.warn('⚠️ Error al eliminar logo en Storage:', storageErr);
        }
      }
    }

    // 4.2 Borrar usuarios vinculados en Supabase Auth
    for (const row of personalRes.rows) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(row.auth_user_id);
      } catch (authErr) {
        console.warn('⚠️ Aviso al borrar usuario en auth:', authErr);
      }
    }

    return sendSuccess(res, {
      id: tenant.id,
      slug: tenant.slug,
      razon_social: tenant.razon_social,
      eliminado: true
    }, 200, { mensaje: `Empresa '${tenant.razon_social}' y todos sus datos fueron eliminados permanentemente.` });

  } catch (error) {
    next(error);
  }
});
