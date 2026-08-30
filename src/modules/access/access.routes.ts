import { Router, Request, Response, NextFunction } from 'express';
import { AccessService } from './access.service.js';
import { solicitudAccesoSchema, webhookBaileysSchema } from './access.schema.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';
import { requireSyncAuth } from '../../shared/middlewares/authGuard.js';
import { query } from '../../config/database.js';

export const accessRouter = Router();

/**
 * GET /api/access/me/projects o /api/me/projects — Proyectos autorizados para el usuario autenticado
 */
accessRouter.get('/me/projects', requireSyncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioWindows = req.user?.sub || 'DESCONOCIDO';
    const personalId = req.user?.personal_id;
    const tenantId = req.user?.tenant_id;

    const data = await AccessService.obtenerMisProyectos(usuarioWindows, personalId, tenantId);
    return sendSuccess(res, data, 200);
  } catch (error: any) {
    return sendError(res, error.message || 'Error al obtener proyectos autorizados', 400);
  }
});

/**
 * POST /api/access/request — Enviar solicitud de acceso desde Excel
 */
accessRouter.post('/request', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = solicitudAccesoSchema.parse(req.body);
    const resultado = await AccessService.crearSolicitud(input);
    return sendSuccess(res, resultado, 201, { mensaje: resultado.mensaje });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return sendError(res, error.errors[0]?.message || 'Datos de solicitud inválidos', 400);
    }
    next(error);
  }
});

/**
 * POST /api/access/wa-webhook — Webhook receptor de mensajes desde Baileys Bridge
 */
accessRouter.post('/wa-webhook', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const phone = body.phone || body.from || body.sender;
    const message = body.message || body.text || '';

    if (phone && message) {
      console.log(`📩 [WA-WEBHOOK] Mensaje de ${phone}: "${message}"`);
      await AccessService.procesarMensajeWhatsApp(phone, message);
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('❌ [WA-WEBHOOK] Error procesando mensaje:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/access/solicitudes — Listar historial de solicitudes
 */
accessRouter.get('/solicitudes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limite = req.query.limite ? parseInt(String(req.query.limite), 10) : 50;
    const result = await query(`
      SELECT 
        s.*,
        t.razon_social AS tenant_nombre,
        pr.codigo AS proyecto_codigo,
        pr.nombre AS proyecto_nombre
      FROM core.solicitudes_acceso s
      LEFT JOIN core.tenants t ON t.id = s.tenant_id
      LEFT JOIN core.proyectos pr ON pr.id = s.proyecto_id
      ORDER BY s.created_at DESC
      LIMIT $1;
    `, [limite]);

    return sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
});
