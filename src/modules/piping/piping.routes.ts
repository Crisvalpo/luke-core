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
      mensaje: `Sincronización exitosa: ${resultado.procesados} juntas procesadas en el proyecto ${resultado.proyecto_id}.`
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return sendError(res, error.errors[0]?.message || 'Estructura de juntas inválida', 400);
    }
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
