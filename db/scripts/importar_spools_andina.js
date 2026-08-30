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
    '/home/ubuntu/DatosAndina/LIST_Piping_MS(LIST_Spools_MS_).csv',
    'C:\\Github\\Core\\DatosAndina\\LIST_Piping_MS(LIST_Spools_MS_).csv'
  ];
  let csvPath = possiblePaths.find(p => fs.existsSync(p));

  if (!csvPath) {
    console.error('No se encontró el archivo CSV de Spools.');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

  const header = parseCsvLine(lines[0]);
  console.log('Columnas Spools:', header);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener tenant eisa y proyecto 501
    const tRes = await client.query("SELECT id FROM core.tenants WHERE slug = 'eisa' LIMIT 1;");
    const tenantId = tRes.rows[0].id;

    const pRes = await client.query("SELECT id FROM core.proyectos WHERE codigo = '501' AND tenant_id = $1 LIMIT 1;", [tenantId]);
    const proyectoId = pRes.rows[0].id;

    console.log(`Importando Spools para Tenant=${tenantId}, Proyecto=${proyectoId}...`);

    let insertados = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      if (!row || row.length < 5 || !row[0]) continue;

      const [
        idSpool,
        tagGestion,
        idIso,
        sistema,
        subSistema,
        testPack,
        area,
        idLinea,
        sheet,
        rev,
        spoolNum,
        nps,
        aislacion,
        material,
        nombreServicio,
        esquema,
        ral,
        totalUniones,
        avanceUniones,
        responsable,
        proceso,
        pinturaRevestimiento,
        recibido,
        posicionado,
        montaje,
        ubicacion,
        total,
        observaciones
      ] = row;

      // Buscar isometrico_id si existe
      let isoId = null;
      if (idIso) {
        const iRes = await client.query(
          "SELECT id FROM piping.isometricos WHERE proyecto_id = $1 AND codigo = $2 LIMIT 1;",
          [proyectoId, idIso.trim()]
        );
        isoId = iRes.rows[0]?.id || null;
      }

      // Insertar / Actualizar Spool
      await client.query(`
        INSERT INTO piping.spools (
          tenant_id,
          proyecto_id,
          isometrico_id,
          codigo,
          tag,
          tag_gestion,
          sistema,
          sub_sistema,
          test_pack,
          area,
          codigo_linea,
          hoja,
          revision,
          spool_numero,
          nps,
          material,
          servicio,
          esquema_pintura,
          ral,
          proceso,
          pintura_revestimiento,
          estado_actual,
          ubicacion_actual,
          observaciones,
          vigente,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, TRUE, NOW()
        )
        ON CONFLICT (proyecto_id, isometrico_id, codigo) DO UPDATE SET
          tag = EXCLUDED.tag,
          tag_gestion = EXCLUDED.tag_gestion,
          sistema = EXCLUDED.sistema,
          sub_sistema = EXCLUDED.sub_sistema,
          test_pack = EXCLUDED.test_pack,
          area = EXCLUDED.area,
          codigo_linea = EXCLUDED.codigo_linea,
          hoja = EXCLUDED.hoja,
          revision = EXCLUDED.revision,
          spool_numero = EXCLUDED.spool_numero,
          nps = EXCLUDED.nps,
          material = EXCLUDED.material,
          servicio = EXCLUDED.servicio,
          esquema_pintura = EXCLUDED.esquema_pintura,
          ral = EXCLUDED.ral,
          proceso = EXCLUDED.proceso,
          pintura_revestimiento = EXCLUDED.pintura_revestimiento,
          estado_actual = EXCLUDED.estado_actual,
          ubicacion_actual = EXCLUDED.ubicacion_actual,
          observaciones = EXCLUDED.observaciones,
          vigente = TRUE,
          updated_at = NOW();
      `, [
        tenantId,
        proyectoId,
        isoId,
        idSpool.trim(),
        tagGestion ? `TAG-${tagGestion.trim()}` : idSpool.trim(),
        tagGestion || null,
        sistema || null,
        subSistema || null,
        testPack || null,
        area || null,
        idLinea || null,
        sheet || null,
        rev || null,
        spoolNum || null,
        nps ? `${nps}"` : null,
        material || null,
        nombreServicio || null,
        esquema || null,
        ral || null,
        proceso || null,
        pinturaRevestimiento || null,
        proceso || 'ACTIVO',
        ubicacion || null,
        observaciones || null
      ]);

      insertados++;
    }

    await client.query('COMMIT');
    console.log(`✅ Importación exitosa: ${insertados} spools de piping procesados en el proyecto 501.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error importando spools:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
