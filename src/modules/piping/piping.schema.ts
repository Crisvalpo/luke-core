import { z } from 'zod';

/**
 * Registro de junta individual desde la planilla Excel (tbl_juntas)
 */
export const registroJuntaExcelSchema = z.object({
  uuid: z.string().optional().nullable().transform(v => (v && v.trim().length > 0 ? v.trim() : null)),
  id_junta: z.string().min(1, 'id_junta requerido').transform(v => v.trim().toUpperCase()),
  tag: z.string().optional().nullable().transform(v => (v && v.trim().length > 0 ? v.trim() : null)),
  estado: z.string().default('ACTIVO').transform(v => (v && v.trim().length > 0 ? v.trim().toUpperCase() : 'ACTIVO')),
  id_proyecto: z.string().optional().nullable().transform(v => (v && v.trim().length > 0 ? v.trim() : null))
});

/**
 * Payload completo enviado por Excel Sync v1.0
 */
export const payloadSyncJuntasSchema = z.union([
  // Formato Oficial v1.0 (Objeto con id_proyecto y registros)
  z.object({
    id_proyecto: z.string().min(1, 'id_proyecto requerido en cabecera').transform(v => v.trim()),
    usuario_windows: z.string().optional().nullable(),
    registros: z.array(registroJuntaExcelSchema).min(1, 'La lista de registros no puede estar vacía')
  }),
  // Compatibilidad con array plano
  z.array(registroJuntaExcelSchema).min(1, 'La lista de juntas no puede estar vacía').transform(items => ({
    id_proyecto: items[0]?.id_proyecto || '413',
    usuario_windows: null,
    registros: items
  }))
]);

export type RegistroJuntaExcelInput = z.infer<typeof registroJuntaExcelSchema>;
export type PayloadSyncJuntasInput = z.infer<typeof payloadSyncJuntasSchema>;
