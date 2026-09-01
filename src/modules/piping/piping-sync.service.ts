import { dbPool } from '../../config/database.js';

export interface SincronizacionOutput {
  id_proyecto: string;
  procesados: number;
  registros: Array<{ codigo: string; uuid: string }>;
  fecha?: string;
}

export class PipingSyncService {
  /**
   * Helper para validar acceso del usuario y resolver ID/Tenant del proyecto
   */
  private static async resolverProyecto(client: any, usuarioWindows: string, idProyecto: string) {
    const authQuery = await client.query(`
      SELECT p.id AS personal_id, p.tenant_id, pr.id AS proyecto_id, pr.codigo AS proyecto_codigo
      FROM core.personal p
      JOIN core.proyectos pr ON ((pr.codigo = $2 OR pr.id::text = $2) AND pr.tenant_id = p.tenant_id)
      LEFT JOIN core.personal_proyectos pp ON (pp.personal_id = p.id AND pp.proyecto_id = pr.id)
      WHERE (
        UPPER(p.usuario_windows) = UPPER($1)
        OR UPPER(p.usuario_windows) = UPPER(SPLIT_PART($1, '\\', 2))
        OR UPPER(SPLIT_PART(p.usuario_windows, '\\', 2)) = UPPER(SPLIT_PART($1, '\\', 2))
      )
      AND p.activo = TRUE
      LIMIT 1;
    `, [usuarioWindows, idProyecto.trim()]);

    if (authQuery.rows.length === 0 && usuarioWindows !== 'ADMIN_KEY') {
      throw new Error(`Permiso denegado o proyecto inexistente para usuario '${usuarioWindows}' en proyecto '${idProyecto}'.`);
    }

    return {
      personalId: authQuery.rows[0]?.personal_id || null,
      tenantId: authQuery.rows[0]?.tenant_id || '00000000-0000-0000-0000-000000000001',
      proyectoId: authQuery.rows[0]?.proyecto_id
    };
  }

  /**
   * Sincronizar P&IDs desde Excel
   */
  static async sincronizarPid(usuarioWindows: string, payload: any): Promise<SincronizacionOutput> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      const { personalId, tenantId, proyectoId } = await this.resolverProyecto(client, usuarioWindows, payload.id_proyecto);
      const resultado: Array<{ codigo: string; uuid: string }> = [];

      for (const reg of payload.registros || []) {
        const cod = String(reg.codigo_pid || reg.codigo || '').trim().toUpperCase();
        if (!cod) continue;

        const res = await client.query(`
          INSERT INTO piping.pid (
            id, tenant_id, proyecto_id, codigo, titulo, revision_vigente, estado_documental,
            metadata, vigente, created_by, updated_by, created_at, updated_at
          )
          VALUES (
            COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()),
            $2, $3, $4, $5, $6, COALESCE($7, 'VIGENTE'),
            jsonb_build_object('archivo_pdf', $8::text, 'responsable', $9::text),
            TRUE, $10, $10, NOW(), NOW()
          )
          ON CONFLICT (proyecto_id, codigo) DO UPDATE SET
            titulo = COALESCE(EXCLUDED.titulo, piping.pid.titulo),
            revision_vigente = COALESCE(EXCLUDED.revision_vigente, piping.pid.revision_vigente),
            estado_documental = COALESCE(EXCLUDED.estado_documental, piping.pid.estado_documental),
            metadata = piping.pid.metadata || EXCLUDED.metadata,
            vigente = TRUE,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
          WHERE (
            piping.pid.titulo,
            piping.pid.revision_vigente,
            piping.pid.estado_documental,
            piping.pid.metadata,
            piping.pid.vigente
          ) IS DISTINCT FROM (
            COALESCE(EXCLUDED.titulo, piping.pid.titulo),
            COALESCE(EXCLUDED.revision_vigente, piping.pid.revision_vigente),
            COALESCE(EXCLUDED.estado_documental, piping.pid.estado_documental),
            piping.pid.metadata || EXCLUDED.metadata,
            TRUE
          )
          RETURNING codigo, id::text AS uuid;
        `, [
          reg.uuid || null, tenantId, proyectoId, cod, reg.titulo || null,
          reg.revision || null, reg.estado || 'VIGENTE', reg.archivo_pdf || null,
          reg.responsable || null, personalId
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
   * Helper para parsear números y unidades de ingeniería
   */
  private static parsePressureToBar(raw: any): number | null {
    if (raw === undefined || raw === null || raw === '') return null;
    const s = String(raw).trim().toLowerCase();
    const match = s.match(/^([\d.,]+)\s*([a-z°\/23]*)$/);
    if (!match) {
      const num = parseFloat(s.replace(',', '.'));
      return isNaN(num) ? null : num;
    }
    const num = parseFloat(match[1].replace(',', '.'));
    if (isNaN(num)) return null;
    const unit = match[2];
    if (!unit || unit === 'bar') return num;
    if (unit === 'psi') return +(num * 0.0689476).toFixed(3);
    if (unit === 'kpa') return +(num * 0.01).toFixed(3);
    if (unit === 'mpa') return +(num * 10).toFixed(3);
    if (unit.includes('kg')) return +(num * 0.980665).toFixed(3);
    return num;
  }

  private static parseTempToCelsius(raw: any): number | null {
    if (raw === undefined || raw === null || raw === '') return null;
    const s = String(raw).trim().toLowerCase();
    const match = s.match(/^([\d.,\-]+)\s*([a-z°]*)$/);
    if (!match) {
      const num = parseFloat(s.replace(',', '.'));
      return isNaN(num) ? null : num;
    }
    const num = parseFloat(match[1].replace(',', '.'));
    if (isNaN(num)) return null;
    const unit = match[2];
    if (unit.includes('f')) return +((num - 32) * 5 / 9).toFixed(2);
    return num;
  }

  /**
   * Sincronizar Líneas desde Excel
   */
  static async sincronizarLineas(usuarioWindows: string, payload: any): Promise<SincronizacionOutput> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      const { personalId, tenantId, proyectoId } = await this.resolverProyecto(client, usuarioWindows, payload.id_proyecto);
      const resultado: Array<{ codigo: string; uuid: string }> = [];

      for (const reg of payload.registros || []) {
        const cod = String(reg.line_tag || reg.codigo_linea || reg.codigo || '').trim().toUpperCase();
        if (!cod) continue;

        const pBar = this.parsePressureToBar(reg.design_pressure || reg.presion_diseno);
        const tC = this.parseTempToCelsius(reg.design_temp || reg.temp_diseno);
        const testBar = this.parsePressureToBar(reg.test_pressure || reg.tipo_prueba);

        const res = await client.query(`
          INSERT INTO piping.lines (
            id, tenant_id, project_id, code, service_code, nps_code, pipe_class, material,
            pid_reference, origin_point, destination_point, route_description, length_meters,
            design_pressure, design_pressure_bar, design_temperature, test_pressure_bar,
            operating_pressure_normal, operating_temp_normal, painting_spec, internal_coating,
            insulation, heat_tracing, ndt_level, pwht_required, cwa, cwp, status, data_source,
            system, sub_system, is_current, created_by, updated_by, created_at, updated_at
          )
          VALUES (
            COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()),
            $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, NULLIF($13, '')::numeric,
            $14, $15, $16, $17,
            $18, $19, $20, $21,
            $22, $23, $24, COALESCE($25, FALSE), $26, $27, COALESCE($28, 'VIGENTE'), $29,
            $30, $31, TRUE, $32, $32, NOW(), NOW()
          )
          ON CONFLICT (project_id, code) DO UPDATE SET
            service_code = EXCLUDED.service_code, nps_code = EXCLUDED.nps_code,
            pipe_class = EXCLUDED.pipe_class, material = EXCLUDED.material,
            pid_reference = EXCLUDED.pid_reference, origin_point = EXCLUDED.origin_point,
            destination_point = EXCLUDED.destination_point, route_description = EXCLUDED.route_description,
            length_meters = EXCLUDED.length_meters, design_pressure_bar = EXCLUDED.design_pressure_bar,
            design_temperature = EXCLUDED.design_temperature, test_pressure_bar = EXCLUDED.test_pressure_bar,
            operating_pressure_normal = EXCLUDED.operating_pressure_normal, operating_temp_normal = EXCLUDED.operating_temp_normal,
            painting_spec = EXCLUDED.painting_spec, internal_coating = EXCLUDED.internal_coating,
            insulation = EXCLUDED.insulation, heat_tracing = EXCLUDED.heat_tracing,
            ndt_level = EXCLUDED.ndt_level, pwht_required = EXCLUDED.pwht_required,
            cwa = EXCLUDED.cwa, cwp = EXCLUDED.cwp, status = EXCLUDED.status,
            data_source = EXCLUDED.data_source, system = EXCLUDED.system, sub_system = EXCLUDED.sub_system,
            is_current = TRUE, updated_by = EXCLUDED.updated_by, updated_at = NOW()
          RETURNING code AS codigo, id::text AS uuid;
        `, [
          reg.uuid || null, tenantId, proyectoId, cod,
          reg.service_code || reg.servicio || null,
          reg.nominal_size || reg.nps || null,
          reg.piping_class || reg.clase || null,
          reg.material_base || reg.material || null,
          reg.pid_reference || reg.pid || null,
          reg.origin_point || reg.origen || null,
          reg.destination_point || reg.destino || null,
          reg.route_description || reg.observaciones || null,
          reg.total_length || reg.metros || null,
          pBar, pBar, tC, testBar,
          reg.operating_pressure_normal || null,
          reg.operating_temp_normal || null,
          reg.painting_spec || reg.esquema_pintura || null,
          reg.internal_lining || reg.revestimiento_interior || null,
          reg.insulation_spec || reg.aislacion || null,
          reg.tracing_spec || reg.heat_tracing || null,
          reg.ndt_level || null,
          reg.pwht_required === true || reg.pwht_required === 'SI' || reg.pwht_required === 'TRUE',
          reg.cwa || reg.cwa_id || null,
          reg.cwp || reg.cwp_id || null,
          reg.line_status || reg.estado || 'VIGENTE',
          reg.data_source || null,
          reg.sistema || reg.system || null,
          reg.sub_sistema || reg.sub_system || null,
          personalId
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
   * Sincronizar Isométricos
   */
  static async sincronizarIsometricos(usuarioWindows: string, payload: any): Promise<SincronizacionOutput> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      const { personalId, tenantId, proyectoId } = await this.resolverProyecto(client, usuarioWindows, payload.id_proyecto);
      const resultado: Array<{ codigo: string; uuid: string }> = [];

      for (const reg of payload.registros || []) {
        const cod = String(reg.iso_tag || reg.codigo_iso || reg.codigo || '').trim().toUpperCase();
        if (!cod) continue;
        const hoja = String(reg.sheet_no || reg.hoja || '1').trim();
        const codLinea = String(reg.line_tag || reg.codigo_linea || '').trim().toUpperCase();

        const res = await client.query(`
          INSERT INTO piping.isometrics (
            id, tenant_id, project_id, line_id, line_code, code, sheet_no,
            current_revision, client_drawing_no, contractor_drawing_no, engineering_company,
            line_segment, condition, spooling_status, distribution_status, test_pack_id,
            cwa, cwp, status, remarks, document_url, is_current, created_by, updated_by, created_at, updated_at
          )
          VALUES (
            COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()),
            $2, $3,
            (SELECT id FROM piping.lines WHERE (code = $4 OR id::text = $4) AND project_id = $3 LIMIT 1),
            $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12, $13, $14, $15,
            $16, $17, COALESCE($18, 'VIGENTE'), $19, $20, TRUE, $21, $21, NOW(), NOW()
          )
          ON CONFLICT (project_id, code, sheet_no) DO UPDATE SET
            line_code = EXCLUDED.line_code, current_revision = EXCLUDED.current_revision,
            client_drawing_no = EXCLUDED.client_drawing_no, contractor_drawing_no = EXCLUDED.contractor_drawing_no,
            engineering_company = EXCLUDED.engineering_company, line_segment = EXCLUDED.line_segment,
            condition = EXCLUDED.condition, spooling_status = EXCLUDED.spooling_status,
            distribution_status = EXCLUDED.distribution_status, test_pack_id = EXCLUDED.test_pack_id,
            cwa = EXCLUDED.cwa, cwp = EXCLUDED.cwp, status = EXCLUDED.status,
            remarks = EXCLUDED.remarks, document_url = EXCLUDED.document_url,
            is_current = TRUE, updated_by = EXCLUDED.updated_by, updated_at = NOW()
          RETURNING code AS codigo, id::text AS uuid;
        `, [
          reg.uuid || null, tenantId, proyectoId, codLinea, cod, hoja,
          reg.revision || reg.current_revision || null,
          reg.client_drawing_no || reg.plano_cliente || null,
          reg.contractor_drawing_no || reg.plano_contratista || null,
          reg.engineering_company || reg.ingenieria || null,
          reg.line_segment || null,
          reg.condition || reg.condicion || null,
          reg.spooling_status || reg.spooleado || null,
          reg.distribution_status || reg.distribuido || null,
          reg.test_pack_id || reg.test_pack || null,
          reg.cwa || null, reg.cwp || null,
          reg.iso_status || reg.estado || 'VIGENTE',
          reg.remarks || reg.observaciones || null,
          reg.document_url || null,
          personalId
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
   * Sincronizar Spools con AWP y Trazabilidad
   */
  static async sincronizarSpools(usuarioWindows: string, payload: any): Promise<SincronizacionOutput> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      const { personalId, tenantId, proyectoId } = await this.resolverProyecto(client, usuarioWindows, payload.id_proyecto);
      const resultado: Array<{ codigo: string; uuid: string }> = [];

      for (const reg of payload.registros || []) {
        const cod = String(reg.spool_tag || reg.codigo_spool || reg.codigo || '').trim().toUpperCase();
        if (!cod) continue;
        const codIso = String(reg.iso_tag || reg.codigo_iso || '').trim().toUpperCase();

        const res = await client.query(`
          INSERT INTO piping.spools (
            id, tenant_id, project_id, isometric_id, iso_code, code, spool_no,
            cwa, cwp, iwp, spool_type, weight_kg, length_meters,
            current_location, current_stage, status, remarks,
            is_current, created_by, updated_by, created_at, updated_at
          )
          VALUES (
            COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()),
            $2, $3,
            COALESCE((SELECT id FROM piping.isometrics WHERE (code = $4 OR id::text = $4) AND project_id = $3 LIMIT 1), '00000000-0000-0000-0000-000000000001'::uuid),
            $4, $5, $6,
            $7, $8, $9, $10, NULLIF($11, '')::numeric, NULLIF($12, '')::numeric,
            $13, $14, COALESCE($15, 'ACTIVO'), $16,
            TRUE, $17, $17, NOW(), NOW()
          )
          ON CONFLICT (project_id, isometric_id, code) DO UPDATE SET
            iso_code = EXCLUDED.iso_code, spool_no = EXCLUDED.spool_no,
            cwa = EXCLUDED.cwa, cwp = EXCLUDED.cwp, iwp = EXCLUDED.iwp,
            spool_type = EXCLUDED.spool_type, weight_kg = EXCLUDED.weight_kg,
            length_meters = EXCLUDED.length_meters, current_location = EXCLUDED.current_location,
            current_stage = EXCLUDED.current_stage, status = EXCLUDED.status,
            remarks = EXCLUDED.remarks, is_current = TRUE,
            updated_by = EXCLUDED.updated_by, updated_at = NOW()
          RETURNING code AS codigo, id::text AS uuid;
        `, [
          reg.uuid || null, tenantId, proyectoId, codIso, cod,
          reg.spool_no || null,
          reg.cwa || reg.cwa_id || null,
          reg.cwp || reg.cwp_id || null,
          reg.iwp || reg.iwp_id || null,
          reg.spool_type || 'FIGURADO',
          reg.total_weight_kg || reg.weight_kg || null,
          reg.total_length_m || reg.length_meters || null,
          reg.current_location || reg.ubicacion || 'TALLER MAESTRANZA',
          reg.current_stage || reg.estado || 'PREFABRICADO',
          reg.spool_status || 'ACTIVO',
          reg.remarks || reg.observaciones || null,
          personalId
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
   * Sincronizar MTO (Material Take-Off)
   */
  static async sincronizarMto(usuarioWindows: string, payload: any): Promise<SincronizacionOutput> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      const { personalId, tenantId, proyectoId } = await this.resolverProyecto(client, usuarioWindows, payload.id_proyecto);
      const resultado: Array<{ codigo: string; uuid: string }> = [];

      for (const reg of payload.registros || []) {
        const cod = String(reg.codigo_mto || reg.codigo || '').trim().toUpperCase();
        if (!cod) continue;

        const res = await client.query(`
          INSERT INTO piping.mto (
            id, tenant_id, proyecto_id, codigo, item_numero, cwa, cwp, ewp, pwp,
            codigo_linea, codigo_iso, codigo_spool, clase, grupo_material, descripcion,
            diametro_nps, cantidad, unidad, peso_kg, suministro, proveedor, orden_compra,
            recepcionado, solicitado, despachado, cantidad_real, ubicacion_actual,
            estado_material, prioridad_fab, observaciones, estado_actual, vigente,
            created_by, updated_by, created_at, updated_at
          )
          VALUES (
            COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()),
            $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14, COALESCE($15, 'ELEMENTO PIPING'),
            $16, COALESCE(NULLIF($17, '')::numeric, 1), COALESCE($18, 'un'), NULLIF($19, '')::numeric, $20, $21, $22,
            COALESCE(NULLIF($23, '')::boolean, FALSE), NULLIF($24, '')::numeric, NULLIF($25, '')::numeric, NULLIF($26, '')::numeric, $27,
            COALESCE($28, 'SIN REVISAR'), $29, $30, COALESCE($31, 'EMITIDO'), TRUE,
            $32, $32, NOW(), NOW()
          )
          ON CONFLICT (proyecto_id, codigo) DO UPDATE SET
            item_numero = EXCLUDED.item_numero, cwa = EXCLUDED.cwa, cwp = EXCLUDED.cwp,
            ewp = EXCLUDED.ewp, pwp = EXCLUDED.pwp, codigo_linea = EXCLUDED.codigo_linea,
            codigo_iso = EXCLUDED.codigo_iso, codigo_spool = EXCLUDED.codigo_spool,
            clase = EXCLUDED.clase, grupo_material = EXCLUDED.grupo_material,
            descripcion = EXCLUDED.descripcion, diametro_nps = EXCLUDED.diametro_nps,
            cantidad = EXCLUDED.cantidad, unidad = EXCLUDED.unidad, peso_kg = EXCLUDED.peso_kg,
            suministro = EXCLUDED.suministro, proveedor = EXCLUDED.proveedor,
            orden_compra = EXCLUDED.orden_compra, recepcionado = EXCLUDED.recepcionado,
            solicitado = EXCLUDED.solicitado, despachado = EXCLUDED.despachado,
            cantidad_real = EXCLUDED.cantidad_real, ubicacion_actual = EXCLUDED.ubicacion_actual,
            estado_material = EXCLUDED.estado_material, prioridad_fab = EXCLUDED.prioridad_fab,
            observaciones = EXCLUDED.observaciones, estado_actual = EXCLUDED.estado_actual,
            vigente = TRUE, updated_by = EXCLUDED.updated_by, updated_at = NOW()
          WHERE (
            piping.mto.item_numero, piping.mto.cwa, piping.mto.cwp, piping.mto.ewp,
            piping.mto.pwp, piping.mto.codigo_linea, piping.mto.codigo_iso,
            piping.mto.codigo_spool, piping.mto.clase, piping.mto.grupo_material,
            piping.mto.descripcion, piping.mto.diametro_nps, piping.mto.cantidad,
            piping.mto.unidad, piping.mto.peso_kg, piping.mto.suministro,
            piping.mto.proveedor, piping.mto.orden_compra, piping.mto.recepcionado,
            piping.mto.solicitado, piping.mto.despachado, piping.mto.cantidad_real,
            piping.mto.ubicacion_actual, piping.mto.estado_material,
            piping.mto.prioridad_fab, piping.mto.observaciones, piping.mto.vigente
          ) IS DISTINCT FROM (
            EXCLUDED.item_numero, EXCLUDED.cwa, EXCLUDED.cwp, EXCLUDED.ewp,
            EXCLUDED.pwp, EXCLUDED.codigo_linea, EXCLUDED.codigo_iso,
            EXCLUDED.codigo_spool, EXCLUDED.clase, EXCLUDED.grupo_material,
            EXCLUDED.descripcion, EXCLUDED.diametro_nps, EXCLUDED.cantidad,
            EXCLUDED.unidad, EXCLUDED.peso_kg, EXCLUDED.suministro,
            EXCLUDED.proveedor, EXCLUDED.orden_compra, EXCLUDED.recepcionado,
            EXCLUDED.solicitado, EXCLUDED.despachado, EXCLUDED.cantidad_real,
            EXCLUDED.ubicacion_actual, EXCLUDED.estado_material,
            EXCLUDED.prioridad_fab, EXCLUDED.observaciones, TRUE
          )
          RETURNING codigo, id::text AS uuid;
        `, [
          reg.uuid || null, tenantId, proyectoId, cod, reg.item_numero || null,
          reg.cwa || null, reg.cwp || null, reg.ewp || null, reg.pwp || null,
          reg.codigo_linea || null, reg.codigo_iso || null, reg.codigo_spool || null,
          reg.clase || null, reg.grupo_material || null, reg.descripcion || 'ELEMENTO PIPING',
          reg.nps || null, reg.cantidad || null, reg.unidad || 'un', reg.peso_kg || null,
          reg.suministro || null, reg.proveedor || null, reg.orden_compra || null,
          reg.recepcionado || null, reg.solicitado || null, reg.despachado || null,
          reg.cantidad_real || null, reg.ubicacion_actual || null, reg.estado_material || 'SIN REVISAR',
          reg.prioridad_fab || null, reg.observaciones || null, reg.estado || 'EMITIDO', personalId
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
   * Sincronizar Válvulas
   */
  static async sincronizarValvulas(usuarioWindows: string, payload: any): Promise<SincronizacionOutput> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      const { personalId, tenantId, proyectoId } = await this.resolverProyecto(client, usuarioWindows, payload.id_proyecto);
      const resultado: Array<{ codigo: string; uuid: string }> = [];

      for (const reg of payload.registros || []) {
        const cod = String(reg.codigo_valvula || reg.codigo || '').trim().toUpperCase();
        if (!cod) continue;

        const res = await client.query(`
          INSERT INTO piping.valvulas (
            id, tenant_id, proyecto_id, codigo, id_mto, clase, tag_piping, tag_instrumentacion,
            diametro_nps, cantidad, descripcion, correlativo_maqueta, numero_aconex, diagrama,
            estado_actual, vigente, created_by, updated_by, created_at, updated_at
          )
          VALUES (
            COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()),
            $2, $3, $4, $5, $6, $7, $8,
            $9, COALESCE(NULLIF($10, '')::numeric, 1), $11, $12, $13, $14,
            COALESCE($15, 'POR_MONTAR'), TRUE, $16, $16, NOW(), NOW()
          )
          ON CONFLICT (proyecto_id, codigo) DO UPDATE SET
            id_mto = EXCLUDED.id_mto, clase = EXCLUDED.clase, tag_piping = EXCLUDED.tag_piping,
            tag_instrumentacion = EXCLUDED.tag_instrumentacion, diametro_nps = EXCLUDED.diametro_nps,
            cantidad = EXCLUDED.cantidad, descripcion = EXCLUDED.descripcion,
            correlativo_maqueta = EXCLUDED.correlativo_maqueta, numero_aconex = EXCLUDED.numero_aconex,
            diagrama = EXCLUDED.diagrama, estado_actual = EXCLUDED.estado_actual,
            vigente = TRUE, updated_by = EXCLUDED.updated_by, updated_at = NOW()
          WHERE (
            piping.valvulas.id_mto, piping.valvulas.clase, piping.valvulas.tag_piping,
            piping.valvulas.tag_instrumentacion, piping.valvulas.diametro_nps,
            piping.valvulas.cantidad, piping.valvulas.descripcion,
            piping.valvulas.correlativo_maqueta, piping.valvulas.numero_aconex,
            piping.valvulas.diagrama, piping.valvulas.estado_actual,
            piping.valvulas.vigente
          ) IS DISTINCT FROM (
            EXCLUDED.id_mto, EXCLUDED.clase, EXCLUDED.tag_piping,
            EXCLUDED.tag_instrumentacion, EXCLUDED.diametro_nps,
            EXCLUDED.cantidad, EXCLUDED.descripcion,
            EXCLUDED.correlativo_maqueta, EXCLUDED.numero_aconex,
            EXCLUDED.diagrama, EXCLUDED.estado_actual,
            TRUE
          )
          RETURNING codigo, id::text AS uuid;
        `, [
          reg.uuid || null, tenantId, proyectoId, cod, reg.id_mto || null, reg.clase || null,
          reg.tag_piping || null, reg.tag_instrumentacion || null, reg.nps || null,
          reg.cantidad || null, reg.descripcion || null, reg.correlativo_maqueta || null,
          reg.numero_aconex || null, reg.diagrama || null, reg.estado || 'POR_MONTAR', personalId
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
   * Sincronizar Soportes
   */
  static async sincronizarSoportes(usuarioWindows: string, payload: any): Promise<SincronizacionOutput> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      const { personalId, tenantId, proyectoId } = await this.resolverProyecto(client, usuarioWindows, payload.id_proyecto);
      const resultado: Array<{ codigo: string; uuid: string }> = [];

      for (const reg of payload.registros || []) {
        const cod = String(reg.codigo_soporte || reg.codigo || '').trim().toUpperCase();
        if (!cod) continue;

        const res = await client.query(`
          INSERT INTO piping.soportes (
            id, tenant_id, proyecto_id, codigo, item_numero, cwa, cwp, ewp, pwp,
            codigo_linea, codigo_iso, clase, tipo_soporte, diametro_nps, cantidad,
            unidad, peso_kg, suministro, observaciones, estado_actual, vigente,
            created_by, updated_by, created_at, updated_at
          )
          VALUES (
            COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()),
            $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14, COALESCE(NULLIF($15, '')::numeric, 1),
            COALESCE($16, 'un'), NULLIF($17, '')::numeric, $18, $19, COALESCE($20, 'POR_FABRICAR'),
            TRUE, $21, $21, NOW(), NOW()
          )
          ON CONFLICT (proyecto_id, codigo) DO UPDATE SET
            item_numero = EXCLUDED.item_numero, cwa = EXCLUDED.cwa, cwp = EXCLUDED.cwp,
            ewp = EXCLUDED.ewp, pwp = EXCLUDED.pwp, codigo_linea = EXCLUDED.codigo_linea,
            codigo_iso = EXCLUDED.codigo_iso, clase = EXCLUDED.clase,
            tipo_soporte = EXCLUDED.tipo_soporte, diametro_nps = EXCLUDED.diametro_nps,
            cantidad = EXCLUDED.cantidad, unidad = EXCLUDED.unidad, peso_kg = EXCLUDED.peso_kg,
            suministro = EXCLUDED.suministro, observaciones = EXCLUDED.observaciones,
            estado_actual = EXCLUDED.estado_actual, vigente = TRUE,
            updated_by = EXCLUDED.updated_by, updated_at = NOW()
          WHERE (
            piping.soportes.item_numero, piping.soportes.cwa, piping.soportes.cwp,
            piping.soportes.ewp, piping.soportes.pwp, piping.soportes.codigo_linea,
            piping.soportes.codigo_iso, piping.soportes.clase, piping.soportes.tipo_soporte,
            piping.soportes.diametro_nps, piping.soportes.cantidad, piping.soportes.unidad,
            piping.soportes.peso_kg, piping.soportes.suministro, piping.soportes.observaciones,
            piping.soportes.vigente
          ) IS DISTINCT FROM (
            EXCLUDED.item_numero, EXCLUDED.cwa, EXCLUDED.cwp, EXCLUDED.ewp,
            EXCLUDED.pwp, EXCLUDED.codigo_linea, EXCLUDED.codigo_iso,
            EXCLUDED.clase, EXCLUDED.tipo_soporte, EXCLUDED.diametro_nps,
            EXCLUDED.cantidad, EXCLUDED.unidad, EXCLUDED.peso_kg,
            EXCLUDED.suministro, EXCLUDED.observaciones, TRUE
          )
          RETURNING codigo, id::text AS uuid;
        `, [
          reg.uuid || null, tenantId, proyectoId, cod, reg.item_numero || null,
          reg.cwa || null, reg.cwp || null, reg.ewp || null, reg.pwp || null,
          reg.codigo_linea || null, reg.codigo_iso || null, reg.clase || null,
          reg.tipo_soporte || null, reg.nps || null, reg.cantidad || null,
          reg.unidad || 'un', reg.peso_kg || null, reg.suministro || null,
          reg.observaciones || null, reg.estado || 'POR_FABRICAR', personalId
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
}
