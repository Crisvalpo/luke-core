import { z } from 'zod';

export const loginSchema = z.object({
  identificador: z.string().min(3, 'Ingrese su email, RUT o clave de acceso'),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres')
});

export type LoginInput = z.infer<typeof loginSchema>;
