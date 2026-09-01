import { dbPool } from '../../config/database.js';
import { CrearProyectoInput, EditarProyectoInput, CrearFrenteInput } from './proyectos.schema.js';

/**
 * Servicio de Proyectos/Faenas — Lógica de negocio aislada por Tenant
 */
export class ProyectosService {
  /**
   * Listar proyectos de un tenant con métricas agregadas
   */
  static async listar(tenantId: string, userId?: string, userRol?: string) {
    let sql = `
      SELECT 
        p.*,
        COUNT(DISTINCT f.id) AS total_frentes,
        COUNT(DISTINCT per.id) AS total_personal,
        COUNT(DISTINCT eq.id) AS total_equipos
      FROM core.proyectos p
      LEFT JOIN core.frentes_trabajo f ON f.proyecto_id = p.id AND f.activo = TRUE
      LEFT JOIN core.personal per ON per.proyecto_id = p.id AND per.activo = TRUE
      LEFT JOIN core.equipos eq ON eq.proyecto_id = p.id AND eq.activo = TRUE
      WHERE p.tenant_id = $1 AND p.activo = TRUE
    `;
    const params: any[] = [tenantId];

    // Si no es Super-Admin ni Fundador/Dueño de Empresa, filtrar solo los proyectos autorizados
    const esAdminGlobalEmpresa = userRol === 'super_admin' || userRol === 'fundador' || userRol === 'owner' || userRol === 'admin_empresa';

    if (!esAdminGlobalEmpresa && userId) {
      params.push(userId);
      sql += `
        AND (
          p.id = (SELECT proyecto_id FROM core.personal WHERE id::text = $${params.length} OR auth_user_id::text = $${params.length} LIMIT 1)
          OR p.id IN (
            SELECT pp.proyecto_id FROM core.personal_proyectos pp
            JOIN core.personal pers ON pers.id = pp.personal_id
            WHERE pers.id::text = $${params.length} OR pers.auth_user_id::text = $${params.length}
          )
        )
      `;
    }

    sql += `
      GROUP BY p.id
      ORDER BY p.nombre ASC;
    `;
    const result = await dbPool.query(sql, params);
    return result.rows;
  }

  /**
   * Obtener detalle de un proyecto con sus frentes de trabajo
   */
  static async obtenerDetalle(tenantId: string, proyectoId: string) {
    const proyectoRes = await dbPool.query(`
      SELECT p.*
      FROM core.proyectos p
      WHERE p.id = $1 AND p.tenant_id = $2 AND p.activo = TRUE;
    `, [proyectoId, tenantId]);

    if (proyectoRes.rows.length === 0) return null;

    const frentesRes = await dbPool.query(`
      SELECT * FROM core.frentes_trabajo
      WHERE proyecto_id = $1 AND tenant_id = $2 AND activo = TRUE
      ORDER BY codigo ASC;
    `, [proyectoId, tenantId]);

    return {
      ...proyectoRes.rows[0],
      frentes: frentesRes.rows
    };
  }

  /**
   * Crear un nuevo proyecto/faena dentro del tenant
   */
  static async crear(tenantId: string, input: CrearProyectoInput) {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      // Verificar unicidad de código dentro del tenant
      const duplicado = await client.query(
        'SELECT id FROM core.proyectos WHERE tenant_id = $1 AND codigo = $2',
        [tenantId, input.codigo]
      );
      if (duplicado.rows.length > 0) {
        throw new Error(`Ya existe un proyecto con código '${input.codigo}' en esta empresa.`);
      }

      // Insertar proyecto
      const proyectoRes = await client.query(`
        INSERT INTO core.proyectos (tenant_id, codigo, nombre, centro_costo, ubicacion, estado, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `, [
        tenantId,
        input.codigo,
        input.nombre,
        input.centro_costo || null,
        input.ubicacion || null,
        input.estado,
        JSON.stringify(input.metadata)
      ]);
      const proyecto = proyectoRes.rows[0];

      // Crear Frente de Trabajo General por defecto
      await client.query(`
        INSERT INTO core.frentes_trabajo (tenant_id, proyecto_id, codigo, nombre, disciplina)
        VALUES ($1, $2, 'FR-00', 'Frente General', 'GENERAL')
        ON CONFLICT (proyecto_id, codigo) DO NOTHING;
      `, [tenantId, proyecto.id]);

      // Clonar automáticamente las plantillas de roles del tenant a este proyecto
      await client.query('SELECT core.clonar_roles_a_proyecto($1, $2)', [tenantId, proyecto.id]);

      // Registrar en audit log
      await client.query(`
        INSERT INTO core.audit_logs (tenant_id, tabla, registro_id, accion, payload_nuevo, ejecutado_por)
        VALUES ($1, 'core.proyectos', $2, 'INSERT', $3, $4)
      `, [tenantId, proyecto.id, JSON.stringify(proyecto), 'api']);

      await client.query('COMMIT');
      return proyecto;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Editar un proyecto existente del tenant
   */
  static async editar(tenantId: string, proyectoId: string, input: EditarProyectoInput) {
    const updates: string[] = [];
    const params: any[] = [];

    if (input.nombre !== undefined) {
      params.push(input.nombre);
      updates.push(`nombre = $${params.length}`);
    }
    if (input.centro_costo !== undefined) {
      params.push(input.centro_costo);
      updates.push(`centro_costo = $${params.length}`);
    }
    if (input.ubicacion !== undefined) {
      params.push(input.ubicacion);
      updates.push(`ubicacion = $${params.length}`);
    }
    if (input.estado !== undefined) {
      params.push(input.estado);
      updates.push(`estado = $${params.length}`);
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

    params.push(proyectoId);
    params.push(tenantId);

    const sql = `
      UPDATE core.proyectos
      SET ${updates.join(', ')}
      WHERE id = $${params.length - 1} AND tenant_id = $${params.length}
      RETURNING *;
    `;

    const result = await dbPool.query(sql, params);
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  /**
   * Desactivar (soft delete) un proyecto del tenant
   */
  static async desactivar(tenantId: string, proyectoId: string) {
    const result = await dbPool.query(`
      UPDATE core.proyectos SET activo = FALSE
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, codigo, nombre;
    `, [proyectoId, tenantId]);

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  // ═══════════════════════════════════════════════
  // Frentes de Trabajo (sub-recurso de Proyecto)
  // ═══════════════════════════════════════════════

  /**
   * Listar frentes de trabajo de un proyecto
   */
  static async listarFrentes(tenantId: string, proyectoId: string) {
    const result = await dbPool.query(`
      SELECT * FROM core.frentes_trabajo
      WHERE proyecto_id = $1 AND tenant_id = $2 AND activo = TRUE
      ORDER BY codigo ASC;
    `, [proyectoId, tenantId]);
    return result.rows;
  }

  /**
   * Crear un frente de trabajo dentro de un proyecto
   */
  static async crearFrente(tenantId: string, proyectoId: string, input: CrearFrenteInput) {
    // Verificar que el proyecto pertenece al tenant
    const proyectoCheck = await dbPool.query(
      'SELECT id FROM core.proyectos WHERE id = $1 AND tenant_id = $2',
      [proyectoId, tenantId]
    );
    if (proyectoCheck.rows.length === 0) {
      throw new Error('Proyecto no encontrado en esta empresa.');
    }

    const result = await dbPool.query(`
      INSERT INTO core.frentes_trabajo (tenant_id, proyecto_id, codigo, nombre, disciplina, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `, [
      tenantId,
      proyectoId,
      input.codigo,
      input.nombre,
      input.disciplina,
      JSON.stringify(input.metadata)
    ]);

    return result.rows[0];
  }

  /**
   * Desactivar un frente de trabajo
   */
  static async desactivarFrente(tenantId: string, frenteId: string) {
    const result = await dbPool.query(`
      UPDATE core.frentes_trabajo SET activo = FALSE
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, codigo, nombre;
    `, [frenteId, tenantId]);

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }
}
