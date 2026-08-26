import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const dbPool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

dbPool.on('error', (err) => {
  console.error('💥 [DATABASE] Error inesperado en el pool de PostgreSQL:', err);
});

/**
 * Ejecuta una consulta SQL estándar
 */
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const start = performance.now();
  const res = await dbPool.query<T>(text, params);
  const duration = (performance.now() - start).toFixed(2);
  
  if (env.NODE_ENV === 'development') {
    // console.log(`🔍 [SQL ${duration}ms]`, text.substring(0, 100).replace(/\s+/g, ' '));
  }
  return res;
}

/**
 * Ejecuta una consulta dentro de una transacción con contexto RLS de Tenant
 */
export async function withTenantContext<T>(
  tenantId: string | null,
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');
    if (tenantId) {
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
    }
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
