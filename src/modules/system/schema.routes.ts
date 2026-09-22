import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';

export const schemaRouter = Router();

/**
 * GET /api/v1/system/schema
 * Retorna el mapa completo de tablas, columnas, relaciones y conteo de filas de la base de datos de Luke Core
 */
schemaRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Obtener tablas de los esquemas 'public' y 'core'
    const tablesResult = await query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema IN ('public', 'core') 
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name;
    `);

    // 2. Obtener columnas y tipos de datos
    const columnsResult = await query(`
      SELECT 
        table_schema,
        table_name, 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_schema IN ('public', 'core')
      ORDER BY table_schema, table_name, ordinal_position;
    `);

    // 3. Obtener Claves Primarias y Foráneas (Relaciones)
    const relationsResult = await query(`
      SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        tc.constraint_type,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema IN ('public', 'core')
        AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY');
    `);

    const columnsByTable: Record<string, any[]> = {};
    columnsResult.rows.forEach(col => {
      const key = `${col.table_schema}.${col.table_name}`;
      if (!columnsByTable[key]) columnsByTable[key] = [];
      columnsByTable[key].push({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default
      });
    });

    const relationsByTable: Record<string, any[]> = {};
    const pkByTable: Record<string, string[]> = {};

    relationsResult.rows.forEach(rel => {
      const key = `${rel.table_schema}.${rel.table_name}`;
      if (rel.constraint_type === 'PRIMARY KEY') {
        if (!pkByTable[key]) pkByTable[key] = [];
        pkByTable[key].push(rel.column_name);
      } else if (rel.constraint_type === 'FOREIGN KEY' && rel.foreign_table_name) {
        if (!relationsByTable[key]) relationsByTable[key] = [];
        relationsByTable[key].push({
          column: rel.column_name,
          foreignSchema: rel.foreign_table_schema,
          foreignTable: rel.foreign_table_name,
          foreignColumn: rel.foreign_column_name
        });
      }
    });

    // Dominio funcional asignado para el Mapa del Mundo
    const getDomain = (tableName: string) => {
      if (['tenants', 'usuarios', 'roles', 'tenant_usuarios', 'system_logs'].includes(tableName)) return 'Core & Multi-Tenancy';
      if (tableName.startsWith('piping_') || tableName === 'proyectos') return 'Ingeniería Piping & Proyectos';
      if (['personal', 'cuadrillas', 'cuadrilla_integrantes', 'asistencia'].includes(tableName)) return 'Dotación & Personal RRHH';
      if (['equipos', 'mantenciones', 'combustible'].includes(tableName)) return 'Flota & Maquinarias';
      if (tableName.startsWith('wa_') || tableName.startsWith('bot_')) return 'WhatsApp Bot & Mensajería';
      return 'Módulos Auxiliares';
    };

    // Estructurar respuesta final
    const tablesMap = await Promise.all(tablesResult.rows.map(async (t) => {
      const fullKey = `${t.table_schema}.${t.table_name}`;
      let rowCount = 0;
      try {
        const countRes = await query(`SELECT COUNT(*) AS total FROM ${t.table_schema}."${t.table_name}"`);
        rowCount = parseInt(countRes.rows[0]?.total || '0', 10);
      } catch {
        rowCount = 0;
      }

      const pks = pkByTable[fullKey] || [];
      const cols = (columnsByTable[fullKey] || []).map(c => ({
        ...c,
        isPk: pks.includes(c.name)
      }));

      return {
        name: t.table_name,
        schema: t.table_schema,
        domain: getDomain(t.table_name),
        rowCount,
        columns: cols,
        relations: relationsByTable[fullKey] || []
      };
    }));

    return sendSuccess(res, { tables: tablesMap }, 200);

  } catch (error: any) {
    return sendError(res, `Error al obtener esquema DB: ${error.message}`, 500);
  }
});
