import { Router } from 'express';
import { IngestaController } from './ingesta.controller.js';
import { requireAuth } from '../../shared/middlewares/authGuard.js';

export const ingestaRouter = Router();

// Descarga de plantillas de ejemplo (Público o Autenticado)
ingestaRouter.get('/plantilla/:tipo', IngestaController.descargarPlantilla);

// Ingesta masiva protegida por Auth
ingestaRouter.post('/personal', requireAuth, IngestaController.cargarPersonal);
ingestaRouter.post('/equipos', requireAuth, IngestaController.cargarEquipos);
