import { Router, Request, Response, NextFunction } from 'express';
import { RolesService } from './roles.service.js';
import { crearRolSchema, editarRolSchema, asignarRolSchema } from './roles.schema.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';

export const rolesRouter = Router();

// ═══════════════════════════════════════════════════════════════════
// CRUD de Roles Funcionales — Por Proyecto o Plantilla de Tenant
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/roles — Listar roles (opcionalmente filtrados por ?proyecto=<id>)
 */
rolesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const proyectoId = req.query.proyecto ? String(req.query.proyecto) : undefined;
    const roles = await RolesService.listar(req.tenant!.id, proyectoId);
    return sendSuccess(res, roles);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/roles/:id — Detalle del rol con personal asignado
 */
rolesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const proyectoId = req.query.proyecto ? String(req.query.proyecto) : undefined;
    const rol = await RolesService.obtenerDetalle(req.tenant!.id, id, proyectoId);
    if (!rol) {
      return sendError(res, 'Rol no encontrado', 404);
    }
    return sendSuccess(res, rol);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/roles — Crear nuevo rol funcional (para un proyecto o plantilla)
 */
rolesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = crearRolSchema.parse(req.body);
    const rol = await RolesService.crear(req.tenant!.id, input);
    return sendSuccess(res, rol, 201, {
      mensaje: `Rol '${rol.nombre}' creado con éxito.`
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return sendError(res, error.errors[0]?.message || 'Datos inválidos', 400);
    }
    if (error.message?.includes('Ya existe')) {
      return sendError(res, error.message, 409);
    }
    next(error);
  }
});

/**
 * PUT /api/v1/roles/:id — Editar rol (nombre coloquial, color, permisos CRUD, nivel)
 */
rolesRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const proyectoId = req.query.proyecto ? String(req.query.proyecto) : undefined;
    const input = editarRolSchema.parse(req.body);
    const rol = await RolesService.editar(req.tenant!.id, id, input, proyectoId);
    if (!rol) {
      return sendError(res, 'Rol no encontrado', 404);
    }
    return sendSuccess(res, rol, 200, { mensaje: 'Rol actualizado con éxito.' });
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
 * DELETE /api/v1/roles/:id — Desactivar rol y desvincular personal
 */
rolesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const proyectoId = req.query.proyecto ? String(req.query.proyecto) : undefined;
    const resultado = await RolesService.desactivar(req.tenant!.id, id, proyectoId);
    if (!resultado) {
      return sendError(res, 'Rol no encontrado', 404);
    }
    return sendSuccess(res, {
      ...resultado,
      desactivado: true
    }, 200, { mensaje: `Rol '${resultado.nombre}' desactivado. El personal fue desvinculado.` });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/roles/asignar — Asignar o quitar rol a un miembro del personal
 */
rolesRouter.post('/asignar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = asignarRolSchema.parse(req.body);
    const resultado = await RolesService.asignarRol(
      req.tenant!.id,
      input.personal_id,
      input.rol_id
    );
    const msg = input.rol_id
      ? `Rol asignado a ${resultado.nombre_completo}.`
      : `Rol removido de ${resultado.nombre_completo}.`;
    return sendSuccess(res, resultado, 200, { mensaje: msg });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return sendError(res, error.errors[0]?.message || 'Datos inválidos', 400);
    }
    if (error.message?.includes('no encontrado') || error.message?.includes('no encontrada')) {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
});
