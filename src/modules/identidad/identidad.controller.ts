import { Request, Response, NextFunction } from 'express';
import { IdentidadService } from './identidad.service.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';
import { z } from 'zod';

const resolverSchema = z.object({
  telefono: z.string().min(8, 'El teléfono debe tener al menos 8 caracteres')
});

export class IdentidadController {
  static async resolver(req: Request, res: Response, next: NextFunction) {
    try {
      const { telefono } = resolverSchema.parse(req.query);
      const resultado = await IdentidadService.resolverPorWhatsApp(telefono);

      if (!resultado.encontrado) {
        return sendError(res, `No se encontró personal registrado con el teléfono ${telefono}`, 404);
      }

      return sendSuccess(res, resultado);
    } catch (error) {
      next(error);
    }
  }

  static async resolverPost(req: Request, res: Response, next: NextFunction) {
    try {
      const { telefono } = resolverSchema.parse(req.body);
      const resultado = await IdentidadService.resolverPorWhatsApp(telefono);

      if (!resultado.encontrado) {
        return sendError(res, `No se encontró personal registrado con el teléfono ${telefono}`, 404);
      }

      // Si se encuentra, preparamos o actualizamos automáticamente la sesión conversacional
      if (resultado.tenant_id && resultado.telefono_whatsapp) {
        await IdentidadService.obtenerOCrearSesionCanal(
          resultado.tenant_id,
          'whatsapp',
          resultado.telefono_whatsapp,
          resultado.personal_id,
          resultado.proyecto_id
        );
      }

      return sendSuccess(res, resultado);
    } catch (error) {
      next(error);
    }
  }
}
