import { dbPool } from '../../config/database.js';
import { CrearRolInput, EditarRolInput } from './roles.schema.js';

/**
 * Servicio de Roles Funcionales — Aislado por Proyecto y Tenant
 */
export class RolesService {
  /**
   * Listar roles activos filtrando por proyecto (o plantillas de empresa si no se pasa proyectoId)
   */
  static async listar(tenantId: string, proyectoId?: string | null) {
    let sql = `
      SELECT 
        r.*,
        p.nombre AS proyecto_nombre,
        COUNT(per.id) AS total_personal_asignado
      FROM core.roles_empresa r
      LEFT JOIN core.proyectos p ON p.id = r.proyecto_id
      LEFT JOIN core.personal per ON per.rol_funcional_id = r.id AND per.activo = TRUE
      WHERE r.tenant_id = $1 AND r.activo = TRUE
    `;
    const params: any[] = [tenantId];

    if (proyectoId) {
      params.push(proyectoId);
      sql += ` AND r.proyecto_id = $${params.length}`;
    } else if (proyectoId === null) {
      // Solo plantillas maestras
      sql += ` AND r.proyecto_id IS NULL AND r.is_template = TRUE`;
    }

    sql += `
      GROUP BY r.id, p.nombre
      ORDER BY
        CASE r.rol_seguridad_base
          WHEN 'admin' THEN 1
          WHEN 'supervisor' THEN 2
          WHEN 'worker' THEN 3
        END,
        r.nombre ASC;
    `;

    const result = await dbPool.query(sql, params);
    return result.rows;
  }

  /**
   * Obtener detalle de un rol con el personal asignado
   */
  static async obtenerDetalle(tenantId: string, rolId: string, proyectoId?: string | null) {
    let sqlRol = `
      SELECT r.*, p.nombre AS proyecto_nombre
      FROM core.roles_empresa r
      LEFT JOIN core.proyectos p ON p.id = r.proyecto_id
      WHERE r.id = $1 AND r.tenant_id = $2
    `;
    const params: any[] = [rolId, tenantId];

    if (proyectoId) {
      params.push(proyectoId);
      sqlRol += ` AND (r.proyecto_id = $${params.length} OR r.proyecto_id IS NULL)`;
    }

    const rolRes = await dbPool.query(sqlRol, params);
    if (rolRes.rows.length === 0) return null;

    const personalRes = await dbPool.query(`
      SELECT id, rut, nombre_completo, cargo, telefono_whatsapp, turno
      FROM core.personal
      WHERE rol_funcional_id = $1 AND tenant_id = $2 AND activo = TRUE
      ORDER BY nombre_completo ASC;
    `, [rolId, tenantId]);

    return {
      ...rolRes.rows[0],
      personal_asignado: personalRes.rows
    };
  }

  /**
   * Crear un nuevo rol funcional personalizado (para una faena/proyecto o plantilla)
   */
  static async crear(tenantId: string, input: CrearRolInput) {
    const proyectoId = input.proyecto_id || null;

    // Verificar unicidad de código dentro del proyecto o tenant
    let dupSql = 'SELECT id FROM core.roles_empresa WHERE tenant_id = $1 AND codigo = $2';
    const dupParams: any[] = [tenantId, input.codigo];

    if (proyectoId) {
      dupParams.push(proyectoId);
      dupSql += ` AND proyecto_id = $3`;
    } else {
      dupSql += ` AND proyecto_id IS NULL`;
    }

    const duplicado = await dbPool.query(dupSql, dupParams);
    if (duplicado.rows.length > 0) {
      throw new Error(`Ya existe un rol con código '${input.codigo}' en este ámbito.`);
    }

    const result = await dbPool.query(`
      INSERT INTO core.roles_empresa (
        tenant_id, proyecto_id, codigo, nombre, descripcion, color,
        rol_seguridad_base, permisos, is_template
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `, [
      tenantId,
      proyectoId,
      input.codigo,
      input.nombre,
      input.descripcion || null,
      input.color,
      input.rol_seguridad_base,
      JSON.stringify(input.permisos),
      proyectoId === null // Si no tiene proyecto, es plantilla
    ]);

    return result.rows[0];
  }

  /**
   * Editar un rol funcional existente (nombre coloquial, color, permisos CRUD, etc.)
   */
  static async editar(tenantId: string, rolId: string, input: EditarRolInput, proyectoId?: string | null) {
    const updates: string[] = [];
    const params: any[] = [];

    if (input.nombre !== undefined) {
      params.push(input.nombre);
      updates.push(`nombre = $${params.length}`);
    }
    if (input.descripcion !== undefined) {
      params.push(input.descripcion);
      updates.push(`descripcion = $${params.length}`);
    }
    if (input.color !== undefined) {
      params.push(input.color);
      updates.push(`color = $${params.length}`);
    }
    if (input.rol_seguridad_base !== undefined) {
      params.push(input.rol_seguridad_base);
      updates.push(`rol_seguridad_base = $${params.length}`);
    }
    if (input.permisos !== undefined) {
      params.push(JSON.stringify(input.permisos));
      updates.push(`permisos = $${params.length}::jsonb`);
    }
    if (typeof input.activo === 'boolean') {
      params.push(input.activo);
      updates.push(`activo = $${params.length}`);
    }

    if (updates.length === 0) {
      throw new Error('No se enviaron campos para actualizar.');
    }

    params.push(rolId);
    params.push(tenantId);

    let sql = `
      UPDATE core.roles_empresa
      SET ${updates.join(', ')}
      WHERE id = $${params.length - 1} AND tenant_id = $${params.length}
    `;

    if (proyectoId) {
      params.push(proyectoId);
      sql += ` AND (proyecto_id = $${params.length} OR proyecto_id IS NULL)`;
    }

    sql += ` RETURNING *;`;

    const result = await dbPool.query(sql, params);
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  /**
   * Desactivar rol (soft delete) en el proyecto
   */
  static async desactivar(tenantId: string, rolId: string, proyectoId?: string | null) {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      // Desvincular personal que tenga este rol
      await client.query(
        'UPDATE core.personal SET rol_funcional_id = NULL WHERE rol_funcional_id = $1 AND tenant_id = $2',
        [rolId, tenantId]
      );

      let sql = `UPDATE core.roles_empresa SET activo = FALSE WHERE id = $1 AND tenant_id = $2`;
      const params: any[] = [rolId, tenantId];

      if (proyectoId) {
        params.push(proyectoId);
        sql += ` AND proyecto_id = $3`;
      }

      sql += ` RETURNING id, codigo, nombre;`;

      const result = await client.query(sql, params);
      await client.query('COMMIT');

      if (result.rows.length === 0) return null;
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Asignar (o quitar) un rol funcional a un miembro del personal
   */
  static async asignarRol(tenantId: string, personalId: string, rolId: string | null) {
    if (rolId) {
      const rolCheck = await dbPool.query(
        'SELECT id, proyecto_id FROM core.roles_empresa WHERE id = $1 AND tenant_id = $2 AND activo = TRUE',
        [rolId, tenantId]
      );
      if (rolCheck.rows.length === 0) {
        throw new Error('Rol no encontrado o inactivo en esta empresa.');
      }
    }

    const result = await dbPool.query(`
      UPDATE core.personal
      SET rol_funcional_id = $1
      WHERE id = $2 AND tenant_id = $3 AND activo = TRUE
      RETURNING id, nombre_completo, cargo, rol_funcional_id;
    `, [rolId, personalId, tenantId]);

    if (result.rows.length === 0) {
      throw new Error('Personal no encontrado en esta empresa.');
    }

    return result.rows[0];
  }
}
