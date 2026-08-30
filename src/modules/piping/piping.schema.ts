import { z } from 'zod';

export const juntaItemSchema = z.object({
  id_proyecto: z.string().min(1, 'id_proyecto requerido').transform(v => v.trim()),
  id_junta: z.string().min(1, 'id_junta requerido').transform(v => v.trim().toUpperCase()),
  tag: z.string().optional().nullable().transform(v => v ? v.trim() : null),
  estado: z.string().default('ACTIVO').transform(v => v ? v.trim().toUpperCase() : 'ACTIVO'),
  vigente: z.boolean().default(true)
});

export const sincronizarListaJuntasSchema = z.array(juntaItemSchema)
  .min(1, 'Debe enviar al menos un registro de junta para sincronizar');

export type JuntaItemInput = z.infer<typeof juntaItemSchema>;
export type SincronizarListaJuntasInput = z.infer<typeof sincronizarListaJuntasSchema>;
