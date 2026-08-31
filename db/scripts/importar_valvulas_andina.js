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

function parseNumero(val) {
  if (!val) return 1;
  const v = val.replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(v);
  return isNaN(num) ? 1 : num;
}

async function main() {
  const possiblePaths = [
    '/home/ubuntu/DatosAndina/LIST_Piping_MS(LIST_Valvulas_MS).csv',
    'C:\\Github\\Core\\DatosAndina\\LIST_Piping_MS(LIST_Valvulas_MS).csv'
  ];
  let csvPath = possiblePaths.find(p => fs.existsSync(p));

  if (!csvPath) {
    console.error('No se encontró el archivo CSV de Válvulas.');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

  const header = parseCsvLine(lines[0]);
  console.log('Columnas Válvulas:', header);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener tenant eisa y proyecto 501
    const tRes = await client.query("SELECT id FROM core.tenants WHERE slug = 'eisa' LIMIT 1;");
    const tenantId = tRes.rows[0].id;

    const pRes = await client.query("SELECT id FROM core.proyectos WHERE codigo = '501' AND tenant_id = $1 LIMIT 1;", [tenantId]);
    const proyectoId = pRes.rows[0].id;

    // Obtener usuario Cristian Luke Cabello para created_by
    const uRes = await client.query("SELECT id FROM core.personal WHERE usuario_windows ILIKE '%CristianLukeCabello%' LIMIT 1;");
    const userId = uRes.rows[0]?.id || null;

    console.log(`Importando Válvulas para Tenant=${tenantId}, Proyecto=${proyectoId}, Usuario=${userId}...`);

    let insertados = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      if (!row || row.length < 5 || !row[0]) continue;

      const [
        idValvula,
        idMto,
        idLinea,
        clase,
        descripcion,
        tagPiping,
        correlativoMaqueta,
        numeroAconex,
        diagrama,
        tagInstrumentacion,
        diamNps,
        cantidad
      ] = row;

      // Buscar linea_id
      let lineaId = null;
      if (idLinea) {
        const lRes = await client.query(
          "SELECT id FROM piping.lineas WHERE proyecto_id = $1 AND codigo = $2 LIMIT 1;",
          [proyectoId, idLinea.trim()]
        );
        lineaId = lRes.rows[0]?.id || null;
      }

      // Insertar / Actualizar Válvula
      await client.query(`
        INSERT INTO piping.valvulas (
          tenant_id,
          proyecto_id,
          linea_id,
          codigo,
          tag,
          id_mto,
          codigo_linea,
          clase,
          descripcion,
          tag_piping,
          correlativo_maqueta,
          numero_aconex,
          diagrama,
          tag_instrumentacion,
          diametro_nps,
          cantidad,
          estado_actual,
          vigente,
          created_by,
          updated_by,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'EMITIDO', TRUE, $17, $17, NOW()
        )
        ON CONFLICT (proyecto_id, codigo) DO UPDATE SET
          linea_id = COALESCE(EXCLUDED.linea_id, piping.valvulas.linea_id),
          tag = EXCLUDED.tag,
          id_mto = EXCLUDED.id_mto,
          codigo_linea = EXCLUDED.codigo_linea,
          clase = EXCLUDED.clase,
          descripcion = EXCLUDED.descripcion,
          tag_piping = EXCLUDED.tag_piping,
          correlativo_maqueta = EXCLUDED.correlativo_maqueta,
          numero_aconex = EXCLUDED.numero_aconex,
          diagrama = EXCLUDED.diagrama,
          tag_instrumentacion = EXCLUDED.tag_instrumentacion,
          diametro_nps = EXCLUDED.diametro_nps,
          cantidad = EXCLUDED.cantidad,
          vigente = TRUE,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW();
      `, [
        tenantId,
        proyectoId,
        lineaId,
        idValvula.trim(),
        tagPiping ? tagPiping.trim() : idValvula.trim(),
        idMto ? idMto.trim() : null,
        idLinea ? idLinea.trim() : null,
        clase ? clase.trim() : null,
        descripcion ? descripcion.trim() : null,
        tagPiping ? tagPiping.trim() : null,
        correlativoMaqueta ? correlativoMaqueta.trim() : null,
        numeroAconex ? numeroAconex.trim() : null,
        diagrama ? diagrama.trim() : null,
        tagInstrumentacion ? tagInstrumentacion.trim() : null,
        diamNps ? diamNps.trim() : null,
        parseNumero(cantidad),
        userId
      ]);

      insertados++;
    }

    await client.query('COMMIT');
    console.log(`✅ Importación exitosa: ${insertados} válvulas de piping procesadas en el proyecto 501.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error importando válvulas:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
