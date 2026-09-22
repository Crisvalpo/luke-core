import { dbPool } from './src/config/database.js';

async function check() {
  const query = `
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema IN ('core', 'piping', 'raw', 'staging', 'documents', 'quality', 'calidad')
    ORDER BY table_schema, table_name;
  `;
  const res = await dbPool.query(query);
  for (const r of res.rows) {
    try {
      const cnt = await dbPool.query(`SELECT COUNT(*) FROM "${r.table_schema}"."${r.table_name}"`);
      console.log(`${r.table_schema}.${r.table_name}: ${cnt.rows[0].count} filas`);
    } catch (e) {
      console.log(`${r.table_schema}.${r.table_name}: ERROR - ${e.message}`);
    }
  }
  process.exit(0);
}

check();
