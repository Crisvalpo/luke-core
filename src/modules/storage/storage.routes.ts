import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';
import { requireAuth } from '../../shared/middlewares/authGuard.js';

export const storageRouter = Router();

/**
 * Subida de archivos (logos, firmas, fotos) directamente a Supabase Storage en Oracle Cloud
 */
storageRouter.post('/upload', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename, base64, contentType = 'image/png', bucket = 'core-logos' } = req.body;

    if (!base64 || !filename) {
      return sendError(res, 'Se requiere base64 y filename', 400);
    }

    // Limpiar header base64 si viene presente (data:image/png;base64,...)
    const cleanBase64 = base64.includes('base64,') ? base64.split('base64,')[1] : base64;
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Generar ruta única
    const timestamp = Date.now();
    const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9._-]/g, '_');
    const filePath = `logos/${timestamp}_${cleanFilename}`;

    // Subir al bucket en Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      throw new Error(`Error al subir imagen a Supabase Storage: ${error.message}`);
    }

    // Obtener URL pública
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return sendSuccess(res, {
      path: data.path,
      url: publicUrlData.publicUrl
    }, 201, { mensaje: 'Imagen subida exitosamente a Supabase Storage' });

  } catch (error: any) {
    return sendError(res, error.message || 'Error al procesar subida de archivo', 500);
  }
});
