import { env } from '../../config/env.js';

export interface EnviarMensajeWhatsappOptions {
  to: string;
  text: string;
  sessionId?: string;
}

/**
 * Servicio de envío de mensajes WhatsApp vía Baileys Bridge
 */
export class WhatsAppService {
  /**
   * Envía un mensaje de texto por WhatsApp a través del Bridge local/servidor
   */
  static async enviarMensaje(options: EnviarMensajeWhatsappOptions): Promise<boolean> {
    const sessionId = options.sessionId || env.WA_SESSION_ID || 'subastas';
    const url = `${env.WA_BRIDGE_URL}/${sessionId}/send`;

    // Sanitizar destinatario: solo números con código de país (sin + para Baileys)
    let telefono = options.to.replace(/[^0-9]/g, '');
    if (!telefono.endsWith('@s.whatsapp.net')) {
      telefono = `${telefono}@s.whatsapp.net`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wa-bridge-secret': env.WA_BRIDGE_SECRET
        },
        body: JSON.stringify({
          to: telefono,
          text: options.text
        })
      });

      const data = (await response.json()) as any;
      if (!response.ok || !data.success) {
        console.warn(`⚠️ [WHATSAPP-BRIDGE] Advertencia al enviar a ${options.to}:`, data?.message || data?.error || 'Error desconocido');
        return false;
      }

      console.log(`📲 [WHATSAPP] Mensaje enviado exitosamente a ${options.to}`);
      return true;
    } catch (error: any) {
      console.error(`❌ [WHATSAPP-BRIDGE] Error de conexión con WaBridge (${url}):`, error.message);
      return false;
    }
  }

  /**
   * Envía un OTP formateado de 6 dígitos para autenticación Excel
   */
  static async enviarOtpExcel(telefono: string, usuarioWindows: string, otp: string): Promise<boolean> {
    const mensaje = `🔐 *LukeApp — Autenticación Excel*\n\nHola *${usuarioWindows}*,\nTu código de verificación para sincronizar datos es:\n\n👉 *${otp}*\n\n⏳ Válido por 5 minutos.\n_No compartas este código con nadie._`;
    return this.enviarMensaje({ to: telefono, text: mensaje });
  }
}
