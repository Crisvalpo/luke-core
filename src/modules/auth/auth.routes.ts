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

// 📱 Visor HTML para vincular WhatsApp Bot (Escanear QR)
authRouter.get('/wa-qr', async (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Vincular WhatsApp Bot — LukeApp</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; max-width: 400px; width: 90%; }
        h1 { font-size: 1.3rem; margin-bottom: 0.5rem; color: #38bdf8; }
        p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; }
        #canvas-container { background: white; padding: 1rem; border-radius: 0.5rem; display: inline-block; min-height: 256px; min-width: 256px; }
        .status { margin-top: 1.5rem; font-weight: bold; font-size: 0.95rem; }
        .connected { color: #4ade80; }
        .connecting { color: #fbbf24; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>📲 Vincular WhatsApp Bot</h1>
        <p>Abre WhatsApp en el celular emisor &gt; <b>Dispositivos vinculados</b> &gt; <b>Vincular un dispositivo</b></p>
        <div id="canvas-container"><canvas id="qr-canvas"></canvas></div>
        <div id="status-text" class="status connecting">Consultando estado...</div>
      </div>
      <script>
        async function checkQr() {
          try {
            const resp = await fetch('http://127.0.0.1:4000/subastas/qr').catch(() => null);
            const statusResp = await fetch('http://127.0.0.1:4000/subastas/status').catch(() => null);
            
            // Si el backend consulta localmente
            const data = await fetch('/api/auth/wa-status').then(r => r.json()).catch(() => null);
            if (data && data.connected) {
              document.getElementById('canvas-container').innerHTML = '<div style="color:#16a34a; padding: 40px; font-size: 3rem;">✅</div>';
              document.getElementById('status-text').innerHTML = '<span class="connected">¡WhatsApp Conectado Exitosamente!</span><br><small style="color:#64748b">Número: ' + (data.botNumber || '') + '</small>';
              return;
            }
            if (data && data.qr) {
              QRCode.toCanvas(document.getElementById('qr-canvas'), data.qr, { width: 256 }, function (error) {
                if (error) console.error(error);
              });
              document.getElementById('status-text').innerHTML = '<span class="connecting">Escanea el código QR antes de que expire</span>';
            }
          } catch(e) {
            console.error(e);
          }
        }
        setInterval(checkQr, 3000);
        checkQr();
      </script>
    </body>
    </html>
  `);
});

// Endpoint proxy para el estado de WhatsApp
authRouter.get('/wa-status', async (_req, res) => {
  try {
    const { env } = await import('../../config/env.js');
    const sessionId = env.WA_SESSION_ID || 'subastas';
    const stResp = await fetch(env.WA_BRIDGE_URL + '/' + sessionId + '/status');
    const stData = (await stResp.json()) as any;
    
    if (stData.status === 'open' || stData.status === 'connected') {
      return res.json({ connected: true, botNumber: stData.botNumber, botName: stData.botName });
    }
    
    const qrResp = await fetch(env.WA_BRIDGE_URL + '/' + sessionId + '/qr');
    const qrData = (await qrResp.json()) as any;
    return res.json({ connected: false, qr: qrData.qr, status: qrData.status });
  } catch (error: any) {
    return res.status(500).json({ connected: false, error: error.message });
  }
});
