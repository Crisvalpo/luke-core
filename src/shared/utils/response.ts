import { Response } from 'express';

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  detalles?: any;
  meta?: {
    timestamp: string;
    duracion_ms?: number;
    paginacion?: {
      total: number;
      pagina: number;
      limite: number;
    };
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: any) {
  const payload: ApiResponse<T> = {
    ok: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
  return res.status(statusCode).json(payload);
}

export function sendError(res: Response, error: string, statusCode = 400, detalles?: any) {
  const payload: ApiResponse = {
    ok: false,
    error,
    detalles,
    meta: {
      timestamp: new Date().toISOString()
    }
  };
  return res.status(statusCode).json(payload);
}
