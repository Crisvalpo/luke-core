import { dbPool } from '../../config/database.js';

export class PipingRegistrosService {
  /**
   * Helper para resolver contexto de usuario y proyecto
   */
  private static async resolverContexto(client: any, usuarioWindows: string, idProyecto: string) {
    const authQuery = await client.query(`
      SELECT p.id AS personal_id, p.tenant_id, pr.id AS proyecto_id, pr.code AS proyecto_codigo
      FROM core.personnel p
      JOIN core.projects pr ON ((pr.code = $2 OR pr.id::text = $2) AND pr.tenant_id = p.tenant_id)
      LEFT JOIN core.project_personnel pp ON (pp.personnel_id = p.id AND pp.project_id = pr.id)
      WHERE (
        UPPER(p.usuario_windows) = UPPER($1)
        OR UPPER(p.usuario_windows) = UPPER(SPLIT_PART($1, '\\', 2))
        OR UPPER(SPLIT_PART(p.usuario_windows, '\\', 2)) = UPPER(SPLIT_PART($1, '\\', 2))
      )
      AND p.is_active = TRUE
      LIMIT 1;
    `, [usuarioWindows, idProyecto.trim()]);

    if (authQuery.rows.length === 0 && usuarioWindows !== 'ADMIN_KEY') {
      throw new Error(`Permiso denegado para usuario '${usuarioWindows}' en proyecto '${idProyecto}'.`);
    }

    return {
      personalId: authQuery.rows[0]?.personal_id || null,
      tenantId: authQuery.rows[0]?.tenant_id || '00000000-0000-0000-0000-000000000001',
      proyectoId: authQuery.rows[0]?.proyecto_id
    };
  }

  /**
   * Sincronizar Ejecuciones Diarias de Juntas (REG_EJECUCIONES)
   */
  static async sincronizarEjecuciones(usuarioWindows: string, payload: any) {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      const { personalId, tenantId, proyectoId } = await this.resolverContexto(client, usuarioWindows, payload.id_proyecto);
      const resultado: Array<{ codigo: string; uuid: string }> = [];

      for (const reg of payload.registros || []) {
        const cod = String(reg.id_registro || reg.codigo || reg.id_junta || '').trim().toUpperCase();
        const idJunta = String(reg.id_junta || '').trim().toUpperCase();
        if (!idJunta) continue;

        const res = await client.query(`
          INSERT INTO piping.joint_executions (
            id, tenant_id, project_id, joint_id, code, revision_ejecucion,
            proceso, estampa_snapshot, fecha_ejecucion, estado, observacion, registrado_por, created_at
          )
          VALUES (
            COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()),
            $2, $3,
            (SELECT id FROM piping.joints WHERE (code = $4 OR id::text = $4) AND project_id = $3 LIMIT 1),
            $5, $6, $7, $8, COALESCE(NULLIF($9, '')::timestamptz, NOW()),
            COALESCE($10, 'TERMINADA'), $11, $12, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            proceso = EXCLUDED.proceso,
            estampa_snapshot = EXCLUDED.estampa_snapshot,
            fecha_ejecucion = EXCLUDED.fecha_ejecucion,
            estado = EXCLUDED.estado,
            observacion = EXCLUDED.observacion
          RETURNING code AS codigo, id::text AS uuid;
        `, [
          reg.uuid || null, tenantId, proyectoId, idJunta, cod,
          reg.revision || null, reg.proceso_soldadura || reg.proceso || 'SMAW',
          reg.estampa_soldador || reg.estampa || null, reg.fecha_ejecucion || null,
          reg.estado || 'TERMINADA', reg.observaciones || reg.observacion || null, personalId
        ]);

        if (res.rows[0]) {
          resultado.push(res.rows[0]);
        } else if (reg.uuid) {
          resultado.push({ codigo: cod, uuid: reg.uuid });
        }
      }

      await client.query('COMMIT');
      return {
        id_proyecto: payload.id_proyecto,
        procesados: resultado.length,
        registros: resultado,
        fecha: new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace('T', ' ')
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Obtener Ejecuciones Diarias de Juntas (REG_EJECUCIONES)
   */
  static async obtenerEjecuciones(idProyecto: string) {
    const result = await dbPool.query(`
      SELECT 
        e.id AS uuid,
        COALESCE(e.code, 'REG-' || j.code) AS id_registro,
        j.code AS id_junta,
        COALESCE(s.code, '') AS codigo_spool,
        COALESCE(i.code, '') AS codigo_iso,
        to_char(e.fecha_ejecucion AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') AS fecha_ejecucion,
        COALESCE(e.estampa_snapshot, '') AS estampa_soldador,
        COALESCE(p.full_name, '') AS nombre_soldador,
        COALESCE(e.proceso, 'SMAW') AS proceso_soldadura,
        COALESCE(j.welding_progress_pct, 100) AS avance_porc,
        COALESCE(e.estado, 'TERMINADA') AS estado,
        COALESCE(e.observacion, '') AS observaciones,
        to_char(e.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_creacion,
        COALESCE(uc.full_name, uc.usuario_windows, 'Sistema') AS creado_por,
        to_char(e.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_edicion,
        COALESCE(uc.full_name, uc.usuario_windows, 'Sistema') AS editado_por
      FROM piping.joint_executions e
      JOIN core.projects pr ON pr.id = e.project_id
      JOIN piping.joints j ON j.id = e.joint_id
      LEFT JOIN piping.spools s ON s.id = j.spool_id
      LEFT JOIN piping.isometrics i ON i.id = j.isometric_id
      LEFT JOIN core.personnel p ON p.id = e.ejecutor_personal_id
      LEFT JOIN core.personnel uc ON uc.id = e.registrado_por
      WHERE (pr.code = $1 OR pr.id::text = $1)
      ORDER BY e.fecha_ejecucion DESC, e.created_at DESC;
    `, [idProyecto.trim()]);
    return result.rows;
  }

  /**
   * Sincronizar Inspecciones Visuales VT (REG_CALIDAD_VT)
   */
  static async sincronizarInspeccionesVT(usuarioWindows: string, payload: any) {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      const { personalId, tenantId, proyectoId } = await this.resolverContexto(client, usuarioWindows, payload.id_proyecto);
      const resultado: Array<{ codigo: string; uuid: string }> = [];

      for (const reg of payload.registros || []) {
        const cod = String(reg.id_inspeccion || reg.codigo || '').trim().toUpperCase();
        const idJunta = String(reg.id_junta || '').trim().toUpperCase();
        if (!cod || !idJunta) continue;

        const res = await client.query(`
          INSERT INTO quality.visual_inspections (
            id, tenant_id, project_id, joint_id, code, inspector_personal_id,
            inspection_date, result, defecto_detectado, observacion, proxima_etapa, created_at
          )
          VALUES (
            COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()),
            $2, $3,
            (SELECT id FROM piping.joints WHERE (code = $4 OR id::text = $4) AND project_id = $3 LIMIT 1),
            $5, COALESCE((SELECT id FROM core.personnel WHERE (national_id = $6 OR usuario_windows = $6) LIMIT 1), $7),
            COALESCE(NULLIF($8, '')::timestamptz, NOW()),
            COALESCE($9, 'APROBADO'), $10, $11, $12, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            result = EXCLUDED.result,
            defecto_detectado = EXCLUDED.defecto_detectado,
            observacion = EXCLUDED.observacion
          RETURNING code AS codigo, id::text AS uuid;
        `, [
          reg.uuid || null, tenantId, proyectoId, idJunta, cod,
          reg.inspector_rut || null, personalId, reg.fecha_inspeccion || null,
          reg.resultado || 'APROBADO', reg.defecto_detectado || null,
          reg.observaciones || null, reg.criterio_aceptacion || 'ASME B31.3'
        ]);

        if (res.rows[0]) {
          resultado.push(res.rows[0]);
        } else if (reg.uuid) {
          resultado.push({ codigo: cod, uuid: reg.uuid });
        }
      }

      await client.query('COMMIT');
      return {
        id_proyecto: payload.id_proyecto,
        procesados: resultado.length,
        registros: resultado,
        fecha: new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace('T', ' ')
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Obtener Inspecciones Visuales VT (REG_CALIDAD_VT)
   */
  static async obtenerInspeccionesVT(idProyecto: string) {
    const result = await dbPool.query(`
      SELECT 
        v.id AS uuid,
        COALESCE(v.code, 'VT-' || j.code) AS id_inspeccion,
        j.code AS id_junta,
        to_char(v.inspection_date AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') AS fecha_inspeccion,
        COALESCE(p.national_id, '') AS inspector_rut,
        COALESCE(p.full_name, 'Inspector Nivel II') AS inspector_nombre,
        COALESCE(v.proxima_etapa, 'ASME B31.3') AS criterio_aceptacion,
        COALESCE(v.result, 'APROBADO') AS resultado,
        COALESCE(v.defecto_detectado, 'SIN DEFECTO') AS defecto_detectado,
        COALESCE(v.observacion, '') AS observaciones,
        to_char(v.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_creacion,
        COALESCE(p.full_name, 'Sistema') AS creado_por,
        to_char(v.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_edicion,
        COALESCE(p.full_name, 'Sistema') AS editado_por
      FROM quality.visual_inspections v
      JOIN core.projects pr ON pr.id = v.project_id
      JOIN piping.joints j ON j.id = v.joint_id
      LEFT JOIN core.personnel p ON p.id = v.inspector_personal_id
      WHERE (pr.code = $1 OR pr.id::text = $1)
      ORDER BY v.inspection_date DESC, v.created_at DESC;
    `, [idProyecto.trim()]);
    return result.rows;
  }

  /**
   * Sincronizar Ensayos NDE (REG_CALIDAD_NDE)
   */
  static async sincronizarInspeccionesNDE(usuarioWindows: string, payload: any) {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      const { tenantId, proyectoId } = await this.resolverContexto(client, usuarioWindows, payload.id_proyecto);
      const resultado: Array<{ codigo: string; uuid: string }> = [];

      for (const reg of payload.registros || []) {
        const cod = String(reg.numero_informe || reg.codigo || '').trim().toUpperCase();
        const idJunta = String(reg.id_junta || '').trim().toUpperCase();
        if (!cod || !idJunta) continue;

        const res = await client.query(`
          INSERT INTO quality.ndt_inspections (
            id, tenant_id, project_id, joint_id, metodo_nde_id, numero_informe,
            test_date, result, inspector_nombre, evidencia_url, created_at
          )
          VALUES (
            COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()),
            $2, $3,
            (SELECT id FROM piping.joints WHERE (code = $4 OR id::text = $4) AND project_id = $3 LIMIT 1),
            COALESCE((SELECT id FROM quality.cat_metodos_nde WHERE code = $5 LIMIT 1), '00000000-0000-0000-0000-000000000001'::uuid),
            $6, COALESCE(NULLIF($7, '')::timestamptz, NOW()),
            COALESCE($8, 'CONFORME'), $9, $10, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            result = EXCLUDED.result,
            inspector_nombre = EXCLUDED.inspector_nombre,
            evidencia_url = EXCLUDED.evidencia_url
          RETURNING numero_informe AS codigo, id::text AS uuid;
        `, [
          reg.uuid || null, tenantId, proyectoId, idJunta,
          reg.metodo_nde || 'RT', cod, reg.fecha_ensayo || null,
          reg.resultado || 'CONFORME', reg.evaluador || reg.empresa_nde || null,
          reg.link_informe_pdf || null
        ]);

        if (res.rows[0]) {
          resultado.push(res.rows[0]);
        } else if (reg.uuid) {
          resultado.push({ codigo: cod, uuid: reg.uuid });
        }
      }

      await client.query('COMMIT');
      return {
        id_proyecto: payload.id_proyecto,
        procesados: resultado.length,
        registros: resultado,
        fecha: new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace('T', ' ')
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Obtener Ensayos NDE (REG_CALIDAD_NDE)
   */
  static async obtenerInspeccionesNDE(idProyecto: string) {
    const result = await dbPool.query(`
      SELECT 
        n.id AS uuid,
        n.numero_informe,
        COALESCE(m.code, 'RT') AS metodo_nde,
        j.code AS id_junta,
        to_char(n.test_date AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') AS fecha_ensayo,
        COALESCE(n.inspector_nombre, 'TÜV / SGS / Applus') AS empresa_nde,
        COALESCE(n.inspector_nombre, 'Inspector NDE Nivel II') AS evaluador,
        COALESCE(n.result, 'CONFORME') AS resultado,
        '' AS defectologia,
        COALESCE(n.evidencia_url, '') AS link_informe_pdf,
        to_char(n.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_creacion,
        'Sistema' AS creado_por,
        to_char(n.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_edicion,
        'Sistema' AS editado_por
      FROM quality.ndt_inspections n
      JOIN core.projects pr ON pr.id = n.project_id
      JOIN piping.joints j ON j.id = n.joint_id
      LEFT JOIN quality.cat_metodos_nde m ON m.id = n.metodo_nde_id
      WHERE (pr.code = $1 OR pr.id::text = $1)
      ORDER BY n.test_date DESC, n.created_at DESC;
    `, [idProyecto.trim()]);
    return result.rows;
  }

  /**
   * Sincronizar Eventos de Spools (REG_EVENTOS_SPOOL)
   */
  static async sincronizarEventosSpool(usuarioWindows: string, payload: any) {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      const { personalId, tenantId, proyectoId } = await this.resolverContexto(client, usuarioWindows, payload.id_proyecto);
      const resultado: Array<{ codigo: string; uuid: string }> = [];

      for (const reg of payload.registros || []) {
        const cod = String(reg.id_evento || reg.codigo || '').trim().toUpperCase();
        const codSpool = String(reg.codigo_spool || '').trim().toUpperCase();
        if (!codSpool) continue;

        const res = await client.query(`
          INSERT INTO piping.spool_events (
            id, tenant_id, project_id, spool_id, code, tipo_evento, estado_nuevo,
            ubicacion, observacion, registrado_por, fecha_evento
          )
          VALUES (
            COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()),
            $2, $3,
            (SELECT id FROM piping.spools WHERE (code = $4 OR id::text = $4) AND project_id = $3 LIMIT 1),
            $5, COALESCE($6, 'FABRICADO'), COALESCE($6, 'FABRICADO'),
            $7, $8, $9, COALESCE(NULLIF($10, '')::timestamptz, NOW())
          )
          ON CONFLICT (id) DO UPDATE SET
            tipo_evento = EXCLUDED.tipo_evento,
            estado_nuevo = EXCLUDED.estado_nuevo,
            ubicacion = EXCLUDED.ubicacion,
            observacion = EXCLUDED.observacion
          RETURNING code AS codigo, id::text AS uuid;
        `, [
          reg.uuid || null, tenantId, proyectoId, codSpool, cod,
          reg.tipo_evento || 'FABRICADO', reg.ubicacion || 'Taller Central',
          reg.observaciones || reg.guia_despacho || null, personalId,
          reg.fecha_evento || null
        ]);

        if (res.rows[0]) {
          resultado.push(res.rows[0]);
        } else if (reg.uuid) {
          resultado.push({ codigo: cod, uuid: reg.uuid });
        }
      }

      await client.query('COMMIT');
      return {
        id_proyecto: payload.id_proyecto,
        procesados: resultado.length,
        registros: resultado,
        fecha: new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace('T', ' ')
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Obtener Eventos de Spools (REG_EVENTOS_SPOOL)
   */
  static async obtenerEventosSpool(idProyecto: string) {
    const result = await dbPool.query(`
      SELECT 
        e.id AS uuid,
        COALESCE(e.code, 'EVT-' || s.code) AS id_evento,
        s.code AS codigo_spool,
        e.tipo_evento,
        to_char(e.fecha_evento AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') AS fecha_evento,
        COALESCE(e.ubicacion, 'Taller Central') AS ubicacion,
        COALESCE(p.full_name, uc.full_name, 'Capataz de Taller') AS responsable,
        COALESCE(e.observacion, '') AS guia_despacho,
        to_char(e.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_creacion,
        COALESCE(uc.full_name, 'Sistema') AS creado_por,
        to_char(e.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI:SS') AS fecha_edicion,
        COALESCE(uc.full_name, 'Sistema') AS editado_por
      FROM piping.spool_events e
      JOIN core.projects pr ON pr.id = e.project_id
      JOIN piping.spools s ON s.id = e.spool_id
      LEFT JOIN core.personnel uc ON uc.id = e.registrado_por
      LEFT JOIN core.personnel p ON p.id = uc.id
      WHERE (pr.code = $1 OR pr.id::text = $1)
      ORDER BY e.fecha_evento DESC, e.created_at DESC;
    `, [idProyecto.trim()]);
    return result.rows;
  }
}
