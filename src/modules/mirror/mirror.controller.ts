import { Request, Response, NextFunction } from 'express';
import { MirrorService } from './mirror.service.js';
import { SourceFactory } from './sources/source.factory.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';

export class MirrorController {
  static async getWorkers(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenant_id as string) || 'default';
      const projectId = req.query.project_id as string;
      const availableToday = req.query.available_today === 'true';
      const jobTitle = req.query.job_title as string;
      const search = req.query.search as string;

      const workers = await MirrorService.getWorkers({
        tenant_id: tenantId,
        project_id: projectId,
        available_today: availableToday,
        job_title: jobTitle,
        search
      });

      return sendSuccess(res, workers, 200, {
        total: workers.length,
        project_id: projectId || 'ALL',
        available_today: availableToday
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async getForemen(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenant_id as string) || 'default';
      const projectId = req.query.project_id as string;
      if (!projectId) {
        return sendError(res, 'El parámetro project_id es obligatorio para consultar capataces.', 400);
      }

      const foremen = await MirrorService.getForemen(projectId, tenantId);
      return sendSuccess(res, foremen, 200, { total: foremen.length, project_id: projectId });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async syncFromVba(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.body.tenant_id || (req.headers['x-tenant-id'] as string) || 'default';
      const rawWorkers = req.body.workers || (Array.isArray(req.body) ? req.body : []);

      if (!Array.isArray(rawWorkers) || rawWorkers.length === 0) {
        return sendError(res, 'La lista de trabajadores (workers) no puede estar vacía.', 400);
      }

      const result = await MirrorService.syncWorkers(rawWorkers, tenantId);
      return sendSuccess(res, result, 200, {
        mensaje: `Sincronización Excel procesada: ${result.inserted} nuevos, ${result.updated} actualizados, ${result.unassigned} sin obra.`
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async importFile(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenant_id as string) || 'default';
      let buffer: Buffer | null = null;

      if (req.body.archivo_base64 || req.body.file_base64) {
        const b64 = String(req.body.archivo_base64 || req.body.file_base64).replace(/^data:.*?;base64,/, '');
        buffer = Buffer.from(b64, 'base64');
      } else if (Buffer.isBuffer(req.body)) {
        buffer = req.body;
      }

      if (!buffer) {
        return sendError(res, 'Debe adjuntar el archivo Excel/CSV en formato base64 o binario.', 400);
      }

      const source = SourceFactory.getSource('excel');
      const rawWorkers = source.parseBuffer ? source.parseBuffer(buffer, tenantId) : [];
      const result = await MirrorService.syncWorkers(rawWorkers, tenantId);

      return sendSuccess(res, result, 200, {
        mensaje: `Archivo importado con éxito: ${result.total_processed} filas procesadas.`
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async triggerSync(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenant_id as string) || 'default';
      const result = await MirrorService.triggerSourceSync(tenantId);
      return sendSuccess(res, result, 200, {
        mensaje: `Sincronización ejecutada desde fuente '${result.source}'.`
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async getMappings(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenant_id as string) || 'default';
      const mappings = await MirrorService.getMappings(tenantId);
      return sendSuccess(res, mappings);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async setMapping(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.body.tenant_id || (req.headers['x-tenant-id'] as string) || 'default';
      const { cost_center, area, project_id } = req.body;

      if (!cost_center || !project_id) {
        return sendError(res, 'cost_center y project_id son obligatorios.', 400);
      }

      const saved = await MirrorService.setMapping({ cost_center, area, project_id }, tenantId);
      return sendSuccess(res, saved, 200, { mensaje: 'Mapeo guardado exitosamente.' });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
