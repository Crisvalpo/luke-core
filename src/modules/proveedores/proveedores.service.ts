import { dbPool } from '../../config/database.js';
import { normalizarRut, validarRut } from '../../shared/utils/rut.js';
import { CrearProveedorInput, EditarProveedorInput } from './proveedores.schema.js';

/**
 * Servicio de Proveedores / Subcontratistas — Aislado por Tenant
 * Utiliza la tabla canónica core.vendors con alias de compatibilidad
 */
export class ProveedoresService {
  /**
   * Listar proveedores activos del tenant con búsqueda opcional
   */
  static async listar(tenantId: string, busqueda?: string) {
    let sql = `
      SELECT 
        id, tenant_id, tax_id, business_name, industry_type, contact_name, phone_number, email, is_active, metadata, created_at, updated_at,
        tax_id AS rut, business_name AS razon_social, industry_type AS giro, contact_name AS contacto_nombre, phone_number AS telefono, is_active AS activo
      FROM core.vendors
      WHERE tenant_id = $1 AND is_active = TRUE
    `;
    const params: any[] = [tenantId];

    if (busqueda) {
      params.push(`%${busqueda.toLowerCase()}%`);
      sql += ` AND (
        LOWER(business_name) LIKE $${params.length}
        OR tax_id LIKE $${params.length}
        OR LOWER(COALESCE(industry_type, '')) LIKE $${params.length}
      )`;
    }

    sql += ` ORDER BY business_name ASC LIMIT 200;`;
    const result = await dbPool.query(sql, params);
    return result.rows;
  }

  /**
   * Obtener detalle de un proveedor por ID
   */
  static async obtenerPorId(tenantId: string, proveedorId: string) {
    const result = await dbPool.query(`
      SELECT 
        id, tenant_id, tax_id, business_name, industry_type, contact_name, phone_number, email, is_active, metadata, created_at, updated_at,
        tax_id AS rut, business_name AS razon_social, industry_type AS giro, contact_name AS contacto_nombre, phone_number AS telefono, is_active AS activo
      FROM core.vendors 
      WHERE id = $1 AND tenant_id = $2
    `, [proveedorId, tenantId]);
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
      'SELECT id FROM core.vendors WHERE tenant_id = $1 AND tax_id = $2',
      [tenantId, rutLimpio]
    );
    if (duplicado.rows.length > 0) {
      throw new Error(`Ya existe un proveedor con RUT '${rutLimpio}' en esta empresa.`);
    }

    const result = await dbPool.query(`
      INSERT INTO core.vendors (
        tenant_id, tax_id, business_name, industry_type, contact_name, phone_number, email, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id, tenant_id, tax_id, business_name, industry_type, contact_name, phone_number, email, is_active, metadata, created_at, updated_at,
        tax_id AS rut, business_name AS razon_social, industry_type AS giro, contact_name AS contacto_nombre, phone_number AS telefono, is_active AS activo;
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
      updates.push(`business_name = $${params.length}`);
    }
    if (input.giro !== undefined) {
      params.push(input.giro);
      updates.push(`industry_type = $${params.length}`);
    }
    if (input.contacto_nombre !== undefined) {
      params.push(input.contacto_nombre);
      updates.push(`contact_name = $${params.length}`);
    }
    if (input.telefono !== undefined) {
      params.push(input.telefono);
      updates.push(`phone_number = $${params.length}`);
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
      updates.push(`is_active = $${params.length}`);
    }

    if (updates.length === 0) {
      throw new Error('No se enviaron campos para actualizar.');
    }

    params.push(proveedorId);
    params.push(tenantId);

    const sql = `
      UPDATE core.vendors
      SET ${updates.join(', ')}
      WHERE id = $${params.length - 1} AND tenant_id = $${params.length}
      RETURNING 
        id, tenant_id, tax_id, business_name, industry_type, contact_name, phone_number, email, is_active, metadata, created_at, updated_at,
        tax_id AS rut, business_name AS razon_social, industry_type AS giro, contact_name AS contacto_nombre, phone_number AS telefono, is_active AS activo;
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
      UPDATE core.vendors SET is_active = FALSE
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, tax_id, business_name, tax_id AS rut, business_name AS razon_social;
    `, [proveedorId, tenantId]);

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }
}
