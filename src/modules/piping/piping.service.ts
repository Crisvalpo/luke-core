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

      return {
        id_proyecto: idProyecto,
        procesados: resultadoJuntas.length,
        registros: resultadoJuntas,
        fecha: new Date().toISOString()
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Listar historial de auditoría de sincronización
   */
  static async obtenerAuditoria(limite = 50) {
    const result = await dbPool.query(`
      SELECT * FROM core.audit_sync
      ORDER BY fecha DESC
      LIMIT $1;
    `, [limite]);
    return result.rows;
  }
}
