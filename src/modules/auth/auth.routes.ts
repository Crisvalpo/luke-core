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
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; max-width: 420px; width: 90%; }
        h1 { font-size: 1.3rem; margin-bottom: 0.5rem; color: #38bdf8; }
        p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; }
        #canvas-container { background: white; padding: 1rem; border-radius: 0.5rem; display: inline-flex; align-items: center; justify-content: center; min-height: 256px; min-width: 256px; }
        #qr-img { width: 256px; height: 256px; display: block; }
        .status { margin-top: 1.5rem; font-weight: bold; font-size: 0.95rem; }
        .connected { color: #4ade80; }
        .connecting { color: #fbbf24; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>📲 Vincular WhatsApp Bot</h1>
        <p>Abre WhatsApp en el celular emisor &gt; <b>Dispositivos vinculados</b> &gt; <b>Vincular un dispositivo</b></p>
        <div id="canvas-container">
          <img id="qr-img" style="display:none;" alt="Código QR" />
          <div id="loading-spinner" style="color: #64748b;">Generando código QR...</div>
        </div>
        <div id="status-text" class="status connecting">Consultando estado del servidor...</div>
      </div>
      <script>
        async function checkQr() {
          try {
            const resp = await fetch('/api/auth/wa-status');
            const data = await resp.json();
            
            if (data && data.connected) {
              document.getElementById('canvas-container').innerHTML = '<div style="color:#16a34a; font-size: 4rem;">✅</div>';
              document.getElementById('status-text').innerHTML = '<span class="connected">¡WhatsApp Conectado Exitosamente!</span><br><small style="color:#94a3b8">Número: ' + (data.botNumber || '') + '</small>';
              return;
            }
            
            if (data && data.qrImage) {
              const img = document.getElementById('qr-img');
              const spinner = document.getElementById('loading-spinner');
              if (spinner) spinner.style.display = 'none';
              img.src = data.qrImage;
              img.style.display = 'block';
              document.getElementById('status-text').innerHTML = '<span class="connecting">Escanea el código QR desde tu celular</span>';
            }
          } catch(e) {
            console.error(e);
            document.getElementById('status-text').innerText = 'Error al consultar estado: ' + e.message;
          }
        }
        setInterval(checkQr, 2500);
        checkQr();
      </script>
    </body>
    </html>
  `);
});

// Endpoint proxy para el estado de WhatsApp y generación de imagen QR en servidor
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
    
    let qrImage = null;
    if (qrData && qrData.qr) {
      const QRCode = (await import('qrcode')).default;
      qrImage = await QRCode.toDataURL(qrData.qr, { width: 256, margin: 1 });
    }
    
    return res.json({
      connected: false,
      qrImage,
      status: qrData.status
    });
  } catch (error: any) {
    return res.status(500).json({ connected: false, error: error.message });
  }
});
