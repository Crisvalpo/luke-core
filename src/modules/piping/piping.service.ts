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
        j.codigo AS id_junta,
        COALESCE(s.codigo, '') AS codigo_spool,
        COALESCE(i.codigo, '') AS codigo_iso,
        COALESCE(j.numero_junta, '') AS tag,
        j.sistema,
        j.sub_sistema,
        j.test_pack,
        j.tipo_union_codigo AS tipo_union,
        j.destination,
        j.nps_codigo AS nps,
        j.sch,
        j.clase,
        j.material,
        j.metros,
        j.servicio,
        j.estado_actual AS estado,
        j.observaciones,
        j.vigente,
        to_char(j.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_creacion,
        COALESCE(uc.nombre_completo, uc.usuario_windows, 'Sistema') AS creado_por,
        to_char(j.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_sync,
        COALESCE(uu.nombre_completo, uu.usuario_windows, 'Sistema') AS editado_por
      FROM piping.juntas j
      JOIN core.proyectos pr ON pr.id = j.proyecto_id
      LEFT JOIN piping.spools s ON s.id = j.spool_id
      LEFT JOIN piping.isometricos i ON i.id = j.isometrico_id
      LEFT JOIN core.personal uc ON uc.id = j.created_by
      LEFT JOIN core.personal uu ON uu.id = j.updated_by
      WHERE (pr.codigo = $1 OR pr.id::text = $1)
      ORDER BY j.codigo ASC;
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
   * Obtiene la lista completa de Líneas con auditoría (17 columnas + auditoría)
   */
  static async obtenerLineasProyecto(idProyecto: string) {
    const result = await dbPool.query(`
      SELECT 
        l.id AS uuid,
        l.codigo AS codigo_linea,
        c.codigo AS clase,
        l.nps_codigo AS nps,
        f.codigo AS servicio,
        l.material,
        l.plano_codelco,
        l.metros,
        l.origen,
        l.destino,
        l.temperatura_diseno AS temp_diseno,
        l.presion_diseno,
        l.tipo_prueba,
        l.esquema_pintura,
        l.ral,
        l.revestimiento_interior,
        l.aislacion,
        l.observaciones,
        l.vigente,
        to_char(l.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_creacion,
        COALESCE(uc.nombre_completo, uc.usuario_windows, 'Sistema') AS creado_por,
        to_char(l.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_sync,
        COALESCE(uu.nombre_completo, uu.usuario_windows, 'Sistema') AS editado_por
      FROM piping.lineas l
      JOIN core.proyectos pr ON pr.id = l.proyecto_id
      LEFT JOIN piping.cat_fluidos_proyecto f ON f.id = l.fluido_proyecto_id
      LEFT JOIN piping.cat_clases_proyecto c ON c.id = l.clase_proyecto_id
      LEFT JOIN core.personal uc ON uc.id = l.created_by
      LEFT JOIN core.personal uu ON uu.id = l.updated_by
      WHERE (pr.codigo = $1 OR pr.id::text = $1)
      ORDER BY l.codigo ASC;
    `, [idProyecto.trim()]);
    return result.rows;
  }

  /**
   * Obtiene la lista completa de Isométricos con atributos de faena y auditoría
   */
  static async obtenerIsometricosProyecto(idProyecto: string) {
    const result = await dbPool.query(`
      SELECT 
        i.id AS uuid,
        i.codigo AS codigo_iso,
        COALESCE(l.codigo, '') AS codigo_linea,
        i.hoja,
        i.revision_vigente AS revision,
        i.plano_contratista,
        i.plano_codelco,
        i.clase,
        i.nps,
        i.empresa_ingenieria AS ingenieria,
        i.condicion,
        i.spooleado,
        i.estado_documental AS estado,
        i.distribuido,
        i.observacion AS observaciones,
        i.vigente,
        to_char(i.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_creacion,
        COALESCE(uc.nombre_completo, uc.usuario_windows, 'Sistema') AS creado_por,
        to_char(i.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_sync,
        COALESCE(uu.nombre_completo, uu.usuario_windows, 'Sistema') AS editado_por
      FROM piping.isometricos i
      JOIN core.proyectos pr ON pr.id = i.proyecto_id
      LEFT JOIN piping.lineas l ON l.id = i.linea_id
      LEFT JOIN core.personal uc ON uc.id = i.created_by
      LEFT JOIN core.personal uu ON uu.id = i.updated_by
      WHERE (pr.codigo = $1 OR pr.id::text = $1)
      ORDER BY i.codigo ASC, i.hoja ASC;
    `, [idProyecto.trim()]);
    return result.rows;
  }

  /**
   * Obtiene la lista completa de Spools con atributos de faena y auditoría
   */
  static async obtenerSpoolsProyecto(idProyecto: string) {
    const result = await dbPool.query(`
      SELECT 
        s.id AS uuid,
        s.codigo AS codigo_spool,
        COALESCE(i.codigo, '') AS codigo_iso,
        s.tag_gestion,
        s.sistema,
        s.sub_sistema,
        s.area,
        s.codigo_linea,
        s.spool_numero,
        s.nps,
        s.material,
        s.servicio,
        s.proceso,
        s.ubicacion_actual AS ubicacion,
        s.observaciones,
        s.vigente,
        to_char(s.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_creacion,
        COALESCE(uc.nombre_completo, uc.usuario_windows, 'Sistema') AS creado_por,
        to_char(s.updated_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_sync,
        COALESCE(uu.nombre_completo, uu.usuario_windows, 'Sistema') AS editado_por
      FROM piping.spools s
      JOIN core.proyectos pr ON pr.id = s.proyecto_id
      LEFT JOIN piping.isometricos i ON i.id = s.isometrico_id
      LEFT JOIN core.personal uc ON uc.id = s.created_by
      LEFT JOIN core.personal uu ON uu.id = s.updated_by
      WHERE (pr.codigo = $1 OR pr.id::text = $1)
      ORDER BY s.codigo ASC;
    `, [idProyecto.trim()]);
    return result.rows;
  }
}
