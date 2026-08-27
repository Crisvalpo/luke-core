import { Router, Request, Response, NextFunction } from 'express';
import { ProveedoresService } from './proveedores.service.js';
import { crearProveedorSchema, editarProveedorSchema } from './proveedores.schema.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';

export const proveedoresRouter = Router();

// ═══════════════════════════════════════════════════════════════════
// CRUD de Proveedores / Subcontratistas — Aislado por Tenant
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/proveedores — Listar proveedores del tenant
 */
proveedoresRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const busqueda = req.query.busqueda ? String(req.query.busqueda) : undefined;
    const proveedores = await ProveedoresService.listar(req.tenant!.id, busqueda);
    return sendSuccess(res, proveedores);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/proveedores/:id — Detalle de un proveedor
 */
proveedoresRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const proveedor = await ProveedoresService.obtenerPorId(req.tenant!.id, id);
    if (!proveedor) {
      return sendError(res, 'Proveedor no encontrado', 404);
    }
    return sendSuccess(res, proveedor);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/proveedores — Crear nuevo proveedor
 */
proveedoresRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = crearProveedorSchema.parse(req.body);
    const proveedor = await ProveedoresService.crear(req.tenant!.id, input);
    return sendSuccess(res, proveedor, 201, {
      mensaje: `Proveedor '${proveedor.razon_social}' registrado con éxito.`
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return sendError(res, error.errors[0]?.message || 'Datos inválidos', 400);
    }
    if (error.message?.includes('inválido')) {
      return sendError(res, error.message, 400);
    }
    if (error.message?.includes('Ya existe')) {
      return sendError(res, error.message, 409);
    }
    next(error);
  }
});

/**
 * PUT /api/v1/proveedores/:id — Editar proveedor existente
 */
proveedoresRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const input = editarProveedorSchema.parse(req.body);
    const proveedor = await ProveedoresService.editar(req.tenant!.id, id, input);
    if (!proveedor) {
      return sendError(res, 'Proveedor no encontrado', 404);
    }
    return sendSuccess(res, proveedor, 200, { mensaje: 'Proveedor actualizado con éxito.' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return sendError(res, error.errors[0]?.message || 'Datos inválidos', 400);
    }
    if (error.message?.includes('No se enviaron')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
});

/**
 * DELETE /api/v1/proveedores/:id — Desactivar proveedor (soft delete)
 */
proveedoresRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const resultado = await ProveedoresService.desactivar(req.tenant!.id, id);
    if (!resultado) {
      return sendError(res, 'Proveedor no encontrado', 404);
    }
    return sendSuccess(res, {
      ...resultado,
      desactivado: true
    }, 200, { mensaje: `Proveedor '${resultado.razon_social}' desactivado.` });
  } catch (error) {
    next(error);
  }
});
