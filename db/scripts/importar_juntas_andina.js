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
  if (!val) return null;
  const v = val.replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(v);
  return isNaN(num) ? null : num;
}

async function main() {
  const possiblePaths = [
    '/home/ubuntu/DatosAndina/LIST_Piping_MS(LIST_Juntas_MS_).csv',
    'C:\\Github\\Core\\DatosAndina\\LIST_Piping_MS(LIST_Juntas_MS_).csv'
  ];
  let csvPath = possiblePaths.find(p => fs.existsSync(p));

  if (!csvPath) {
    console.error('No se encontró el archivo CSV de Juntas.');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

  const header = parseCsvLine(lines[0]);
  console.log('Columnas Juntas:', header.slice(0, 20));

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

    console.log(`Importando Juntas para Tenant=${tenantId}, Proyecto=${proyectoId}, Usuario=${userId}...`);

    let insertados = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      if (!row || row.length < 5 || !row[0]) continue;

      const [
        idJunta,
        idSpool,
        idIso,
        sistema,
        subSistema,
        testPack,
        area,
        idLinea,
        sheet,
        rev,
        spoolNum,
        numUnion,
        destination,
        tipoUnion,
        nps,
        sch,
        clase,
        aislacion,
        material,
        mts,
        nombreServicio,
        responsable,
        est,
        observaciones,
        suministro,
        preArmado,
        soldadura,
        pintura,
        montaje,
        touchUp,
        protocolos,
        total,
        acumulado,
        anterior,
        periodo,
        estatus,
        fecha,
        soldador
      ] = row;

      // Buscar spool_id e isometrico_id
      let spoolId = null;
      if (idSpool) {
        const sRes = await client.query(
          "SELECT id FROM piping.spools WHERE proyecto_id = $1 AND codigo = $2 LIMIT 1;",
          [proyectoId, idSpool.trim()]
        );
        spoolId = sRes.rows[0]?.id || null;
      }

      let isoId = null;
      if (idIso) {
        const iRes = await client.query(
          "SELECT id FROM piping.isometricos WHERE proyecto_id = $1 AND codigo = $2 LIMIT 1;",
          [proyectoId, idIso.trim()]
        );
        isoId = iRes.rows[0]?.id || null;
      }

      const estadoFinal = (estatus && estatus.trim() !== '') ? estatus.trim() : (est && est.trim() !== '' ? est.trim() : 'PENDIENTE');

      // Insertar / Actualizar Junta
      await client.query(`
        INSERT INTO piping.juntas (
          tenant_id,
          proyecto_id,
          isometrico_id,
          spool_id,
          codigo,
          numero_junta,
          sistema,
          sub_sistema,
          test_pack,
          tipo_union_codigo,
          destination,
          nps_codigo,
          sch,
          clase,
          material,
          metros,
          servicio,
          responsable,
          soldador,
          observaciones,
          porc_total,
          estado_actual,
          vigente,
          created_by,
          updated_by,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, TRUE, $23, $23, NOW()
        )
        ON CONFLICT (proyecto_id, codigo) DO UPDATE SET
          spool_id = COALESCE(EXCLUDED.spool_id, piping.juntas.spool_id),
          isometrico_id = COALESCE(EXCLUDED.isometrico_id, piping.juntas.isometrico_id),
          numero_junta = EXCLUDED.numero_junta,
          sistema = EXCLUDED.sistema,
          sub_sistema = EXCLUDED.sub_sistema,
          test_pack = EXCLUDED.test_pack,
          tipo_union_codigo = EXCLUDED.tipo_union_codigo,
          destination = EXCLUDED.destination,
          nps_codigo = EXCLUDED.nps_codigo,
          sch = EXCLUDED.sch,
          clase = EXCLUDED.clase,
          material = EXCLUDED.material,
          metros = EXCLUDED.metros,
          servicio = EXCLUDED.servicio,
          responsable = EXCLUDED.responsable,
          soldador = EXCLUDED.soldador,
          observaciones = EXCLUDED.observaciones,
          porc_total = EXCLUDED.porc_total,
          estado_actual = EXCLUDED.estado_actual,
          vigente = TRUE,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW();
      `, [
        tenantId,
        proyectoId,
        isoId,
        spoolId,
        idJunta.trim(),
        numUnion ? numUnion.trim() : '0',
        sistema ? sistema.trim() : null,
        subSistema ? subSistema.trim() : null,
        testPack ? testPack.trim() : null,
        tipoUnion ? tipoUnion.trim() : null,
        destination ? destination.trim() : null,
        nps ? `${nps}"` : null,
        sch ? sch.trim() : null,
        clase ? clase.trim() : null,
        material ? material.trim() : null,
        parseNumero(mts),
        nombreServicio ? nombreServicio.trim() : null,
        responsable ? responsable.trim() : null,
        soldador ? soldador.trim() : null,
        observaciones ? observaciones.trim() : null,
        parseNumero(total),
        estadoFinal,
        userId
      ]);

      insertados++;
    }

    await client.query('COMMIT');
    console.log(`✅ Importación exitosa: ${insertados} juntas de piping procesadas en el proyecto 501.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error importando juntas:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
