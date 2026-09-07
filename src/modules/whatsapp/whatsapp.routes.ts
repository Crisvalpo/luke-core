import { Router, Request, Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import { env } from '../../config/env.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';

export const whatsappRouter = Router();

const getBridgeUrl = (path: string) => `${env.WA_BRIDGE_URL}/${env.WA_SESSION_ID || 'subastas'}${path}`;

/**
 * GET /api/v1/whatsapp/status — Obtiene el estado actual de la sesión de WhatsApp
 */
whatsappRouter.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const url = getBridgeUrl('/status');
    const response = await fetch(url, { headers: { 'x-wa-bridge-secret': env.WA_BRIDGE_SECRET } });
    
    if (!response.ok) {
      return sendSuccess(res, { state: 'disconnected', message: 'Bridge no disponible' });
    }

    const data = await response.json();
    return sendSuccess(res, data);
  } catch (error: any) {
    return sendSuccess(res, { state: 'disconnected', error: error.message });
  }
});

/**
 * GET /api/v1/whatsapp/qr — Obtiene el QR actual renderizado en DataURL PNG
 */
whatsappRouter.get('/qr', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const url = getBridgeUrl('/qr');
    const response = await fetch(url, { headers: { 'x-wa-bridge-secret': env.WA_BRIDGE_SECRET } });
    
    if (!response.ok) {
      return sendError(res, 'No fue posible consultar el QR en el servicio de WhatsApp', 503);
    }

    const data = (await response.json()) as any;
    let qrImage = null;

    if (data.qr) {
      qrImage = await QRCode.toDataURL(data.qr, {
        width: 280,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
    }

    return sendSuccess(res, {
      status: data.status || 'idle',
      qrImage,
      hasQr: !!data.qr,
      botNumber: data.botNumber || null,
      botName: data.botName || null
    });
  } catch (error: any) {
    return sendError(res, error.message || 'Error al obtener código QR', 500);
  }
});

/**
 * POST /api/v1/whatsapp/logout — Desvincula la sesión actual para escanear un nuevo número
 */
whatsappRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const url = getBridgeUrl('/logout');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'x-wa-bridge-secret': env.WA_BRIDGE_SECRET }
    });

    const data = await response.json();
    return sendSuccess(res, data, 200, { mensaje: 'Sesión de WhatsApp cerrada exitosamente' });
  } catch (error: any) {
    return sendError(res, error.message || 'Error al cerrar sesión de WhatsApp', 500);
  }
});
