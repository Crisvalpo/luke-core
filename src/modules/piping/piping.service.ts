import { dbPool } from '../../config/database.js';
import { JuntaItemInput } from './piping.schema.js';

export interface SincronizacionResult {
  ok: boolean;
  total_procesados: number;
  proyecto_id: string;
  usuario: string;
  fecha: string;
}

export class PipingService {
  /**
   * Procesa la sincronización / upsert masivo de lista de juntas desde Excel / VBA
   */
  static async sincronizarJuntas(
    usuarioWindows: string,
    juntas: JuntaItemInput[]
  ): Promise<SincronizacionResult> {
    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      const primerProyecto = juntas[0]?.id_proyecto || 'GENERAL';

      // 1. Ejecutar Upsert masivo para cada junta
      for (const junta of juntas) {
        await client.query(`
          INSERT INTO core.lista_juntas (
            id_proyecto, id_junta, tag, estado, vigente, fecha_sync, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT (id_proyecto, id_junta) DO UPDATE SET
            tag = EXCLUDED.tag,
            estado = EXCLUDED.estado,
            vigente = EXCLUDED.vigente,
            fecha_sync = NOW(),
            updated_at = NOW();
        `, [
          junta.id_proyecto,
          junta.id_junta,
          junta.tag || null,
          junta.estado || 'ACTIVO',
          junta.vigente !== undefined ? junta.vigente : true
        ]);
      }

      // 2. Registrar en la tabla de auditoría (core.audit_sync)
      await client.query(`
        INSERT INTO core.audit_sync (
          usuario_windows, proyecto_id, tabla, registros, detalles, fecha
        )
        VALUES ($1, $2, $3, $4, $5, NOW());
      `, [
        usuarioWindows,
        primerProyecto,
        'lista_juntas',
        juntas.length,
        JSON.stringify({
          primera_junta: juntas[0]?.id_junta,
          ultima_junta: juntas[juntas.length - 1]?.id_junta,
          timestamp: new Date().toISOString()
        })
      ]);

      await client.query('COMMIT');

      return {
        ok: true,
        total_procesados: juntas.length,
        proyecto_id: primerProyecto,
        usuario: usuarioWindows,
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
