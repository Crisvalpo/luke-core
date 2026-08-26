import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { tenantResolver } from './shared/middlewares/tenantResolver.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';
import { sendSuccess } from './shared/utils/response.js';

// Módulos
import { identidadRouter } from './modules/identidad/identidad.routes.js';
import { tenantsRouter } from './modules/tenants/tenants.routes.js';
import { proyectosRouter } from './modules/proyectos/proyectos.routes.js';
import { personalRouter } from './modules/personal/personal.routes.js';
import { equiposRouter } from './modules/equipos/equipos.routes.js';
import { proveedoresRouter } from './modules/proveedores/proveedores.routes.js';

export const app = express();

// Middlewares Base
app.use(cors({
  origin: env.ALLOWED_ORIGINS === '*' ? '*' : env.ALLOWED_ORIGINS.split(','),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de Contexto Multi-Tenant
app.use(tenantResolver);

// Health Check
app.get('/health', (req, res) => {
  return sendSuccess(res, {
    status: 'online',
    app: 'Luke Core',
    version: '1.0.0',
    env: env.NODE_ENV,
    uptime_seconds: process.uptime()
  });
});

// Rutas de la API v1
const apiV1 = express.Router();
apiV1.use('/identidad', identidadRouter);
apiV1.use('/tenants', tenantsRouter);
apiV1.use('/proyectos', proyectosRouter);
apiV1.use('/personal', personalRouter);
apiV1.use('/equipos', equiposRouter);
apiV1.use('/proveedores', proveedoresRouter);

app.use('/api/v1', apiV1);

// Middleware Global de Errores
app.use(errorHandler);
