import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function runSeeds() {
  const client = await pool.connect();
  console.log('🌱 [SEMILLAS] Conectado a la base de datos PostgreSQL.');

  try {
    const seedsDir = path.resolve(__dirname, '../seeds');
    const files = fs.readdirSync(seedsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📁 [SEMILLAS] Se encontraron ${files.length} archivos de semillas.`);

    for (const file of files) {
      const filePath = path.join(seedsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`⏳ [SEMILLAS] Aplicando semilla: ${file}...`);
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`✅ [SEMILLAS] ${file} aplicado con éxito.`);
    }

    console.log('🎉 [SEMILLAS] ¡Semillas maestras (EIM y TNS) aplicadas con éxito!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [SEMILLAS] Error al aplicar semillas:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeeds();
