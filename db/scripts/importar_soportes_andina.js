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
  if (!val || val === '-') return null;
  const v = val.replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(v);
  return isNaN(num) ? null : num;
}

async function main() {
  const possiblePaths = [
    '/home/ubuntu/DatosAndina/LIST_Piping_MS(LIST_Soportes_MS).csv',
    'C:\\Github\\Core\\DatosAndina\\LIST_Piping_MS(LIST_Soportes_MS).csv'
  ];
  let csvPath = possiblePaths.find(p => fs.existsSync(p));

  if (!csvPath) {
    console.error('No se encontró el archivo CSV de Soportes.');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

  const header = parseCsvLine(lines[0]);
  console.log('Columnas Soportes:', header);

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

    console.log(`Importando Soportes para Tenant=${tenantId}, Proyecto=${proyectoId}, Usuario=${userId}...`);

    let insertados = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      if (!row || row.length < 5 || !row[0]) continue;

      const [
        idSoporte,
        item,
        ewp,
        cwp,
        cwa,
        pwp,
        idLinea,
        idIso,
        clase,
        idTipoSoporte,
        diam,
        cantidad,
        unidad,
        pesoTotal,
        unidad2,
        suministro,
        observaciones
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

      // Insertar / Actualizar Soporte
      await client.query(`
        INSERT INTO piping.soportes (
          tenant_id,
          proyecto_id,
          linea_id,
          codigo,
          tag,
          item_numero,
          ewp,
          cwp,
          cwa,
          pwp,
          codigo_linea,
          codigo_iso,
          clase,
          tipo_soporte,
          diametro_nps,
          cantidad,
          unidad,
          peso_kg,
          suministro,
          observaciones,
          estado_actual,
          vigente,
          created_by,
          updated_by,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'EMITIDO', TRUE, $21, $21, NOW()
        )
        ON CONFLICT (proyecto_id, codigo) DO UPDATE SET
          linea_id = COALESCE(EXCLUDED.linea_id, piping.soportes.linea_id),
          tag = EXCLUDED.tag,
          item_numero = EXCLUDED.item_numero,
          ewp = EXCLUDED.ewp,
          cwp = EXCLUDED.cwp,
          cwa = EXCLUDED.cwa,
          pwp = EXCLUDED.pwp,
          codigo_linea = EXCLUDED.codigo_linea,
          codigo_iso = EXCLUDED.codigo_iso,
          clase = EXCLUDED.clase,
          tipo_soporte = EXCLUDED.tipo_soporte,
          diametro_nps = EXCLUDED.diametro_nps,
          cantidad = EXCLUDED.cantidad,
          unidad = EXCLUDED.unidad,
          peso_kg = EXCLUDED.peso_kg,
          suministro = EXCLUDED.suministro,
          observaciones = EXCLUDED.observaciones,
          vigente = TRUE,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW();
      `, [
        tenantId,
        proyectoId,
        lineaId,
        idSoporte.trim(),
        item ? `ITEM-${item.trim()}` : idSoporte.trim(),
        item ? item.trim() : null,
        ewp ? ewp.trim() : null,
        cwp ? cwp.trim() : null,
        cwa ? cwa.trim() : null,
        pwp ? pwp.trim() : null,
        idLinea ? idLinea.trim() : null,
        idIso ? idIso.trim() : null,
        clase ? clase.trim() : null,
        idTipoSoporte ? idTipoSoporte.trim() : null,
        diam ? diam.trim() : null,
        parseNumero(cantidad) || 1,
        unidad ? unidad.trim() : 'un',
        parseNumero(pesoTotal),
        suministro ? suministro.trim() : null,
        observaciones ? observaciones.trim() : null,
        userId
      ]);

      insertados++;
    }

    await client.query('COMMIT');
    console.log(`✅ Importación exitosa: ${insertados} soportes de piping procesados en el proyecto 501.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error importando soportes:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
