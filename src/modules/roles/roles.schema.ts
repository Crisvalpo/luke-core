import { z } from 'zod';

const nivelSeguridad = z.enum(['admin', 'supervisor', 'worker']);

/**
 * Schema para la estructura de permisos JSONB de un rol
 * Soporta permisos CRUD por módulo (ej: { combustible: { crear: true, ver: true, editar: false, eliminar: false } })
 */
const permisosSchema = z.object({
  modulos: z.record(z.record(z.boolean())).default({}),
  recursos: z.record(z.record(z.boolean())).default({})
}).default({ modulos: {}, recursos: {} });

/**
 * Schema para crear un nuevo Rol Funcional (a nivel de Proyecto o Plantilla de Empresa)
 */
export const crearRolSchema = z.object({
  proyecto_id: z.string().uuid('ID de proyecto inválido').optional().nullable(),
  codigo: z.string()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(64)
    .transform(v => v.trim().toUpperCase().replace(/\s+/g, '_')),
  nombre: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(128)
    .transform(v => v.trim()),
  descripcion: z.string().optional().nullable(),
  color: z.string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'El color debe ser un HEX válido (ej: #10b981)')
    .default('#10b981'),
  rol_seguridad_base: nivelSeguridad.default('worker'),
  permisos: permisosSchema
});

/**
 * Schema para editar un Rol Funcional existente
 */
export const editarRolSchema = z.object({
  nombre: z.string().min(3).max(128).transform(v => v.trim()).optional(),
  descripcion: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  rol_seguridad_base: nivelSeguridad.optional(),
  permisos: permisosSchema.optional(),
  activo: z.boolean().optional()
});

/**
 * Schema para asignar un rol a un miembro del personal
 */
export const asignarRolSchema = z.object({
  personal_id: z.string().uuid('ID de personal inválido'),
  rol_id: z.string().uuid('ID de rol inválido').nullable()
});

export type CrearRolInput = z.infer<typeof crearRolSchema>;
export type EditarRolInput = z.infer<typeof editarRolSchema>;
export type AsignarRolInput = z.infer<typeof asignarRolSchema>;

