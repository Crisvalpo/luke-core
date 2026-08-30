import { Router, Request, Response, NextFunction } from 'express';
import { PipingService } from './piping.service.js';
import { payloadSyncJuntasSchema } from './piping.schema.js';
import { requireSyncAuth } from '../../shared/middlewares/authGuard.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';

export const pipingRouter = Router();

/**
 * POST /api/v1/piping/lista-juntas — Sincronización masiva de juntas de piping desde Excel
 */
pipingRouter.post('/lista-juntas', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioWindows = req.user?.sub || 'DESCONOCIDO';
    const body = payloadSyncJuntasSchema.parse(req.body);

    const resultado = await PipingService.sincronizarJuntas(usuarioWindows, body);

    return sendSuccess(res, resultado, 200, {
      mensaje: `Sincronización exitosa: ${resultado.procesados} juntas procesadas en el proyecto ${resultado.id_proyecto}.`
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return sendError(res, error.errors[0]?.message || 'Estructura de juntas inválida', 400);
    }
    next(error);
  }
});

/**
 * GET /api/v1/piping/lista-juntas — Obtener todas las juntas vigentes de un proyecto
 */
pipingRouter.get('/lista-juntas', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idProyecto = req.query.id_proyecto ? String(req.query.id_proyecto).trim() : '501';
    const juntas = await PipingService.obtenerJuntasProyecto(idProyecto);
    return sendSuccess(res, {
      id_proyecto: idProyecto,
      total: juntas.length,
      registros: juntas
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/piping/pid — Obtener P&IDs vigentes
 */
pipingRouter.get('/pid', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idProyecto = req.query.id_proyecto ? String(req.query.id_proyecto).trim() : '501';
    const pids = await PipingService.obtenerPidProyecto(idProyecto);
    return sendSuccess(res, { id_proyecto: idProyecto, total: pids.length, registros: pids });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/piping/lineas — Obtener Líneas de piping vigentes
 */
pipingRouter.get('/lineas', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idProyecto = req.query.id_proyecto ? String(req.query.id_proyecto).trim() : '501';
    const lineas = await PipingService.obtenerLineasProyecto(idProyecto);
    return sendSuccess(res, { id_proyecto: idProyecto, total: lineas.length, registros: lineas });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/piping/isometricos — Obtener Isométricos vigentes
 */
pipingRouter.get('/isometricos', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idProyecto = req.query.id_proyecto ? String(req.query.id_proyecto).trim() : '501';
    const isos = await PipingService.obtenerIsometricosProyecto(idProyecto);
    return sendSuccess(res, { id_proyecto: idProyecto, total: isos.length, registros: isos });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/piping/spools — Obtener Spools vigentes
 */
pipingRouter.get('/spools', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idProyecto = req.query.id_proyecto ? String(req.query.id_proyecto).trim() : '501';
    const spools = await PipingService.obtenerSpoolsProyecto(idProyecto);
    return sendSuccess(res, { id_proyecto: idProyecto, total: spools.length, registros: spools });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/piping/auditoria — Historial de sincronizaciones
 */
pipingRouter.get('/auditoria', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limite = req.query.limite ? parseInt(String(req.query.limite), 10) : 50;
    const auditoria = await PipingService.obtenerAuditoria(limite);
    return sendSuccess(res, auditoria);
  } catch (error) {
    next(error);
  }
});
