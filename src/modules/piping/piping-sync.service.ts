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
   * Sincronizar Líneas de Piping
   */
  static async sincronizarLineas(usuarioWindows: string, payload: any): Promise<SincronizacionOutput> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      const { personalId, tenantId, proyectoId } = await this.resolverProyecto(client, usuarioWindows, payload.id_proyecto);
      const resultado: Array<{ codigo: string; uuid: string }> = [];

      for (const reg of payload.registros || []) {
        const cod = String(reg.codigo_linea || reg.codigo || '').trim().toUpperCase();
        if (!cod) continue;

        const res = await client.query(`
          INSERT INTO piping.lineas (
            id, tenant_id, proyecto_id, codigo, nps_codigo, material, plano_cliente,
            metros, origen, destino, temperatura_diseno, presion_diseno, tipo_prueba,
            esquema_pintura, ral, revestimiento_interior, aislacion, observaciones,
            vigente, created_by, updated_by, created_at, updated_at
          )
          VALUES (
            COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()),
            $2, $3, $4, $5, $6, $7,
            NULLIF($8, '')::numeric, $9, $10, NULLIF($11, '')::numeric, NULLIF($12, '')::numeric, $13,
            $14, $15, $16, $17, $18,
            TRUE, $19, $19, NOW(), NOW()
          )
          ON CONFLICT (proyecto_id, codigo) DO UPDATE SET
            nps_codigo = EXCLUDED.nps_codigo, material = EXCLUDED.material,
            plano_cliente = EXCLUDED.plano_cliente, metros = EXCLUDED.metros,
            origen = EXCLUDED.origen, destino = EXCLUDED.destino,
            temperatura_diseno = EXCLUDED.temperatura_diseno, presion_diseno = EXCLUDED.presion_diseno,
            tipo_prueba = EXCLUDED.tipo_prueba, esquema_pintura = EXCLUDED.esquema_pintura,
            ral = EXCLUDED.ral, revestimiento_interior = EXCLUDED.revestimiento_interior,
            aislacion = EXCLUDED.aislacion, observaciones = EXCLUDED.observaciones,
            vigente = TRUE, updated_by = EXCLUDED.updated_by, updated_at = NOW()
          WHERE (
            piping.lineas.nps_codigo, piping.lineas.material, piping.lineas.plano_cliente,
            piping.lineas.metros, piping.lineas.origen, piping.lineas.destino,
            piping.lineas.temperatura_diseno, piping.lineas.presion_diseno,
            piping.lineas.tipo_prueba, piping.lineas.esquema_pintura, piping.lineas.ral,
            piping.lineas.revestimiento_interior, piping.lineas.aislacion,
            piping.lineas.observaciones, piping.lineas.vigente
          ) IS DISTINCT FROM (
            EXCLUDED.nps_codigo, EXCLUDED.material, EXCLUDED.plano_cliente,
            EXCLUDED.metros, EXCLUDED.origen, EXCLUDED.destino,
            EXCLUDED.temperatura_diseno, EXCLUDED.presion_diseno,
            EXCLUDED.tipo_prueba, EXCLUDED.esquema_pintura, EXCLUDED.ral,
            EXCLUDED.revestimiento_interior, EXCLUDED.aislacion,
            EXCLUDED.observaciones, TRUE
          )
          RETURNING codigo, id::text AS uuid;
        `, [
          reg.uuid || null, tenantId, proyectoId, cod, reg.nps || null, reg.material || null,
          reg.plano_cliente || null, reg.metros || null, reg.origen || null, reg.destino || null,
          reg.temp_diseno || null, reg.presion_diseno || null, reg.tipo_prueba || null,
          reg.esquema_pintura || null, reg.ral || null, reg.revestimiento_interior || null,
          reg.aislacion || null, reg.observaciones || null, personalId
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
        const cod = String(reg.codigo_iso || reg.codigo || '').trim().toUpperCase();
        if (!cod) continue;
        const hoja = String(reg.hoja || '1').trim();

        const res = await client.query(`
          INSERT INTO piping.isometricos (
            id, tenant_id, proyecto_id, codigo, hoja, revision_vigente, plano_contratista,
            plano_cliente, clase, nps, empresa_ingenieria, condicion, spooleado,
            estado_documental, distribuido, observacion, vigente, created_by, updated_by, created_at, updated_at
          )
          VALUES (
            COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()),
            $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13,
            COALESCE($14, 'VIGENTE'), $15, $16, TRUE, $17, $17, NOW(), NOW()
          )
          ON CONFLICT (proyecto_id, codigo, hoja) DO UPDATE SET
            revision_vigente = EXCLUDED.revision_vigente, plano_contratista = EXCLUDED.plano_contratista,
            plano_cliente = EXCLUDED.plano_cliente, clase = EXCLUDED.clase, nps = EXCLUDED.nps,
            empresa_ingenieria = EXCLUDED.empresa_ingenieria, condicion = EXCLUDED.condicion,
            spooleado = EXCLUDED.spooleado, estado_documental = EXCLUDED.estado_documental,
            distribuido = EXCLUDED.distribuido, observacion = EXCLUDED.observacion,
            vigente = TRUE, updated_by = EXCLUDED.updated_by, updated_at = NOW()
          WHERE (
            piping.isometricos.revision_vigente, piping.isometricos.plano_contratista,
            piping.isometricos.plano_cliente, piping.isometricos.clase, piping.isometricos.nps,
            piping.isometricos.empresa_ingenieria, piping.isometricos.condicion,
            piping.isometricos.spooleado, piping.isometricos.estado_documental,
            piping.isometricos.distribuido, piping.isometricos.observacion,
            piping.isometricos.vigente
          ) IS DISTINCT FROM (
            EXCLUDED.revision_vigente, EXCLUDED.plano_contratista,
            EXCLUDED.plano_cliente, EXCLUDED.clase, EXCLUDED.nps,
            EXCLUDED.empresa_ingenieria, EXCLUDED.condicion,
            EXCLUDED.spooleado, EXCLUDED.estado_documental,
            EXCLUDED.distribuido, EXCLUDED.observacion,
            TRUE
          )
          RETURNING codigo, id::text AS uuid;
        `, [
          reg.uuid || null, tenantId, proyectoId, cod, hoja, reg.revision || null,
          reg.plano_contratista || null, reg.plano_cliente || null, reg.clase || null,
          reg.nps || null, reg.ingenieria || null, reg.condicion || null, reg.spooleado || null,
          reg.estado || 'VIGENTE', reg.distribuido || null, reg.observaciones || null, personalId
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
   * Sincronizar Spools
   */
  static async sincronizarSpools(usuarioWindows: string, payload: any): Promise<SincronizacionOutput> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      const { personalId, tenantId, proyectoId } = await this.resolverProyecto(client, usuarioWindows, payload.id_proyecto);
      const resultado: Array<{ codigo: string; uuid: string }> = [];

      for (const reg of payload.registros || []) {
        const cod = String(reg.codigo_spool || reg.codigo || '').trim().toUpperCase();
        if (!cod) continue;

        const res = await client.query(`
          INSERT INTO piping.spools (
            id, tenant_id, proyecto_id, codigo, tag_gestion, sistema, sub_sistema,
            area, codigo_linea, spool_numero, nps, material, servicio, proceso,
            ubicacion_actual, observaciones, estado_actual, vigente, created_by, updated_by, created_at, updated_at
          )
          VALUES (
            COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()),
            $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $14,
            $15, $16, COALESCE($17, 'EN_FABRICACION'), TRUE, $18, $18, NOW(), NOW()
          )
          ON CONFLICT (proyecto_id, codigo) DO UPDATE SET
            tag_gestion = EXCLUDED.tag_gestion, sistema = EXCLUDED.sistema,
            sub_sistema = EXCLUDED.sub_sistema, area = EXCLUDED.area,
            codigo_linea = EXCLUDED.codigo_linea, spool_numero = EXCLUDED.spool_numero,
            nps = EXCLUDED.nps, material = EXCLUDED.material, servicio = EXCLUDED.servicio,
            proceso = EXCLUDED.proceso, ubicacion_actual = EXCLUDED.ubicacion_actual,
            observaciones = EXCLUDED.observaciones, vigente = TRUE,
            updated_by = EXCLUDED.updated_by, updated_at = NOW()
          WHERE (
            piping.spools.tag_gestion, piping.spools.sistema, piping.spools.sub_sistema,
            piping.spools.area, piping.spools.codigo_linea, piping.spools.spool_numero,
            piping.spools.nps, piping.spools.material, piping.spools.servicio,
            piping.spools.proceso, piping.spools.ubicacion_actual,
            piping.spools.observaciones, piping.spools.vigente
          ) IS DISTINCT FROM (
            EXCLUDED.tag_gestion, EXCLUDED.sistema, EXCLUDED.sub_sistema,
            EXCLUDED.area, EXCLUDED.codigo_linea, EXCLUDED.spool_numero,
            EXCLUDED.nps, EXCLUDED.material, EXCLUDED.servicio,
            EXCLUDED.proceso, EXCLUDED.ubicacion_actual,
            EXCLUDED.observaciones, TRUE
          )
          RETURNING codigo, id::text AS uuid;
        `, [
          reg.uuid || null, tenantId, proyectoId, cod, reg.tag_gestion || null,
          reg.sistema || null, reg.sub_sistema || null, reg.area || null,
          reg.codigo_linea || null, reg.spool_numero || null, reg.nps || null,
          reg.material || null, reg.servicio || null, reg.proceso || null,
          reg.ubicacion || null, reg.observaciones || null, reg.estado || 'EN_FABRICACION', personalId
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
