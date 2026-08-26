import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';
import { normalizarRut, validarRut } from '../../shared/utils/rut.js';
import { normalizarTelefonoChileno } from '../../shared/utils/phone.js';
import { z } from 'zod';

export const personalRouter = Router();

// Listar personal con filtros
personalRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant, proyecto, cargo, rol, busqueda } = req.query;

    let sql = `
      SELECT 
        p.*,
        t.slug AS tenant_slug,
        t.razon_social AS tenant_razon_social,
        pr.codigo AS proyecto_codigo,
        pr.nombre AS proyecto_nombre
      FROM core.personal p
      JOIN core.tenants t ON t.id = p.tenant_id
      LEFT JOIN core.proyectos pr ON pr.id = p.proyecto_id
      WHERE p.activo = TRUE
    `;

    const params: any[] = [];
    if (tenant) {
      params.push(String(tenant).toLowerCase());
      sql += ` AND (t.slug = $${params.length} OR t.id::text = $${params.length})`;
    }
    if (proyecto) {
      params.push(String(proyecto));
      sql += ` AND (pr.codigo = $${params.length} OR pr.id::text = $${params.length})`;
    }
    if (rol) {
      params.push(String(rol).toLowerCase());
      sql += ` AND p.rol_organizacional = $${params.length}`;
    }
    if (busqueda) {
      params.push(`%${String(busqueda).toLowerCase()}%`);
      sql += ` AND (LOWER(p.nombre_completo) LIKE $${params.length} OR p.rut LIKE $${params.length} OR p.telefono_whatsapp LIKE $${params.length})`;
    }

    sql += ` ORDER BY p.nombre_completo ASC LIMIT 200;`;

    const result = await query(sql, params);
    return sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
});

const createPersonalSchema = z.object({
  tenant_id: z.string().uuid(),
  proyecto_id: z.string().uuid().optional(),
  rut: z.string().min(8),
  nombre_completo: z.string().min(3),
  cargo: z.string().min(2),
  rol_organizacional: z.string().default('operario'),
  telefono_whatsapp: z.string().optional(),
  email: z.string().email().optional(),
  turno: z.string().optional()
});

// Crear personal
personalRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createPersonalSchema.parse(req.body);
    const rutLimpio = normalizarRut(body.rut);

    if (!validarRut(rutLimpio)) {
      return sendError(res, 'RUT inválido', 400);
    }

    const telefonoNorm = body.telefono_whatsapp ? normalizarTelefonoChileno(body.telefono_whatsapp) : null;

    const result = await query(`
      INSERT INTO core.personal (
        tenant_id, proyecto_id, rut, nombre_completo, cargo, rol_organizacional, telefono_whatsapp, email, turno
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `, [
      body.tenant_id,
      body.proyecto_id || null,
      rutLimpio,
      body.nombre_completo,
      body.cargo,
      body.rol_organizacional,
      telefonoNorm,
      body.email || null,
      body.turno || null
    ]);

    return sendSuccess(res, result.rows[0], 201);
  } catch (error) {
    next(error);
  }
});
