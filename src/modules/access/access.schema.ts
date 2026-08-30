import { z } from 'zod';

export const solicitudAccesoSchema = z.object({
  usuario_windows: z.string().min(1, 'usuario_windows requerido').transform(v => v.trim()),
  telefono: z.string().min(8, 'telefono requerido').transform(v => v.trim()),
  nombre: z.string().min(2, 'nombre requerido').transform(v => v.trim()),
  equipo: z.string().optional().nullable().transform(v => (v ? v.trim() : null)),
  tenant: z.string().optional().nullable().transform(v => (v ? v.trim() : null))
});

export const webhookBaileysSchema = z.object({
  phone: z.string().optional(),
  message: z.string().optional(),
  pushName: z.string().optional(),
  sessionId: z.string().optional(),
  timestamp: z.any().optional()
});

export type SolicitudAccesoInput = z.infer<typeof solicitudAccesoSchema>;
export type WebhookBaileysInput = z.infer<typeof webhookBaileysSchema>;
