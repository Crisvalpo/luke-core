import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { loginSchema } from './auth.schema.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const input = loginSchema.parse(req.body);
      const session = await AuthService.login(input);
      return sendSuccess(res, session, 200, { mensaje: 'Sesión iniciada correctamente' });
    } catch (error: any) {
      return sendError(res, error.message || 'Error de autenticación', 401);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user) return sendError(res, 'No autenticado', 401);
      return sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }
}
