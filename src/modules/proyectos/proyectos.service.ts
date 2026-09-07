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
        p.id,
        p.tenant_id,
        p.code AS codigo,
        p.name AS nombre,
        p.cost_center AS centro_costo,
        p.location AS ubicacion,
        p.status AS estado,
        p.metadata,
        p.is_active AS activo,
        p.created_at,
        p.updated_at,
        COALESCE(f.total_frentes, 0) AS total_frentes,
        COALESCE(per.total_personal, 0) AS total_personal,
        COALESCE(eq.total_equipos, 0) AS total_equipos
      FROM core.projects p
      LEFT JOIN (
        SELECT project_id, COUNT(*) AS total_frentes 
        FROM core.work_fronts 
        WHERE is_active = TRUE 
        GROUP BY project_id
      ) f ON f.project_id = p.id
      LEFT JOIN (
        SELECT project_id, COUNT(*) AS total_personal 
        FROM core.personnel 
        WHERE is_active = TRUE 
        GROUP BY project_id
      ) per ON per.project_id = p.id
      LEFT JOIN (
        SELECT project_id, COUNT(*) AS total_equipos 
        FROM core.equipment 
        WHERE is_active = TRUE 
        GROUP BY project_id
      ) eq ON eq.project_id = p.id
      WHERE p.tenant_id = $1 AND p.is_active = TRUE
    `;
    const params: any[] = [tenantId];

    // Solo los roles estrictamente operativos de terreno (operario/worker) tienen visión restringida a proyectos asignados
    const esOperario = userRol === 'operario' || userRol === 'worker';

    if (esOperario && userId) {
      params.push(userId);
      sql += `
        AND (
          p.id = (SELECT project_id FROM core.personnel WHERE id::text = $${params.length} OR auth_user_id::text = $${params.length} LIMIT 1)
          OR p.id IN (
            SELECT pp.project_id FROM core.project_personnel pp
            JOIN core.personnel pers ON pers.id = pp.personnel_id
            WHERE pers.id::text = $${params.length} OR pers.auth_user_id::text = $${params.length}
          )
        )
      `;
    }

    sql += ` ORDER BY p.name ASC;`;
    const result = await dbPool.query(sql, params);
    return result.rows;
  }

  /**
   * Obtener detalle de un proyecto con sus frentes de trabajo
   */
  static async obtenerDetalle(tenantId: string, proyectoId: string) {
    const proyectoRes = await dbPool.query(`
      SELECT 
        id, tenant_id, code AS codigo, name AS nombre, cost_center AS centro_costo,
        location AS ubicacion, status AS estado, metadata, is_active AS activo, created_at, updated_at
      FROM core.projects
      WHERE id = $1 AND tenant_id = $2 AND is_active = TRUE;
    `, [proyectoId, tenantId]);

    if (proyectoRes.rows.length === 0) return null;

    const frentesRes = await dbPool.query(`
      SELECT id, code AS codigo, name AS nombre, discipline AS disciplina, is_active AS activo
      FROM core.work_fronts
      WHERE project_id = $1 AND tenant_id = $2 AND is_active = TRUE
      ORDER BY code ASC;
    `, [proyectoId, tenantId]);

    return {
      ...proyectoRes.rows[0],
      frentes: frentesRes.rows
    };
  }

  static async crear(tenantId: string, input: CrearProyectoInput, creadorUserId?: string) {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      const duplicado = await client.query(
        'SELECT id FROM core.proyectos WHERE tenant_id = $1 AND codigo = $2',
        [tenantId, input.codigo]
      );
      if (duplicado.rows.length > 0) {
        throw new Error(`Ya existe un proyecto con código '${input.codigo}' en esta empresa.`);
      }

      const proyectoRes = await client.query(`
        INSERT INTO core.proyectos (tenant_id, codigo, nombre, centro_costo, ubicacion, estado, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
      `, [tenantId, input.codigo, input.nombre, input.centro_costo || null, input.ubicacion || null, input.estado, JSON.stringify(input.metadata)]);
      const proyecto = proyectoRes.rows[0];

      await client.query(`
        INSERT INTO core.work_fronts (tenant_id, project_id, code, name, discipline)
        VALUES ($1, $2, 'FR-00', 'Frente General', 'GENERAL') ON CONFLICT (project_id, code) DO NOTHING;
      `, [tenantId, proyecto.id]);

      // Auto-vincular al creador del proyecto con rol de administrador
      if (creadorUserId) {
        await client.query(`
          INSERT INTO core.project_personnel (project_id, personnel_id, puede_sincronizar, is_active, rol_proyecto)
          SELECT $1, p.id, TRUE, TRUE, 'administrador'
          FROM core.personnel p
          WHERE (p.id::text = $2 OR p.auth_user_id::text = $2) AND p.tenant_id = $3
          ON CONFLICT (project_id, personnel_id) DO NOTHING;
        `, [proyecto.id, creadorUserId, tenantId]);
      }

      await client.query('SELECT core.clonar_roles_a_proyecto($1, $2)', [tenantId, proyecto.id]);

      await client.query(`
        INSERT INTO core.audit_logs (tenant_id, tabla, registro_id, accion, payload_nuevo, ejecutado_por)
        VALUES ($1, 'core.proyectos', $2, 'INSERT', $3, $4)
      `, [tenantId, proyecto.id, JSON.stringify(proyecto), creadorUserId || 'api']);

      await client.query('COMMIT');
      return proyecto;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async editar(tenantId: string, proyectoId: string, input: EditarProyectoInput) {
    const updates: string[] = [];
    const params: any[] = [];

    if (input.nombre !== undefined) { params.push(input.nombre); updates.push(`name = $${params.length}`); }
    if (input.centro_costo !== undefined) { params.push(input.centro_costo); updates.push(`cost_center = $${params.length}`); }
    if (input.ubicacion !== undefined) { params.push(input.ubicacion); updates.push(`location = $${params.length}`); }
    if (input.estado !== undefined) { params.push(input.estado); updates.push(`status = $${params.length}`); }
    if (input.metadata !== undefined) { params.push(JSON.stringify(input.metadata)); updates.push(`metadata = metadata || $${params.length}::jsonb`); }
    if (typeof input.activo === 'boolean') { params.push(input.activo); updates.push(`is_active = $${params.length}`); }

    if (updates.length === 0) throw new Error('No se enviaron campos para actualizar.');

    params.push(proyectoId, tenantId);
    const sql = `UPDATE core.projects SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${params.length - 1} AND tenant_id = $${params.length} RETURNING id, code AS codigo, name AS nombre, location AS ubicacion, cost_center AS centro_costo, status AS estado, metadata, is_active AS activo;`;
    const result = await dbPool.query(sql, params);
    return result.rows[0] || null;
  }

  static async desactivar(tenantId: string, proyectoId: string) {
    const result = await dbPool.query(
      'UPDATE core.projects SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id, code AS codigo, name AS nombre;',
      [proyectoId, tenantId]
    );
    return result.rows[0] || null;
  }

  static async listarFrentes(tenantId: string, proyectoId: string) {
    const result = await dbPool.query(`
      SELECT id, tenant_id, project_id, code, name, discipline, is_active, metadata, created_at, updated_at,
        project_id AS proyecto_id, code AS codigo, name AS nombre, discipline AS disciplina, is_active AS activo
      FROM core.work_fronts WHERE project_id = $1 AND tenant_id = $2 AND is_active = TRUE ORDER BY code ASC;
    `, [proyectoId, tenantId]);
    return result.rows;
  }

  static async crearFrente(tenantId: string, proyectoId: string, input: CrearFrenteInput) {
    const proyectoCheck = await dbPool.query('SELECT id FROM core.proyectos WHERE id = $1 AND tenant_id = $2', [proyectoId, tenantId]);
    if (proyectoCheck.rows.length === 0) throw new Error('Proyecto no encontrado en esta empresa.');

    const result = await dbPool.query(`
      INSERT INTO core.work_fronts (tenant_id, project_id, code, name, discipline, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, tenant_id, project_id, code, name, discipline, is_active, metadata, created_at, updated_at,
        project_id AS proyecto_id, code AS codigo, name AS nombre, discipline AS disciplina, is_active AS activo;
    `, [tenantId, proyectoId, input.codigo, input.nombre, input.disciplina, JSON.stringify(input.metadata)]);

    return result.rows[0];
  }

  static async desactivarFrente(tenantId: string, frenteId: string) {
    const result = await dbPool.query(
      'UPDATE core.work_fronts SET is_active = FALSE WHERE id = $1 AND tenant_id = $2 RETURNING id, code AS codigo, name AS nombre;',
      [frenteId, tenantId]
    );
    return result.rows[0] || null;
  }
}
