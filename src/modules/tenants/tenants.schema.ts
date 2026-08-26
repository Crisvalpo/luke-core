import { z } from 'zod';

export const moduloDisponibleEnum = z.enum([
  'core',
  'combustible',
  'partes_diarios',
  'ingesta_masiva',
  'cuadrillas',
  'mantenimiento',
  'inspecciones',
  'guias_despacho'
]);

export const onboardTenantSchema = z.object({
  // Datos de la Empresa
  slug: z
    .string()
    .min(2, 'El slug debe tener al menos 2 caracteres')
    .max(32, 'El slug no puede exceder 32 caracteres')
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones (-)'),
  razon_social: z.string().min(3, 'La razón social debe tener al menos 3 caracteres'),
  rut: z.string().min(8, 'El RUT debe tener al menos 8 caracteres'),
  
  // Configuración y Branding (Marca Blanca)
  config: z.object({
    pais: z.string().default('CL'),
    tipo_industria: z.enum(['industrial', 'montaje', 'transporte', 'logistica']).default('industrial'),
    nombre_fantasia: z.string().optional(),
    color_primario: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color primario debe ser un código HEX (ej: #10B981)').default('#10B981'),
    color_secundario: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color secundario debe ser un código HEX').optional(),
    logo_url: z.string().url('El logo debe ser una URL válida').optional(),
    modulos_activos: z.array(moduloDisponibleEnum).default(['core', 'ingesta_masiva']),
    webhook_notificaciones: z.string().url().optional()
  }).default({}),

  // Proyecto / Faena Inicial (Opcional)
  proyecto_inicial: z.object({
    codigo: z.string().min(2).default('FAENA-BASE'),
    nombre: z.string().min(3).default('Faena Principal'),
    centro_costo: z.string().optional(),
    ubicacion: z.string().optional()
  }).optional(),

  // Administrador Inicial de la Empresa
  administrador_inicial: z.object({
    rut: z.string().min(8, 'RUT del administrador inválido'),
    nombre_completo: z.string().min(3, 'Nombre completo requerido'),
    cargo: z.string().min(2).default('Administrador General'),
    email: z.string().email('Email corporativo inválido'),
    telefono_whatsapp: z.string().min(8, 'Teléfono WhatsApp requerido')
  })
});

export type OnboardTenantInput = z.infer<typeof onboardTenantSchema>;
