import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { requireAuth } from '../../shared/middlewares/authGuard.js';

export const authRouter = Router();

authRouter.post('/login', AuthController.login);
authRouter.post('/establecer-clave-directa', AuthController.establecerClaveDirecta);
authRouter.get('/me', requireAuth, AuthController.me);

// 🔐 Endpoints OTP para Excel / VBA
authRouter.post('/request-otp', AuthController.requestOtp);
authRouter.post('/verify-otp', AuthController.verifyOtp);
