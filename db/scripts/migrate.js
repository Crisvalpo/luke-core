import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function runMigrations() {
  const client = await pool.connect();
  console.log('🚀 [MIGRACIONES] Conectado a la base de datos PostgreSQL.');

  try {
    const migrationsDir = path.resolve(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📁 [MIGRACIONES] Se encontraron ${files.length} archivos de migración.`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`⏳ [MIGRACIONES] Ejecutando: ${file}...`);
      await client.query('BEGIN');
      await client.query(sql);

      // Registrar migración en la tabla interna de control
      await client.query(`
        INSERT INTO core._migrations (name) 
        VALUES ($1) 
        ON CONFLICT (name) DO NOTHING;
      `, [file]);

      await client.query('COMMIT');
      console.log(`✅ [MIGRACIONES] ${file} completado con éxito.`);
    }

    console.log('🎉 [MIGRACIONES] ¡Todas las migraciones se aplicaron satisfactoriamente!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [MIGRACIONES] Error durante la ejecución de migraciones:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
