import { dbPool } from '../../config/database.js';
import { PayloadSyncJuntasInput } from './piping.schema.js';

export interface JuntaSincronizadaOutput {
  id_junta: string;
  uuid: string;
}

export interface RespuestaSincronizacionJuntas {
  id_proyecto: string;
  procesados: number;
  registros: JuntaSincronizadaOutput[];
  fecha?: string;
}

export class PipingService {
  /**
   * Sincronización atómica de lista de juntas desde Excel Sync v1.0
   * Realiza validación de identidad (JWT vs Payload), chequeo de permisos en proyecto y Upsert en piping.lista_juntas.
   */
  static async sincronizarJuntas(
    usuarioWindowsJwt: string,
    payload: PayloadSyncJuntasInput
  ): Promise<RespuestaSincronizacionJuntas> {
    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      const idProyecto = payload.id_proyecto.trim();
      const registros = payload.registros;

      // 1. Validar identidad: Comparar JWT.sub con body.usuario_windows si fue provisto
      if (payload.usuario_windows) {
        const bodyUserNorm = payload.usuario_windows.trim().toUpperCase();
        const jwtUserNorm = usuarioWindowsJwt.trim().toUpperCase();
        const bodySoloUser = bodyUserNorm.includes('\\') ? bodyUserNorm.split('\\')[1] : bodyUserNorm;
        const jwtSoloUser = jwtUserNorm.includes('\\') ? jwtUserNorm.split('\\')[1] : jwtUserNorm;

        if (bodySoloUser !== jwtSoloUser && bodyUserNorm !== jwtUserNorm && jwtUserNorm !== 'ADMIN_KEY') {
          throw new Error(`Inconsistencia de identidad: El usuario en el cuerpo (${payload.usuario_windows}) no coincide con el token autenticado (${usuarioWindowsJwt}).`);
        }
      }

      // 2. Validar autorización de usuario en el proyecto (core.personal + core.personal_proyectos)
      if (usuarioWindowsJwt !== 'ADMIN_KEY') {
        const authUserQuery = await client.query(`
          SELECT 
            p.id AS personal_id, 
            p.tenant_id, 
            p.nombre_completo,
            pr.id AS proyecto_id,
            pr.codigo AS proyecto_codigo
          FROM core.personal p
          JOIN core.proyectos pr ON (
            (pr.codigo = $2 OR pr.id::text = $2)
            AND pr.tenant_id = p.tenant_id
          )
          LEFT JOIN core.personal_proyectos pp ON (
            pp.personal_id = p.id AND pp.proyecto_id = pr.id
          )
          WHERE (
            UPPER(p.usuario_windows) = UPPER($1)
            OR UPPER(p.usuario_windows) = UPPER(SPLIT_PART($1, '\\', 2))
            OR UPPER(SPLIT_PART(p.usuario_windows, '\\', 2)) = UPPER(SPLIT_PART($1, '\\', 2))
          )
          AND p.activo = TRUE
          AND (p.puede_sincronizar_excel IS TRUE OR p.puede_sincronizar_excel IS NULL)
          AND (
            p.proyecto_id = pr.id 
            OR pp.puede_sincronizar IS TRUE 
            OR p.rol_organizacional = 'super_admin'
            OR p.rol_organizacional = 'admin'
          )
          LIMIT 1;
        `, [usuarioWindowsJwt, idProyecto]);

        if (authUserQuery.rows.length === 0) {
          throw new Error(`Permiso denegado: El usuario '${usuarioWindowsJwt}' no está autorizado para sincronizar datos en el proyecto '${idProyecto}'.`);
        }
      }

      const resultadoJuntas: JuntaSincronizadaOutput[] = [];

      // 3. Ejecutar Upsert masivo en el esquema dedicado: piping.lista_juntas
      for (const junta of registros) {
        const res = await client.query(`
          INSERT INTO piping.lista_juntas (
            uuid, id_proyecto, id_junta, tag, estado, vigente, fecha_sync, updated_at
          )
          VALUES (
            COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()),
            $2, $3, $4, $5, TRUE, NOW(), NOW()
          )
          ON CONFLICT (id_proyecto, id_junta) DO UPDATE SET
            tag = EXCLUDED.tag,
            estado = EXCLUDED.estado,
            vigente = TRUE,
            fecha_sync = NOW(),
            updated_at = NOW()
          WHERE (
            piping.lista_juntas.tag,
            piping.lista_juntas.estado,
            piping.lista_juntas.vigente
          ) IS DISTINCT FROM (
            EXCLUDED.tag,
            EXCLUDED.estado,
            TRUE
          )
          RETURNING id_junta, uuid::text;
        `, [
          junta.uuid || null,
          idProyecto,
          junta.id_junta,
          junta.tag || null,
          junta.estado || 'ACTIVO'
        ]);

        if (res.rows[0]) {
          resultadoJuntas.push({
            id_junta: res.rows[0].id_junta,
            uuid: res.rows[0].uuid
          });
        } else if (junta.uuid) {
          resultadoJuntas.push({
            id_junta: junta.id_junta,
            uuid: junta.uuid
          });
        }
      }

      // 4. Registrar en la tabla de auditoría (core.audit_sync)
      await client.query(`
        INSERT INTO core.audit_sync (
          usuario_windows, proyecto_id, tabla, registros, detalles, fecha
        )
        VALUES ($1, $2, $3, $4, $5, NOW());
      `, [
        usuarioWindowsJwt,
        idProyecto,
        'piping.lista_juntas',
        registros.length,
        JSON.stringify({
          total: registros.length,
          timestamp: new Date().toISOString()
        })
      ]);

      await client.query('COMMIT');

      const fechaChile = new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace('T', ' ');

      return {
        id_proyecto: idProyecto,
        procesados: resultadoJuntas.length,
        registros: resultadoJuntas,
        fecha: fechaChile
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene el historial de auditoría de sincronizaciones
   */
  static async obtenerAuditoria(limite: number = 50) {
    const result = await dbPool.query(`
      SELECT id, usuario_windows, proyecto_id, tabla, registros, fecha
      FROM core.audit_sync
      ORDER BY fecha DESC
      LIMIT $1;
    `, [limite]);

    return result.rows;
  }

  /**
   * Obtiene la lista completa de juntas vigentes de un proyecto (Para Actualizar Planilla)
   */
  static async obtenerJuntasProyecto(idProyecto: string) {
    const proyNorm = idProyecto.trim();
    const result = await dbPool.query(`
      SELECT 
        j.id AS uuid,
        j.code AS id_junta,
        COALESCE(s.code, '') AS codigo_spool,
        COALESCE(i.code, '') AS codigo_iso,
        COALESCE(j.joint_no, '') AS tag,
        j.system AS sistema,
        j.sub_system AS sub_sistema,
        j.test_pack,
        j.joint_type_code AS tipo_union,
        j.destination,
        j.nps_code AS nps,
        j.sch,
        j.pipe_class AS clase,
        j.material,
        j.length_meters AS metros,
        j.service AS servicio,
        j.current_status AS estado,
        j.remarks AS observaciones,
        j.is_current AS vigente,
        to_char(j.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_creacion,
        COALESCE(uc.full_name, uc.usuario_windows, 'Sistema') AS creado_por,
        to_char(j.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_edicion,
        to_char(j.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_sync,
        COALESCE(uu.full_name, uu.usuario_windows, 'Sistema') AS editado_por
      FROM piping.joints j
      JOIN core.projects pr ON pr.id = j.project_id
      LEFT JOIN piping.spools s ON s.id = j.spool_id
      LEFT JOIN piping.isometrics i ON i.id = j.isometric_id
      LEFT JOIN core.personnel uc ON uc.id = j.created_by
      LEFT JOIN core.personnel uu ON uu.id = j.updated_by
      WHERE (pr.code = $1 OR pr.id::text = $1)
      ORDER BY j.code ASC;
    `, [proyNorm]);

    return result.rows;
  }

  /**
   * Obtiene la lista de P&IDs de un proyecto con auditoría completa
   */
  static async obtenerPidProyecto(idProyecto: string) {
    const result = await dbPool.query(`
      SELECT 
        p.id AS uuid,
        p.codigo AS codigo_pid,
        p.titulo,
        p.revision_vigente AS revision,
        p.estado_documental AS estado,
        p.metadata->>'archivo_pdf' AS archivo_pdf,
        COALESCE(p.metadata->>'responsable', uc.nombre_completo, 'Sistema') AS responsable,
        p.vigente,
        to_char(p.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_creacion,
        COALESCE(uc.nombre_completo, uc.usuario_windows, 'Sistema') AS creado_por,
        to_char(p.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_edicion,
        to_char(p.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_sync,
        COALESCE(uu.nombre_completo, uu.usuario_windows, 'Sistema') AS editado_por
      FROM piping.pid p
      JOIN core.proyectos pr ON pr.id = p.proyecto_id
      LEFT JOIN core.personal uc ON uc.id = p.created_by
      LEFT JOIN core.personal uu ON uu.id = p.updated_by
      WHERE (pr.codigo = $1 OR pr.id::text = $1)
      ORDER BY p.codigo ASC;
    `, [idProyecto.trim()]);
    return result.rows;
  }

  /**
   * Obtiene la lista completa de Líneas con auditoría y variables de diseño (Sin AWP)
   */
  static async obtenerLineasProyecto(idProyecto: string) {
    const result = await dbPool.query(`
      SELECT 
        l.id AS uuid,
        l.code AS line_tag,
        l.code AS codigo_linea,
        COALESCE(l.service_code, '') AS service_code,
        COALESCE(l.nps_code, '') AS nominal_size,
        COALESCE(l.pipe_class, '') AS piping_class,
        COALESCE(l.material, '') AS material_base,
        COALESCE(l.pid_reference, '') AS pid_reference,
        COALESCE(l.system, '') AS sistema,
        COALESCE(l.sub_system, '') AS sub_sistema,
        COALESCE(l.origin_point, l.origin, '') AS origin_point,
        COALESCE(l.destination_point, l.destination, '') AS destination_point,
        COALESCE(l.route_description, l.remarks, '') AS route_description,
        COALESCE(l.length_meters, 0) AS total_length,
        COALESCE(l.design_pressure_bar, l.design_pressure, 0) AS design_pressure,
        COALESCE(l.design_temperature, 0) AS design_temp,
        COALESCE(l.test_pressure_bar, 0) AS test_pressure,
        COALESCE(l.operating_pressure_normal, '') AS operating_pressure_normal,
        COALESCE(l.operating_temp_normal, '') AS operating_temp_normal,
        COALESCE(l.painting_spec, '') AS painting_spec,
        COALESCE(l.internal_coating, '') AS internal_lining,
        COALESCE(l.insulation, '') AS insulation_spec,
        COALESCE(l.heat_tracing, '') AS tracing_spec,
        COALESCE(l.ndt_level, '') AS ndt_level,
        COALESCE(l.pwht_required, FALSE) AS pwht_required,
        COALESCE(l.status, 'VIGENTE') AS line_status,
        COALESCE(l.data_source, '') AS data_source,
        l.is_current AS vigente,
        to_char(l.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_creacion,
        COALESCE(uc.full_name, uc.usuario_windows, 'Sistema') AS creado_por,
        to_char(l.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_edicion,
        to_char(l.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_sync,
        COALESCE(uu.full_name, uu.usuario_windows, 'Sistema') AS editado_por
      FROM piping.lines l
      JOIN core.projects pr ON pr.id = l.project_id
      LEFT JOIN core.personnel uc ON uc.id = l.created_by
      LEFT JOIN core.personnel uu ON uu.id = l.updated_by
      WHERE (pr.code = $1 OR pr.id::text = $1)
      ORDER BY l.code ASC;
    `, [idProyecto.trim()]);
    return result.rows;
  }

  /**
   * Obtiene la lista completa de Isométricos con atributos de plano y enlace documental
   */
  static async obtenerIsometricosProyecto(idProyecto: string) {
    const result = await dbPool.query(`
      SELECT 
        i.id AS uuid,
        i.code AS iso_tag,
        i.code AS codigo_iso,
        COALESCE(l.code, i.line_code, '') AS line_tag,
        COALESCE(l.code, i.line_code, '') AS codigo_linea,
        i.sheet_no,
        COALESCE(i.current_revision, '0') AS current_revision,
        COALESCE(i.current_revision, '0') AS revision,
        COALESCE(i.client_drawing_no, '') AS client_drawing_no,
        COALESCE(i.contractor_drawing_no, '') AS contractor_drawing_no,
        COALESCE(i.engineering_company, '') AS engineering_company,
        COALESCE(i.line_segment, 'PR') AS line_segment,
        COALESCE(i.condition, 'PREFABRICADO EN TALLER') AS condition,
        COALESCE(i.spooling_status, 'SPOOLEADO') AS spooling_status,
        COALESCE(i.distribution_status, 'EMITIDO_IFC') AS distribution_status,
        COALESCE(i.test_pack_id, '') AS test_pack_id,
        COALESCE(i.status, 'VIGENTE') AS iso_status,
        COALESCE(i.status, 'VIGENTE') AS estado,
        COALESCE(i.remarks, '') AS remarks,
        COALESCE(i.document_url, '') AS document_url,
        i.is_current AS vigente,
        to_char(i.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_creacion,
        COALESCE(uc.full_name, uc.usuario_windows, 'Sistema') AS creado_por,
        to_char(i.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_edicion,
        to_char(i.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_sync,
        COALESCE(uu.full_name, uu.usuario_windows, 'Sistema') AS editado_por
      FROM piping.isometrics i
      JOIN core.projects pr ON pr.id = i.project_id
      LEFT JOIN piping.lines l ON l.id = i.line_id
      LEFT JOIN core.personnel uc ON uc.id = i.created_by
      LEFT JOIN core.personnel uu ON uu.id = i.updated_by
      WHERE (pr.code = $1 OR pr.id::text = $1)
      ORDER BY i.code ASC, i.sheet_no ASC;
    `, [idProyecto.trim()]);
    return result.rows;
  }

  /**
   * Obtiene la lista completa de Spools con AWP (CWA/CWP/IWP) y trazabilidad de taller
   */
  static async obtenerSpoolsProyecto(idProyecto: string) {
    const result = await dbPool.query(`
      SELECT 
        s.id AS uuid,
        s.code AS spool_tag,
        s.code AS codigo_spool,
        COALESCE(i.code, s.iso_code, '') AS iso_tag,
        COALESCE(i.code, s.iso_code, '') AS codigo_iso,
        COALESCE(s.spool_no, '') AS spool_no,
        COALESCE(s.cwa, '') AS cwa,
        COALESCE(s.cwp, '') AS cwp,
        COALESCE(s.iwp, '') AS iwp,
        COALESCE(s.spool_type, 'FIGURADO') AS spool_type,
        COALESCE(s.weight_kg, 0) AS weight_kg,
        COALESCE(s.length_meters, 0) AS length_meters,
        COALESCE(s.current_location, s.ubicacion_actual, 'TALLER MAESTRANZA') AS current_location,
        COALESCE(s.current_stage, s.estado_actual, 'PREFABRICADO') AS current_stage,
        COALESCE(s.status, 'ACTIVO') AS spool_status,
        COALESCE(s.remarks, '') AS remarks,
        s.is_current AS vigente,
        to_char(s.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_creacion,
        COALESCE(uc.full_name, uc.usuario_windows, 'Sistema') AS creado_por,
        to_char(s.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_edicion,
        to_char(s.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_sync,
        COALESCE(uu.full_name, uu.usuario_windows, 'Sistema') AS editado_por
      FROM piping.spools s
      JOIN core.projects pr ON pr.id = s.project_id
      LEFT JOIN piping.isometrics i ON i.id = s.isometric_id
      LEFT JOIN core.personnel uc ON uc.id = s.created_by
      LEFT JOIN core.personnel uu ON uu.id = s.updated_by
      WHERE (pr.code = $1 OR pr.id::text = $1)
      ORDER BY s.code ASC;
    `, [idProyecto.trim()]);
    return result.rows;
  }

  /**
   * Obtiene la lista completa de Válvulas de piping con atributos MTO y auditoría
   */
  static async obtenerValvulasProyecto(idProyecto: string) {
    const result = await dbPool.query(`
      SELECT 
        v.id AS uuid,
        v.codigo AS codigo_valvula,
        v.id_mto,
        COALESCE(l.codigo, v.codigo_linea, '') AS codigo_linea,
        v.clase,
        v.tag_piping,
        v.tag_instrumentacion,
        v.diametro_nps AS nps,
        v.cantidad,
        v.descripcion,
        v.correlativo_maqueta,
        v.numero_aconex,
        v.diagrama,
        v.estado_actual AS estado,
        v.vigente,
        to_char(v.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_creacion,
        COALESCE(uc.nombre_completo, uc.usuario_windows, 'Sistema') AS creado_por,
        to_char(v.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_edicion,
        to_char(v.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_sync,
        COALESCE(uu.nombre_completo, uu.usuario_windows, 'Sistema') AS editado_por
      FROM piping.valvulas v
      JOIN core.proyectos pr ON pr.id = v.proyecto_id
      LEFT JOIN piping.lineas l ON l.id = v.linea_id
      LEFT JOIN core.personal uc ON uc.id = v.created_by
      LEFT JOIN core.personal uu ON uu.id = v.updated_by
      WHERE (pr.codigo = $1 OR pr.id::text = $1)
      ORDER BY v.codigo ASC;
    `, [idProyecto.trim()]);
    return result.rows;
  }

  /**
   * Obtiene la lista completa de Soportes de piping con empaquetamiento AWP y auditoría
   */
  static async obtenerSoportesProyecto(idProyecto: string) {
    const result = await dbPool.query(`
      SELECT 
        s.id AS uuid,
        s.codigo AS codigo_soporte,
        s.item_numero,
        s.cwa,
        s.cwp,
        s.ewp,
        s.pwp,
        COALESCE(l.codigo, s.codigo_linea, '') AS codigo_linea,
        COALESCE(s.codigo_iso, '') AS codigo_iso,
        s.clase,
        s.tipo_soporte,
        s.diametro_nps AS nps,
        s.cantidad,
        s.unidad,
        s.peso_kg,
        s.suministro,
        s.estado_actual AS estado,
        s.observaciones,
        s.vigente,
        to_char(s.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_creacion,
        COALESCE(uc.nombre_completo, uc.usuario_windows, 'Sistema') AS creado_por,
        to_char(s.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_edicion,
        to_char(s.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_sync,
        COALESCE(uu.nombre_completo, uu.usuario_windows, 'Sistema') AS editado_por
      FROM piping.soportes s
      JOIN core.proyectos pr ON pr.id = s.proyecto_id
      LEFT JOIN piping.lineas l ON l.id = s.linea_id
      LEFT JOIN core.personal uc ON uc.id = s.created_by
      LEFT JOIN core.personal uu ON uu.id = s.updated_by
      WHERE (pr.codigo = $1 OR pr.id::text = $1)
      ORDER BY s.codigo ASC;
    `, [idProyecto.trim()]);
    return result.rows;
  }

  /**
   * Obtiene la lista completa de MTO (Material Take-Off) con compras, bodega y AWP
   */
  static async obtenerMtoProyecto(idProyecto: string) {
    const result = await dbPool.query(`
      SELECT 
        m.id AS uuid,
        m.codigo AS codigo_mto,
        m.item_numero,
        m.cwa,
        m.cwp,
        m.ewp,
        m.pwp,
        COALESCE(l.codigo, m.codigo_linea, '') AS codigo_linea,
        COALESCE(i.codigo, m.codigo_iso, '') AS codigo_iso,
        COALESCE(s.codigo, m.codigo_spool, '') AS codigo_spool,
        m.clase,
        m.grupo_material,
        m.descripcion,
        m.diametro_nps AS nps,
        m.cantidad,
        m.unidad,
        m.peso_kg,
        m.suministro,
        m.proveedor,
        m.orden_compra,
        m.recepcionado,
        m.solicitado,
        m.despachado,
        m.cantidad_real,
        m.ubicacion_actual,
        m.estado_material,
        m.prioridad_fab,
        m.observaciones,
        m.estado_actual AS estado,
        m.vigente,
        to_char(m.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_creacion,
        COALESCE(uc.nombre_completo, uc.usuario_windows, 'Sistema') AS creado_por,
        to_char(m.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_edicion,
        to_char(m.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_sync,
        COALESCE(uu.nombre_completo, uu.usuario_windows, 'Sistema') AS editado_por
      FROM piping.mto m
      JOIN core.proyectos pr ON pr.id = m.proyecto_id
      LEFT JOIN piping.lineas l ON l.id = m.linea_id
      LEFT JOIN piping.isometricos i ON i.id = m.isometrico_id
      LEFT JOIN piping.spools s ON s.id = m.spool_id
      LEFT JOIN core.personal uc ON uc.id = m.created_by
      LEFT JOIN core.personal uu ON uu.id = m.updated_by
      WHERE (pr.codigo = $1 OR pr.id::text = $1)
      ORDER BY m.codigo ASC;
    `, [idProyecto.trim()]);
    return result.rows;
  }
}
