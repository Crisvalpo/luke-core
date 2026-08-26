import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { requireAuth } from '../../shared/middlewares/authGuard.js';

export const authRouter = Router();

authRouter.post('/login', AuthController.login);
authRouter.get('/me', requireAuth, AuthController.me);
