import { Router } from 'express';
import { IdentidadController } from './identidad.controller.js';

export const identidadRouter = Router();

identidadRouter.get('/resolver-whatsapp', IdentidadController.resolver);
identidadRouter.post('/resolver-whatsapp', IdentidadController.resolverPost);
