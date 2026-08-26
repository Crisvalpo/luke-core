import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';
import { ZodError } from 'zod';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('💥 [ERROR]', err);

  if (err instanceof ZodError) {
    return sendError(res, 'Error de validación de datos de entrada', 422, err.errors);
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  return sendError(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : undefined);
}
