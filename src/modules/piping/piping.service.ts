import { dbPool } from '../../config/database.js';
import { PayloadSyncJuntasInput } from './piping.schema.js';

export interface JuntaSincronizadaOutput {
  id_junta: string;
  uuid: string;
}

export interface RespuestaSincronizacionJuntas {
  procesados: number;
  registros: JuntaSincronizadaOutput[];
  proyecto_id?: string;
  fecha?: string;
}

export class PipingService {
  /**
   * Sincronización atómica de lista de juntas desde Excel Sync v1.0
   * Realiza Upsert masivo y retorna los UUIDs generados/existentes para retroalimentar el Excel.
   */
  static async sincronizarJuntas(
    usuarioWindows: string,
    payload: PayloadSyncJuntasInput
  ): Promise<RespuestaSincronizacionJuntas> {
    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      const idProyecto = payload.id_proyecto;
      const registros = payload.registros;
      const usuarioFinal = payload.usuario_windows || usuarioWindows;
      const resultadoJuntas: JuntaSincronizadaOutput[] = [];

      // 1. Ejecutar Upsert masivo para cada junta obteniendo su UUID definitivo
      for (const junta of registros) {
        const res = await client.query(`
          INSERT INTO core.lista_juntas (
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

      // 2. Registrar en la tabla de auditoría (core.audit_sync)
      await client.query(`
        INSERT INTO core.audit_sync (
          usuario_windows, proyecto_id, tabla, registros, detalles, fecha
        )
        VALUES ($1, $2, $3, $4, $5, NOW());
      `, [
        usuarioFinal,
        idProyecto,
        'lista_juntas',
        registros.length,
        JSON.stringify({
          total: registros.length,
          timestamp: new Date().toISOString()
        })
      ]);

      await client.query('COMMIT');

      return {
        procesados: resultadoJuntas.length,
        registros: resultadoJuntas,
        proyecto_id: idProyecto,
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
