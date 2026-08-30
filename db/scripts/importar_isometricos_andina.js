import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres'
});

function parseCsvLine(line, delimiter = ';') {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  const possiblePaths = [
    '/home/ubuntu/DatosAndina/LIST_Piping_MS(LIST_Isos_MS_).csv',
    'C:\\Github\\Core\\DatosAndina\\LIST_Piping_MS(LIST_Isos_MS_).csv'
  ];
  let csvPath = possiblePaths.find(p => fs.existsSync(p));

  if (!csvPath) {
    console.error('No se encontró el archivo CSV de Isométricos.');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

  const header = parseCsvLine(lines[0]);
  console.log('Columnas Isométricos:', header);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener tenant eisa y proyecto 501
    const tRes = await client.query("SELECT id FROM core.tenants WHERE slug = 'eisa' LIMIT 1;");
    const tenantId = tRes.rows[0].id;

    const pRes = await client.query("SELECT id FROM core.proyectos WHERE codigo = '501' AND tenant_id = $1 LIMIT 1;", [tenantId]);
    const proyectoId = pRes.rows[0].id;

    console.log(`Importando Isométricos para Tenant=${tenantId}, Proyecto=${proyectoId}...`);

    let insertados = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      if (!row || row.length < 4 || !row[0]) continue;

      const [
        idIso,
        idLinea,
        sheet,
        rev,
        planoContratista,
        planoCodelco,
        clase,
        nps,
        ingenieria,
        condicion,
        spooleado,
        estatus,
        distribuido,
        observaciones
      ] = row;

      // Buscar linea_id si existe
      let lineaId = null;
      if (idLinea) {
        const lRes = await client.query(
          "SELECT id FROM piping.lineas WHERE proyecto_id = $1 AND codigo = $2 LIMIT 1;",
          [proyectoId, idLinea.trim()]
        );
        lineaId = lRes.rows[0]?.id || null;
      }

      // Insertar Isométrico
      await client.query(`
        INSERT INTO piping.isometricos (
          tenant_id,
          proyecto_id,
          linea_id,
          codigo,
          hoja,
          revision_vigente,
          estado_documental,
          plano_contratista,
          plano_codelco,
          clase,
          nps,
          empresa_ingenieria,
          condicion,
          spooleado,
          distribuido,
          observacion,
          vigente,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, TRUE, NOW()
        )
        ON CONFLICT (proyecto_id, codigo, hoja) DO UPDATE SET
          linea_id = COALESCE(EXCLUDED.linea_id, piping.isometricos.linea_id),
          revision_vigente = EXCLUDED.revision_vigente,
          estado_documental = EXCLUDED.estado_documental,
          plano_contratista = EXCLUDED.plano_contratista,
          plano_codelco = EXCLUDED.plano_codelco,
          clase = EXCLUDED.clase,
          nps = EXCLUDED.nps,
          empresa_ingenieria = EXCLUDED.empresa_ingenieria,
          condicion = EXCLUDED.condicion,
          spooleado = EXCLUDED.spooleado,
          distribuido = EXCLUDED.distribuido,
          observacion = EXCLUDED.observacion,
          vigente = TRUE,
          updated_at = NOW();
      `, [
        tenantId,
        proyectoId,
        lineaId,
        idIso.trim(),
        sheet ? sheet.trim() : '1',
        rev ? rev.trim() : '0',
        estatus ? estatus.trim() : 'Vigente',
        planoContratista || null,
        planoCodelco || null,
        clase || null,
        nps ? `${nps}"` : null,
        ingenieria || null,
        condicion || null,
        spooleado || null,
        distribuido || null,
        observaciones || null
      ]);

      insertados++;
    }

    await client.query('COMMIT');
    console.log(`✅ Importación exitosa: ${insertados} isométricos de piping procesados en el proyecto 501.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error importando isométricos:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
