import { z } from 'zod';
import { normalizarRut } from '../../shared/utils/rut.js';

/**
 * Schema de validación para crear un nuevo Proveedor / Subcontratista
 */
export const crearProveedorSchema = z.object({
  rut: z.string()
    .min(8, 'RUT debe tener al menos 8 caracteres')
    .max(20)
    .transform(v => v.trim()),
  razon_social: z.string()
    .min(3, 'La razón social debe tener al menos 3 caracteres')
    .max(255)
    .transform(v => v.trim()),
  giro: z.string().max(255).optional().nullable(),
  contacto_nombre: z.string().max(255).optional().nullable(),
  telefono: z.string().max(32).optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable(),
  metadata: z.record(z.any()).default({})
});

/**
 * Schema de validación para editar un Proveedor existente
 */
export const editarProveedorSchema = z.object({
  razon_social: z.string().min(3).max(255).transform(v => v.trim()).optional(),
  giro: z.string().max(255).optional().nullable(),
  contacto_nombre: z.string().max(255).optional().nullable(),
  telefono: z.string().max(32).optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable(),
  metadata: z.record(z.any()).optional(),
  activo: z.boolean().optional()
});

export type CrearProveedorInput = z.infer<typeof crearProveedorSchema>;
export type EditarProveedorInput = z.infer<typeof editarProveedorSchema>;
