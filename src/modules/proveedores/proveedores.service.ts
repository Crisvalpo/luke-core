import { dbPool } from '../../config/database.js';
import { normalizarRut, validarRut } from '../../shared/utils/rut.js';
import { CrearProveedorInput, EditarProveedorInput } from './proveedores.schema.js';

/**
 * Servicio de Proveedores / Subcontratistas — Aislado por Tenant
 */
export class ProveedoresService {
  /**
   * Listar proveedores activos del tenant con búsqueda opcional
   */
  static async listar(tenantId: string, busqueda?: string) {
    let sql = `
      SELECT * FROM core.proveedores
      WHERE tenant_id = $1 AND activo = TRUE
    `;
    const params: any[] = [tenantId];

    if (busqueda) {
      params.push(`%${busqueda.toLowerCase()}%`);
      sql += ` AND (
        LOWER(razon_social) LIKE $${params.length}
        OR rut LIKE $${params.length}
        OR LOWER(COALESCE(giro, '')) LIKE $${params.length}
      )`;
    }

    sql += ` ORDER BY razon_social ASC LIMIT 200;`;
    const result = await dbPool.query(sql, params);
    return result.rows;
  }

  /**
   * Obtener detalle de un proveedor por ID
   */
  static async obtenerPorId(tenantId: string, proveedorId: string) {
    const result = await dbPool.query(
      'SELECT * FROM core.proveedores WHERE id = $1 AND tenant_id = $2',
      [proveedorId, tenantId]
    );
    return result.rows[0] || null;
  }

  /**
   * Crear un nuevo proveedor dentro del tenant
   */
  static async crear(tenantId: string, input: CrearProveedorInput) {
    const rutLimpio = normalizarRut(input.rut);
    if (!validarRut(rutLimpio)) {
      throw new Error(`RUT de proveedor inválido: ${input.rut}`);
    }

    // Verificar unicidad de RUT dentro del tenant
    const duplicado = await dbPool.query(
      'SELECT id FROM core.proveedores WHERE tenant_id = $1 AND rut = $2',
      [tenantId, rutLimpio]
    );
    if (duplicado.rows.length > 0) {
      throw new Error(`Ya existe un proveedor con RUT '${rutLimpio}' en esta empresa.`);
    }

    const result = await dbPool.query(`
      INSERT INTO core.proveedores (
        tenant_id, rut, razon_social, giro, contacto_nombre, telefono, email, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `, [
      tenantId,
      rutLimpio,
      input.razon_social,
      input.giro || null,
      input.contacto_nombre || null,
      input.telefono || null,
      input.email || null,
      JSON.stringify(input.metadata)
    ]);

    return result.rows[0];
  }

  /**
   * Editar un proveedor existente del tenant
   */
  static async editar(tenantId: string, proveedorId: string, input: EditarProveedorInput) {
    const updates: string[] = [];
    const params: any[] = [];

    if (input.razon_social !== undefined) {
      params.push(input.razon_social);
      updates.push(`razon_social = $${params.length}`);
    }
    if (input.giro !== undefined) {
      params.push(input.giro);
      updates.push(`giro = $${params.length}`);
    }
    if (input.contacto_nombre !== undefined) {
      params.push(input.contacto_nombre);
      updates.push(`contacto_nombre = $${params.length}`);
    }
    if (input.telefono !== undefined) {
      params.push(input.telefono);
      updates.push(`telefono = $${params.length}`);
    }
    if (input.email !== undefined) {
      params.push(input.email);
      updates.push(`email = $${params.length}`);
    }
    if (input.metadata !== undefined) {
      params.push(JSON.stringify(input.metadata));
      updates.push(`metadata = metadata || $${params.length}::jsonb`);
    }
    if (typeof input.activo === 'boolean') {
      params.push(input.activo);
      updates.push(`activo = $${params.length}`);
    }

    if (updates.length === 0) {
      throw new Error('No se enviaron campos para actualizar.');
    }

    params.push(proveedorId);
    params.push(tenantId);

    const sql = `
      UPDATE core.proveedores
      SET ${updates.join(', ')}
      WHERE id = $${params.length - 1} AND tenant_id = $${params.length}
      RETURNING *;
    `;

    const result = await dbPool.query(sql, params);
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  /**
   * Desactivar proveedor (soft delete)
   */
  static async desactivar(tenantId: string, proveedorId: string) {
    const result = await dbPool.query(`
      UPDATE core.proveedores SET activo = FALSE
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, rut, razon_social;
    `, [proveedorId, tenantId]);

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }
}
