import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../modules/auth/auth.service.js';
import { sendError } from '../utils/response.js';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Middleware para requerir autenticación mediante Bearer Token o API Key
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const adminKey = req.headers['x-admin-key'];

  // Soporte para API Key directa en llamadas programáticas o bots
  if (adminKey && adminKey === process.env.CORE_ADMIN_API_KEY) {
    req.user = {
      id: '00000000-0000-0000-0000-000000000000',
      nombre_completo: 'API Key Admin',
      rol: 'super_admin'
    };
    return next();
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Acceso no autorizado: Token requerido', 401);
  }

  const token = authHeader.split(' ')[1];
  const payload = await AuthService.validarToken(token);

  if (!payload) {
    return sendError(res, 'Token inválido o expirado. Inicie sesión nuevamente.', 401);
  }

  req.user = payload;
  next();
}

/**
 * Middleware para requerir rol super_admin
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.rol !== 'super_admin') {
    return sendError(res, 'Permiso denegado: Esta acción requiere privilegios de Super-Administrador', 403);
  }
  next();
}
