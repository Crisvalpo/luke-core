import { z } from 'zod';

export const loginSchema = z.object({
  identificador: z.string().min(3, 'Ingrese su email, RUT o clave de acceso'),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres')
});

export const requestOtpSchema = z.object({
  usuario_windows: z.string()
    .min(2, 'Usuario de Windows requerido')
    .transform(v => v.trim().toUpperCase())
});

export const verifyOtpSchema = z.object({
  usuario_windows: z.string()
    .min(2, 'Usuario de Windows requerido')
    .transform(v => v.trim().toUpperCase()),
  otp: z.string()
    .min(4, 'Código OTP inválido')
    .max(10)
    .transform(v => v.trim())
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
