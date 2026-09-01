import { dbPool } from '../../config/database.js';

export interface PipingProjectConfig {
  id_proyecto: string;
  codigo_proyecto: string;
  usa_pwht: boolean;
  usa_sublineas: boolean;
  controla_revisiones: boolean;
  columnas_lineas: string[];
  columnas_spools?: string[];
  columnas_juntas?: string[];
  configuracion_adicional?: Record<string, any>;
}

const DEFAULT_LINE_COLUMNS = [
  'LINE_TAG',
  'SERVICE_CODE',
  'NOMINAL_SIZE',
  'PIPING_CLASS',
  'MATERIAL_BASE',
  'PID_REFERENCE',
  'SISTEMA',
  'ORIGIN_POINT',
  'DESTINATION_POINT',
  'TOTAL_LENGTH',
  'DESIGN_PRESSURE',
  'DESIGN_TEMP',
  'TEST_PRESSURE',
  'PAINTING_SPEC',
  'NDT_LEVEL',
  'LINE_STATUS'
];

export class PipingConfigService {
  /**
   * Obtiene la configuración de columnas y flags de piping para un proyecto
   */
  static async obtenerConfiguracion(idOcodigoProyecto: string): Promise<PipingProjectConfig> {
    const query = `
      SELECT 
        pr.id AS id_proyecto,
        pr.code AS codigo_proyecto,
        COALESCE(cfg.usa_pwht, FALSE) AS usa_pwht,
        COALESCE(cfg.usa_sublineas, FALSE) AS usa_sublineas,
        COALESCE(cfg.controla_revisiones, TRUE) AS controla_revisiones,
        cfg.configuracion
      FROM core.projects pr
      LEFT JOIN piping.project_configs cfg ON cfg.project_id = pr.id
      WHERE (pr.code = $1 OR pr.id::text = $1)
      LIMIT 1;
    `;
    const res = await dbPool.query(query, [idOcodigoProyecto.trim()]);
    if (res.rows.length === 0) {
      throw new Error(`Proyecto ${idOcodigoProyecto} no encontrado.`);
    }

    const row = res.rows[0];
    const cfg = row.configuracion || {};

    return {
      id_proyecto: row.id_proyecto,
      codigo_proyecto: row.codigo_proyecto,
      usa_pwht: row.usa_pwht,
      usa_sublineas: row.usa_sublineas,
      controla_revisiones: row.controla_revisiones,
      columnas_lineas: Array.isArray(cfg.columnas_lineas) && cfg.columnas_lineas.length > 0
        ? cfg.columnas_lineas
        : DEFAULT_LINE_COLUMNS,
      columnas_spools: cfg.columnas_spools,
      columnas_juntas: cfg.columnas_juntas,
      configuracion_adicional: cfg
    };
  }

  /**
   * Guarda o actualiza la configuración "Día 0" del proyecto
   */
  static async guardarConfiguracion(
    usuarioWindows: string,
    payload: {
      id_proyecto: string;
      usa_pwht?: boolean;
      usa_sublineas?: boolean;
      controla_revisiones?: boolean;
      columnas_lineas?: string[];
      configuracion?: Record<string, any>;
    }
  ): Promise<PipingProjectConfig> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      const proyRes = await client.query(
        `SELECT id, tenant_id, code FROM core.projects WHERE code = $1 OR id::text = $1 LIMIT 1`,
        [payload.id_proyecto.trim()]
      );
      if (proyRes.rows.length === 0) {
        throw new Error(`Proyecto ${payload.id_proyecto} no encontrado.`);
      }

      const { id: projectId, tenant_id: tenantId, code: projectCode } = proyRes.rows[0];

      const columnasLineas = Array.isArray(payload.columnas_lineas) && payload.columnas_lineas.length > 0
        ? payload.columnas_lineas
        : DEFAULT_LINE_COLUMNS;

      const configuracionJson = {
        ...(payload.configuracion || {}),
        columnas_lineas: columnasLineas,
        updated_by: usuarioWindows,
        updated_at: new Date().toISOString()
      };

      await client.query(
        `
        INSERT INTO piping.project_configs (
          tenant_id, project_id, usa_pwht, usa_sublineas, controla_revisiones, configuracion, updated_at
        )
        VALUES (
          $1, $2, COALESCE($3, FALSE), COALESCE($4, FALSE), COALESCE($5, TRUE), $6, NOW()
        )
        ON CONFLICT (project_id) DO UPDATE SET
          usa_pwht = EXCLUDED.usa_pwht,
          usa_sublineas = EXCLUDED.usa_sublineas,
          controla_revisiones = EXCLUDED.controla_revisiones,
          configuracion = EXCLUDED.configuracion,
          updated_at = NOW();
      `,
        [
          tenantId,
          projectId,
          payload.usa_pwht ?? false,
          payload.usa_sublineas ?? false,
          payload.controla_revisiones ?? true,
          JSON.stringify(configuracionJson)
        ]
      );

      await client.query('COMMIT');

      return {
        id_proyecto: projectId,
        codigo_proyecto: projectCode,
        usa_pwht: payload.usa_pwht ?? false,
        usa_sublineas: payload.usa_sublineas ?? false,
        controla_revisiones: payload.controla_revisiones ?? true,
        columnas_lineas: columnasLineas,
        configuracion_adicional: configuracionJson
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
