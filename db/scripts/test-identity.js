import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function testIdentity() {
  const client = await pool.connect();
  console.log('🧪 [TEST] Probando resolución de identidad ultra rápida por WhatsApp...');

  try {
    const start = performance.now();
    const testPhone = '+56977778888'; // Teléfono de Cristian Cabello en EIM

    const result = await client.query(`
      SELECT * FROM core.resolver_identidad_whatsapp($1);
    `, [testPhone]);

    const duration = (performance.now() - start).toFixed(2);

    if (result.rows.length > 0 && result.rows[0].encontrado) {
      console.log(`⚡ [OK] Identidad resuelta en ${duration} ms:`);
      console.log(JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log(`⚠️ [TEST] No se encontró usuario para el teléfono ${testPhone}.`);
    }

  } catch (error) {
    console.error('❌ [TEST] Error en test de identidad:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testIdentity();
