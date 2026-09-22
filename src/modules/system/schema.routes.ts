import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';

export const schemaRouter = Router();

/**
 * GET /api/v1/system/schema
 * Auditoría dinámica y clasificación completa de todos los esquemas y tablas de la base de datos PostgreSQL
 */
schemaRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Obtener todas las tablas de la base de datos
    const tablesResult = await query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
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
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
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
      WHERE tc.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
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

    const TABLE_DESCRIPTIONS: Record<string, string> = {
      // Core & Multi-Tenancy (Inglés Normalizado)
      'core.tenants': 'Empresas clientes con aislamiento Multi-Tenant de datos, subdominio/slug y configuración de marca blanca.',
      'core.projects': 'Faenas, obras y contratos de construcción y montaje industrial por tenant.',
      'core.personnel': 'Dotación de personal faenero, cargos, RUTs, teléfonos y estado operativo.',
      'core.equipment': 'Flota de maquinarias, vehículos y equipos mayores/menores en faena.',
      'core.crews': 'Cuadrillas de trabajo en terreno agrupadas por capataz y especialidad.',
      'core.crew_task_assignments': 'Asignación de cuadrillas a tareas de avance diario en obra.',
      'core.company_roles': 'Matriz de roles corporativos asignables a los trabajadores de cada tenant.',
      'core.project_personnel': 'Dotación asignada a faenas específicas con credenciales y roles de obra.',
      'core.work_fronts': 'Ubicaciones físicas y frentes operativos de trabajo en faena.',
      'core.usuarios': 'Cuentas de usuario de la plataforma con credenciales de acceso y hash de contraseña.',
      'core.roles': 'Catálogo de roles y matriz de permisos por nivel de usuario (Super-Admin, Fundador, Admin).',
      'core.tenant_usuarios': 'Tabla pivote que vincula usuarios con las empresas (tenants) autorizadas.',
      'core.mirror_attendance': 'Registro de asistencia sincronizado desde la App espejo de terreno.',
      'core.mirror_workers': 'Trabajadores registrados en el espejo de la App de terreno (Buk Mirror).',
      'core.sesiones_canal': 'Sesiones activas del canal puente de WhatsApp Bot.',

      // Piping & Ingeniería (Inglés Normalizado)
      'piping.lines': 'Líneas de cañería con sus especificaciones de fluido, servicio, diámetro NPS, clase y presión.',
      'piping.isometrics': 'Planos isométricos de piping con versión de revisión y trazabilidad de avance.',
      'piping.spools': 'Elementos prefabricados (Spools) de cañería con peso, longitud, etapa y ubicación física.',
      'piping.joints': 'Registro de soldaduras/juntas con tipo (BW/FW), pulgadas de diámetro (NPS) y pruebas NDT.',
      'piping.valves': 'Válvulas y accesorios de instrumentación vinculados a líneas de piping.',
      'piping.supports': 'Soportes estructurales de cañerías con alcance de fabricación y montaje.',
      'piping.pid': 'Catálogo de planos P&ID registrados por proyecto.',
      'piping.mto': 'Material Take Off (MTO) o cubicaciones masivas de piping.',

      // Proyectos Externos (Quiz, Ruleta, Subastas, Infraestructura)
      'quiz.quizzes': 'PROYECTO QUIZ: Cuestionarios y trivias creados en la plataforma Quiz (2,803 registros).',
      'quiz.questions': 'PROYECTO QUIZ: Banco de preguntas de trivias (14,035 preguntas).',
      'quiz.games': 'PROYECTO QUIZ: Partidas de trivias jugadas.',
      'quiz.answers': 'PROYECTO QUIZ: Respuestas enviadas por jugadores.',
      'quiz.players': 'PROYECTO QUIZ: Jugadores registrados en las partidas de Quiz.',
      
      'ruleta.game_history': 'PROYECTO RULETA: Historial de lanzamientos de la Ruleta Virtual TikTok Live.',
      'ruleta.player_queue': 'PROYECTO RULETA: Cola de jugadores interactivos en vivo.',
      'ruleta.individual_wheel_segments': 'PROYECTO RULETA: Segmentos y premios de las ruedas individuales.',
      'ruleta.raffle_tickets': 'PROYECTO RULETA: Tickets de sorteos en vivo emitidos.',
      
      'subastas.tiktok_events': 'PROYECTO SUBASTAS: Eventos e interacciones capturadas en transmisiones TikTok Live (1,351 eventos).',
      'subastas.buyer_bags': 'PROYECTO SUBASTAS: Carritos/bolsas de compra asignadas a compradores.',
      'subastas.buyers': 'PROYECTO SUBASTAS: Registro de compradores en subastas en vivo.',
      'subastas.warehouse_locations': 'PROYECTO SUBASTAS: Ubicación de productos en bodega.',

      // Infraestructura Supabase
      'auth.users': 'SUPABASE AUTH: Cuentas de autenticación de Supabase (3 usuarios).',
      'auth.refresh_tokens': 'SUPABASE AUTH: Tokens de refresco para sesiones JWT.',
      'storage.objects': 'SUPABASE STORAGE: Archivos multimedia y documentos almacenados en buckets (344 objetos).',
      'storage.buckets': 'SUPABASE STORAGE: Contenedores de archivos (core-logos, documentos, etc.).'
    };

    // Clasificación de Proyectos y Obsoletos
    const getClassification = (schema: string, tableName: string) => {
      // 1. Esquemas Obsoletos / Legacy
      if (['raw', 'staging', 'documents', 'quality', 'calidad'].includes(schema)) {
        return { status: 'OBSOLETO', label: 'Obsoleto / Legacy', badgeBg: '#f1f5f9', badgeColor: '#64748b' };
      }
      if (schema === 'piping' && ['legacy_joint_list', 'lineas', 'juntas', 'isometricos', 'valvulas', 'soportes', 'mto'].includes(tableName)) {
        return { status: 'OBSOLETO', label: 'Tabla Legacy Español (Reemplazada por Inglés)', badgeBg: '#fef3c7', badgeColor: '#b45309' };
      }
      if (schema === 'core' && ['proyectos', 'personal', 'equipos', 'cuadrillas', 'personal_proyectos'].includes(tableName)) {
        return { status: 'OBSOLETO', label: 'Tabla Legacy Español (Reemplazada por Inglés)', badgeBg: '#fef3c7', badgeColor: '#b45309' };
      }

      // 2. Esquema Luke Core (Este Proyecto - Tablas Inglés Normalizado)
      if (schema === 'core' || schema === 'piping' || (schema === 'public' && ['tenants', 'users', 'roles', 'projects', 'personnel', 'equipment', 'crews'].includes(tableName))) {
        return { status: 'CORE', label: 'Luke Core (Activo)', badgeBg: '#ecfdf5', badgeColor: '#047857' };
      }

      // 3. Proyectos Externos
      if (schema === 'quiz' || (schema === 'public' && ['quizzes', 'questions', 'games', 'answers', 'players'].includes(tableName))) {
        return { status: 'OTRO_PROYECTO', label: 'Proyecto Quiz (C:\\Github\\Quiz)', badgeBg: '#eff6ff', badgeColor: '#1d4ed8' };
      }
      if (schema === 'ruleta') {
        return { status: 'OTRO_PROYECTO', label: 'Proyecto Ruleta (C:\\Github\\Ruleta)', badgeBg: '#f5f3ff', badgeColor: '#6d28d9' };
      }
      if (schema === 'subastas') {
        return { status: 'OTRO_PROYECTO', label: 'Proyecto Subastas (TikTok Live)', badgeBg: '#fff7ed', badgeColor: '#c2410c' };
      }
      if (['auth', 'storage', 'realtime', '_realtime', 'net', 'vault', 'extensions', 'supabase_functions'].includes(schema)) {
        return { status: 'INFRA', label: 'Supabase Engine (Infraestructura)', badgeBg: '#f4f4f5', badgeColor: '#3f3f46' };
      }

      return { status: 'CORE', label: 'Luke Core (Activo)', badgeBg: '#ecfdf5', badgeColor: '#047857' };
    };

    const getDomain = (schema: string, tableName: string) => {
      if (schema === 'piping' || tableName.startsWith('piping_') || ['lineas', 'pid', 'isometricos', 'spools', 'juntas', 'valvulas', 'soportes', 'mto'].includes(tableName)) {
        return 'Ingeniería Piping & Proyectos';
      }
      if (['tenants', 'usuarios', 'roles', 'tenant_usuarios', 'system_logs'].includes(tableName) || schema === 'core') {
        return 'Core & Multi-Tenancy';
      }
      if (['personal', 'cuadrillas', 'cuadrilla_integrantes', 'asistencia'].includes(tableName) || schema === 'rrhh') {
        return 'Dotación & Personal RRHH';
      }
      if (['equipos', 'mantenciones', 'combustible'].includes(tableName)) {
        return 'Flota & Maquinarias';
      }
      if (tableName.startsWith('wa_') || tableName.startsWith('bot_')) {
        return 'WhatsApp Bot & Mensajería';
      }
      if (schema === 'quiz') return 'Proyecto Externo: Quiz Trivias';
      if (schema === 'ruleta') return 'Proyecto Externo: Ruleta Virtual';
      if (schema === 'subastas') return 'Proyecto Externo: Subastas TikTok Live';
      if (['auth', 'storage', 'realtime'].includes(schema)) return 'Supabase Platform Infra';
      return `Esquema: ${schema}`;
    };

    const getDescription = (fullKey: string, tableName: string) => {
      return TABLE_DESCRIPTIONS[fullKey] || TABLE_DESCRIPTIONS[tableName] || `Entidad de datos del sistema para la gestión de ${tableName.replace(/_/g, ' ')}.`;
    };

    // Estructurar respuesta final
    const tablesMap = await Promise.all(tablesResult.rows.map(async (t) => {
      const fullKey = `${t.table_schema}.${t.table_name}`;
      let rowCount = 0;
      try {
        const countRes = await query(`SELECT COUNT(*) AS total FROM "${t.table_schema}"."${t.table_name}"`);
        rowCount = parseInt(countRes.rows[0]?.total || '0', 10);
      } catch {
        rowCount = 0;
      }

      const pks = pkByTable[fullKey] || [];
      const cols = (columnsByTable[fullKey] || []).map(c => ({
        ...c,
        isPk: pks.includes(c.name)
      }));

      const displayName = t.table_schema !== 'public' ? `${t.table_schema}.${t.table_name}` : t.table_name;
      const classif = getClassification(t.table_schema, t.table_name);

      return {
        name: displayName,
        rawName: t.table_name,
        schema: t.table_schema,
        domain: getDomain(t.table_schema, t.table_name),
        description: getDescription(fullKey, t.table_name),
        classification: classif,
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
