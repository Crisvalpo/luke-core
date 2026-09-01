import { Router, Request, Response, NextFunction } from 'express';
import { PipingService } from './piping.service.js';
import { PipingSyncService } from './piping-sync.service.js';
import { PipingRegistrosService } from './piping-registros.service.js';
import { payloadSyncJuntasSchema } from './piping.schema.js';
import { requireSyncAuth } from '../../shared/middlewares/authGuard.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';

export const pipingRouter = Router();

/**
 * POST /api/v1/piping/lista-juntas — Sincronización masiva de juntas desde Excel
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
 * POST /api/v1/piping/pid — Sincronización masiva de P&IDs desde Excel
 */
pipingRouter.post('/pid', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioWindows = req.user?.sub || 'DESCONOCIDO';
    const resultado = await PipingSyncService.sincronizarPid(usuarioWindows, req.body);
    return sendSuccess(res, resultado, 200, {
      mensaje: `Sincronización exitosa: ${resultado.procesados} P&IDs procesados.`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/piping/lineas — Sincronización masiva de Líneas desde Excel
 */
pipingRouter.post('/lineas', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioWindows = req.user?.sub || 'DESCONOCIDO';
    const resultado = await PipingSyncService.sincronizarLineas(usuarioWindows, req.body);
    return sendSuccess(res, resultado, 200, {
      mensaje: `Sincronización exitosa: ${resultado.procesados} Líneas procesadas.`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/piping/isometricos — Sincronización masiva de Isométricos desde Excel
 */
pipingRouter.post('/isometricos', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioWindows = req.user?.sub || 'DESCONOCIDO';
    const resultado = await PipingSyncService.sincronizarIsometricos(usuarioWindows, req.body);
    return sendSuccess(res, resultado, 200, {
      mensaje: `Sincronización exitosa: ${resultado.procesados} Isométricos procesados.`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/piping/spools — Sincronización masiva de Spools desde Excel
 */
pipingRouter.post('/spools', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioWindows = req.user?.sub || 'DESCONOCIDO';
    const resultado = await PipingSyncService.sincronizarSpools(usuarioWindows, req.body);
    return sendSuccess(res, resultado, 200, {
      mensaje: `Sincronización exitosa: ${resultado.procesados} Spools procesados.`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/piping/valvulas — Sincronización masiva de Válvulas desde Excel
 */
pipingRouter.post('/valvulas', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioWindows = req.user?.sub || 'DESCONOCIDO';
    const resultado = await PipingSyncService.sincronizarValvulas(usuarioWindows, req.body);
    return sendSuccess(res, resultado, 200, {
      mensaje: `Sincronización exitosa: ${resultado.procesados} Válvulas procesadas.`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/piping/soportes — Sincronización masiva de Soportes desde Excel
 */
pipingRouter.post('/soportes', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioWindows = req.user?.sub || 'DESCONOCIDO';
    const resultado = await PipingSyncService.sincronizarSoportes(usuarioWindows, req.body);
    return sendSuccess(res, resultado, 200, {
      mensaje: `Sincronización exitosa: ${resultado.procesados} Soportes procesados.`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/piping/mto — Sincronización masiva de MTO desde Excel
 */
pipingRouter.post('/mto', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioWindows = req.user?.sub || 'DESCONOCIDO';
    const resultado = await PipingSyncService.sincronizarMto(usuarioWindows, req.body);
    return sendSuccess(res, resultado, 200, {
      mensaje: `Sincronización exitosa: ${resultado.procesados} registros MTO procesados.`
    });
  } catch (error) {
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
 * GET /api/v1/piping/valvulas — Obtener Válvulas de piping vigentes
 */
pipingRouter.get('/valvulas', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idProyecto = req.query.id_proyecto ? String(req.query.id_proyecto).trim() : '501';
    const valvulas = await PipingService.obtenerValvulasProyecto(idProyecto);
    return sendSuccess(res, { id_proyecto: idProyecto, total: valvulas.length, registros: valvulas });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/piping/soportes — Obtener Soportes de piping vigentes con empaquetamiento AWP
 */
pipingRouter.get('/soportes', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idProyecto = req.query.id_proyecto ? String(req.query.id_proyecto).trim() : '501';
    const soportes = await PipingService.obtenerSoportesProyecto(idProyecto);
    return sendSuccess(res, { id_proyecto: idProyecto, total: soportes.length, registros: soportes });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/piping/mto — Obtener cubicación MTO y trazabilidad de materiales por Spool/Línea
 */
pipingRouter.get('/mto', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idProyecto = req.query.id_proyecto ? String(req.query.id_proyecto).trim() : '501';
    const mto = await PipingService.obtenerMtoProyecto(idProyecto);
    return sendSuccess(res, { id_proyecto: idProyecto, total: mto.length, registros: mto });
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

/**
 * REGISTROS DE TERRENO Y CALIDAD (QA/QC)
 */
pipingRouter.post('/ejecuciones', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioWindows = req.user?.sub || 'DESCONOCIDO';
    const resultado = await PipingRegistrosService.sincronizarEjecuciones(usuarioWindows, req.body);
    return sendSuccess(res, resultado, 200, { mensaje: `Sincronización exitosa: ${resultado.procesados} ejecuciones procesadas.` });
  } catch (error) {
    next(error);
  }
});

pipingRouter.get('/ejecuciones', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idProyecto = req.query.id_proyecto ? String(req.query.id_proyecto).trim() : '501';
    const registros = await PipingRegistrosService.obtenerEjecuciones(idProyecto);
    return sendSuccess(res, { id_proyecto: idProyecto, total: registros.length, registros });
  } catch (error) {
    next(error);
  }
});

pipingRouter.post('/inspecciones-vt', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioWindows = req.user?.sub || 'DESCONOCIDO';
    const resultado = await PipingRegistrosService.sincronizarInspeccionesVT(usuarioWindows, req.body);
    return sendSuccess(res, resultado, 200, { mensaje: `Sincronización exitosa: ${resultado.procesados} inspecciones VT procesadas.` });
  } catch (error) {
    next(error);
  }
});

pipingRouter.get('/inspecciones-vt', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idProyecto = req.query.id_proyecto ? String(req.query.id_proyecto).trim() : '501';
    const registros = await PipingRegistrosService.obtenerInspeccionesVT(idProyecto);
    return sendSuccess(res, { id_proyecto: idProyecto, total: registros.length, registros });
  } catch (error) {
    next(error);
  }
});

pipingRouter.post('/inspecciones-nde', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioWindows = req.user?.sub || 'DESCONOCIDO';
    const resultado = await PipingRegistrosService.sincronizarInspeccionesNDE(usuarioWindows, req.body);
    return sendSuccess(res, resultado, 200, { mensaje: `Sincronización exitosa: ${resultado.procesados} ensayos NDE procesados.` });
  } catch (error) {
    next(error);
  }
});

pipingRouter.get('/inspecciones-nde', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idProyecto = req.query.id_proyecto ? String(req.query.id_proyecto).trim() : '501';
    const registros = await PipingRegistrosService.obtenerInspeccionesNDE(idProyecto);
    return sendSuccess(res, { id_proyecto: idProyecto, total: registros.length, registros });
  } catch (error) {
    next(error);
  }
});

pipingRouter.post('/eventos-spool', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioWindows = req.user?.sub || 'DESCONOCIDO';
    const resultado = await PipingRegistrosService.sincronizarEventosSpool(usuarioWindows, req.body);
    return sendSuccess(res, resultado, 200, { mensaje: `Sincronización exitosa: ${resultado.procesados} eventos de spool procesados.` });
  } catch (error) {
    next(error);
  }
});

pipingRouter.get('/eventos-spool', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idProyecto = req.query.id_proyecto ? String(req.query.id_proyecto).trim() : '501';
    const registros = await PipingRegistrosService.obtenerEventosSpool(idProyecto);
    return sendSuccess(res, { id_proyecto: idProyecto, total: registros.length, registros });
  } catch (error) {
    next(error);
  }
});

