import { Router, Request, Response, NextFunction } from 'express';
import { ProyectosService } from './proyectos.service.js';
import { crearProyectoSchema, editarProyectoSchema, crearFrenteSchema } from './proyectos.schema.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';

export const proyectosRouter = Router();

// ═══════════════════════════════════════════════════════════════════
// CRUD de Proyectos / Faenas — Aislado por Tenant (req.tenant)
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/proyectos — Listar proyectos del tenant con métricas
 */
proyectosRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const proyectos = await ProyectosService.listar(req.tenant!.id);
    return sendSuccess(res, proyectos);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/proyectos/:id — Detalle de un proyecto con frentes
 */
proyectosRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const data = await ProyectosService.obtenerDetalle(req.tenant!.id, id);
    if (!data) {
      return sendError(res, 'Proyecto no encontrado', 404);
    }
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/proyectos — Crear nuevo proyecto/faena
 */
proyectosRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = crearProyectoSchema.parse(req.body);
    const proyecto = await ProyectosService.crear(req.tenant!.id, input);
    return sendSuccess(res, proyecto, 201, { mensaje: `Proyecto '${proyecto.nombre}' creado con éxito.` });
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
 * PUT /api/v1/proyectos/:id — Editar proyecto existente
 */
proyectosRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const input = editarProyectoSchema.parse(req.body);
    const proyecto = await ProyectosService.editar(req.tenant!.id, id, input);
    if (!proyecto) {
      return sendError(res, 'Proyecto no encontrado', 404);
    }
    return sendSuccess(res, proyecto, 200, { mensaje: 'Proyecto actualizado con éxito.' });
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
 * DELETE /api/v1/proyectos/:id — Desactivar proyecto (soft delete)
 */
proyectosRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const resultado = await ProyectosService.desactivar(req.tenant!.id, id);
    if (!resultado) {
      return sendError(res, 'Proyecto no encontrado', 404);
    }
    return sendSuccess(res, {
      ...resultado,
      desactivado: true
    }, 200, { mensaje: `Proyecto '${resultado.nombre}' desactivado.` });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// Sub-recurso: Frentes de Trabajo dentro de un Proyecto
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/proyectos/:id/frentes — Listar frentes del proyecto
 */
proyectosRouter.get('/:id/frentes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const proyectoId = String(req.params.id);
    const frentes = await ProyectosService.listarFrentes(req.tenant!.id, proyectoId);
    return sendSuccess(res, frentes);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/proyectos/:id/frentes — Crear frente de trabajo
 */
proyectosRouter.post('/:id/frentes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const proyectoId = String(req.params.id);
    const input = crearFrenteSchema.parse(req.body);
    const frente = await ProyectosService.crearFrente(req.tenant!.id, proyectoId, input);
    return sendSuccess(res, frente, 201, { mensaje: `Frente '${frente.nombre}' creado.` });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return sendError(res, error.errors[0]?.message || 'Datos inválidos', 400);
    }
    if (error.message?.includes('no encontrado')) {
      return sendError(res, error.message, 404);
    }
    if (error.code === '23505') {
      return sendError(res, 'Ya existe un frente con ese código en este proyecto.', 409);
    }
    next(error);
  }
});

/**
 * DELETE /api/v1/proyectos/:proyectoId/frentes/:frenteId — Desactivar frente
 */
proyectosRouter.delete('/:proyectoId/frentes/:frenteId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const frenteId = String(req.params.frenteId);
    const resultado = await ProyectosService.desactivarFrente(req.tenant!.id, frenteId);
    if (!resultado) {
      return sendError(res, 'Frente de trabajo no encontrado', 404);
    }
    return sendSuccess(res, {
      ...resultado,
      desactivado: true
    }, 200, { mensaje: `Frente '${resultado.nombre}' desactivado.` });
  } catch (error) {
    next(error);
  }
});
