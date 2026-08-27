import { z } from 'zod';

/**
 * Schema de validación para crear un nuevo Proyecto/Faena dentro de un Tenant
 */
export const crearProyectoSchema = z.object({
  codigo: z.string()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(64, 'El código no puede superar 64 caracteres')
    .transform(v => v.trim().toUpperCase()),
  nombre: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(255, 'El nombre no puede superar 255 caracteres')
    .transform(v => v.trim()),
  centro_costo: z.string().max(64).optional().nullable(),
  ubicacion: z.string().max(255).optional().nullable(),
  estado: z.enum(['en_ejecucion', 'paralizado', 'terminado', 'en_cierre'])
    .default('en_ejecucion'),
  metadata: z.record(z.any()).default({})
});

/**
 * Schema de validación para editar un Proyecto existente
 */
export const editarProyectoSchema = z.object({
  nombre: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(255)
    .transform(v => v.trim())
    .optional(),
  centro_costo: z.string().max(64).optional().nullable(),
  ubicacion: z.string().max(255).optional().nullable(),
  estado: z.enum(['en_ejecucion', 'paralizado', 'terminado', 'en_cierre']).optional(),
  metadata: z.record(z.any()).optional(),
  activo: z.boolean().optional()
});

/**
 * Schema de validación para crear un Frente de Trabajo dentro de un Proyecto
 */
export const crearFrenteSchema = z.object({
  codigo: z.string()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(64)
    .transform(v => v.trim().toUpperCase()),
  nombre: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(255)
    .transform(v => v.trim()),
  disciplina: z.string().max(64).default('GENERAL')
    .transform(v => v.trim().toUpperCase()),
  metadata: z.record(z.any()).default({})
});

export type CrearProyectoInput = z.infer<typeof crearProyectoSchema>;
export type EditarProyectoInput = z.infer<typeof editarProyectoSchema>;
export type CrearFrenteInput = z.infer<typeof crearFrenteSchema>;
