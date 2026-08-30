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

function parseNumeric(val) {
  if (!val) return null;
  const clean = val.replace(',', '.').replace(/[^0-9.-]/g, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

async function main() {
  const possiblePaths = [
    '/home/ubuntu/DatosAndina/LIST_Piping_MS(LIST_Lineas_MS_).csv',
    'C:\\Github\\Core\\DatosAndina\\LIST_Piping_MS(LIST_Lineas_MS_).csv'
  ];
  let csvPath = possiblePaths.find(p => fs.existsSync(p));

  if (!csvPath) {
    console.error('No se encontró el archivo CSV en ninguna ruta.');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

  const header = parseCsvLine(lines[0]);
  console.log('Columnas CSV:', header);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener tenant eisa y proyecto 501
    const tRes = await client.query("SELECT id FROM core.tenants WHERE slug = 'eisa' LIMIT 1;");
    const tenantId = tRes.rows[0].id;

    const pRes = await client.query("SELECT id FROM core.proyectos WHERE codigo = '501' AND tenant_id = $1 LIMIT 1;", [tenantId]);
    const proyectoId = pRes.rows[0].id;

    console.log(`Importando para Tenant=${tenantId}, Proyecto=${proyectoId}...`);

    let insertados = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      if (!row || row.length < 5 || !row[0]) continue;

      const [
        idLinea,
        clase,
        nps,
        servicio,
        tipoMaterial,
        planoCodelco,
        mts,
        fromOrigen,
        toDestino,
        tempDiseno,
        presionDiseno,
        tipoPrueba,
        esquema,
        ral,
        revestimientoInterior,
        aislacion,
        observaciones
      ] = row;

      // 2. Asegurar Fluido
      let fluidoId = null;
      if (servicio) {
        const fRes = await client.query(`
          INSERT INTO piping.cat_fluidos_proyecto (tenant_id, proyecto_id, codigo, nombre, servicio)
          VALUES ($1, $2, $3, $3, $3)
          ON CONFLICT (proyecto_id, codigo) DO UPDATE SET nombre = EXCLUDED.nombre
          RETURNING id;
        `, [tenantId, proyectoId, servicio.trim()]);
        fluidoId = fRes.rows[0]?.id;
      }

      // 3. Asegurar Clase
      let claseId = null;
      if (clase) {
        const cRes = await client.query(`
          INSERT INTO piping.cat_clases_proyecto (tenant_id, proyecto_id, codigo, material_base)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (proyecto_id, codigo) DO UPDATE SET material_base = COALESCE(EXCLUDED.material_base, piping.cat_clases_proyecto.material_base)
          RETURNING id;
        `, [tenantId, proyectoId, clase.trim(), tipoMaterial || 'CS']);
        claseId = cRes.rows[0]?.id;
      }

      // 4. Insertar / Actualizar Línea
      await client.query(`
        INSERT INTO piping.lineas (
          tenant_id,
          proyecto_id,
          codigo,
          fluido_proyecto_id,
          clase_proyecto_id,
          nps_codigo,
          diametro_numerico,
          origen,
          destino,
          presion_diseno,
          temperatura_diseno,
          material,
          plano_codelco,
          metros,
          tipo_prueba,
          esquema_pintura,
          ral,
          revestimiento_interior,
          aislacion,
          observaciones,
          vigente,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, TRUE, NOW()
        )
        ON CONFLICT (proyecto_id, codigo) DO UPDATE SET
          fluido_proyecto_id = EXCLUDED.fluido_proyecto_id,
          clase_proyecto_id = EXCLUDED.clase_proyecto_id,
          nps_codigo = EXCLUDED.nps_codigo,
          diametro_numerico = EXCLUDED.diametro_numerico,
          origen = EXCLUDED.origen,
          destino = EXCLUDED.destino,
          presion_diseno = EXCLUDED.presion_diseno,
          temperatura_diseno = EXCLUDED.temperatura_diseno,
          material = EXCLUDED.material,
          plano_codelco = EXCLUDED.plano_codelco,
          metros = EXCLUDED.metros,
          tipo_prueba = EXCLUDED.tipo_prueba,
          esquema_pintura = EXCLUDED.esquema_pintura,
          ral = EXCLUDED.ral,
          revestimiento_interior = EXCLUDED.revestimiento_interior,
          aislacion = EXCLUDED.aislacion,
          observaciones = EXCLUDED.observaciones,
          vigente = TRUE,
          updated_at = NOW();
      `, [
        tenantId,
        proyectoId,
        idLinea.trim(),
        fluidoId,
        claseId,
        nps ? `${nps}"` : null,
        parseNumeric(nps),
        fromOrigen || null,
        toDestino || null,
        parseNumeric(presionDiseno),
        parseNumeric(tempDiseno),
        tipoMaterial || null,
        planoCodelco || null,
        parseNumeric(mts),
        tipoPrueba || null,
        esquema || null,
        ral || null,
        revestimientoInterior || null,
        aislacion || null,
        observaciones || null
      ]);

      insertados++;
    }

    await client.query('COMMIT');
    console.log(`✅ Importación exitosa: ${insertados} líneas de piping procesadas en el proyecto 501.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error importando líneas:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
