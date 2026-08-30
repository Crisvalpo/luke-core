import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { tenantResolver } from './shared/middlewares/tenantResolver.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';
import { requireAuth, requireSuperAdmin } from './shared/middlewares/authGuard.js';
import { requireTenant } from './shared/middlewares/requireTenant.js';
import { sendSuccess } from './shared/utils/response.js';

// Módulos
import { identidadRouter } from './modules/identidad/identidad.routes.js';
import { tenantsRouter } from './modules/tenants/tenants.routes.js';
import { proyectosRouter } from './modules/proyectos/proyectos.routes.js';
import { personalRouter } from './modules/personal/personal.routes.js';
import { equiposRouter } from './modules/equipos/equipos.routes.js';
import { proveedoresRouter } from './modules/proveedores/proveedores.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { storageRouter } from './modules/storage/storage.routes.js';
import { ingestaRouter } from './modules/ingesta/ingesta.routes.js';
import { rolesRouter } from './modules/roles/roles.routes.js';
import { pipingRouter } from './modules/piping/piping.routes.js';

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

// Servir Panel Web Estático (Admin UI)
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.redirect('/admin/');
});
app.get('/admin', (req, res) => {
  res.redirect('/admin/index.html');
});

// Health Check
app.get('/health', (req, res) => {
  return sendSuccess(res, {
    status: 'online',
    app: 'Luke Core',
    version: '1.2.0',
    env: env.NODE_ENV,
    uptime_seconds: process.uptime()
  });
});

import { accessRouter } from './modules/access/access.routes.js';

// ═══════════════════════════════════════════════════════════════════
// Rutas de la API v1 — CON Control de Acceso por Capas
// ═══════════════════════════════════════════════════════════════════
const apiV1 = express.Router();

// 🔓 Rutas Públicas (sin autenticación requerida previa)
apiV1.use('/auth', authRouter);
apiV1.use('/identidad', identidadRouter);
apiV1.use('/access', accessRouter);

// 🔒 Capa 1: Exclusiva Equipo LukeAPP (Super-Admin) y Gestión Multi-Tenant
apiV1.use('/tenants', requireAuth, tenantsRouter);
apiV1.use('/ingesta', requireAuth, requireSuperAdmin, ingestaRouter);

// 🔐 Capa 2: Rutas con Auth + Tenant (Admins de Empresa y sus operaciones)
apiV1.use('/proyectos', requireAuth, requireTenant, proyectosRouter);
apiV1.use('/personal', requireAuth, requireTenant, personalRouter);
apiV1.use('/equipos', requireAuth, requireTenant, equiposRouter);
apiV1.use('/proveedores', requireAuth, requireTenant, proveedoresRouter);
apiV1.use('/roles', requireAuth, requireTenant, rolesRouter);
apiV1.use('/storage', requireAuth, storageRouter);

// 🚀 Capa 3: Sincronización y Módulos Operacionales (Excel / Piping)
apiV1.use('/piping', pipingRouter);

app.use('/api/v1', apiV1);

// Alias directo para clientes legacy / macros Excel (/api/auth, /api/piping, /api/access, /api/me)
app.use('/api/auth', authRouter);
app.use('/api/piping', pipingRouter);
app.use('/api/access', accessRouter);
app.use('/api/me', accessRouter); // Permite /api/me/projects

// Middleware Global de Errores
app.use(errorHandler);
