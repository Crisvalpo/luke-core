import { Request, Response, NextFunction } from 'express';
import { IngestaService } from './ingesta.service.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';

export class IngestaController {
  public static async cargarPersonal(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenant_id, base64 } = req.body;
      const tenantIdFinal = tenant_id || req.tenantId;

      if (!tenantIdFinal) {
        return sendError(res, 'El ID de la empresa (tenant_id) es obligatorio', 400);
      }
      if (!base64) {
        return sendError(res, 'El contenido del archivo en base64 es obligatorio', 400);
      }

      const resultado = await IngestaService.procesarPersonal(tenantIdFinal, base64);
      return sendSuccess(res, resultado, 200, {
        mensaje: `Ingesta finalizada: ${resultado.insertados} creados, ${resultado.actualizados} actualizados, ${resultado.errores.length} errores.`
      });
    } catch (error) {
      next(error);
    }
  }

  public static async cargarEquipos(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenant_id, base64 } = req.body;
      const tenantIdFinal = tenant_id || req.tenantId;

      if (!tenantIdFinal) {
        return sendError(res, 'El ID de la empresa (tenant_id) es obligatorio', 400);
      }
      if (!base64) {
        return sendError(res, 'El contenido del archivo en base64 es obligatorio', 400);
      }

      const resultado = await IngestaService.procesarEquipos(tenantIdFinal, base64);
      return sendSuccess(res, resultado, 200, {
        mensaje: `Ingesta de flota finalizada: ${resultado.insertados} creados, ${resultado.actualizados} actualizados, ${resultado.errores.length} errores.`
      });
    } catch (error) {
      next(error);
    }
  }

  public static descargarPlantilla(req: Request, res: Response, next: NextFunction) {
    try {
      const tipo = req.params.tipo === 'equipos' ? 'equipos' : 'personal';
      const buffer = IngestaService.generarPlantilla(tipo);

      res.setHeader('Content-Disposition', `attachment; filename="plantilla_${tipo}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}
