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
    '/home/ubuntu/DatosAndina/LIST_Piping_MS(LIST_MTO_MS).csv',
    'C:\\Github\\Core\\DatosAndina\\LIST_Piping_MS(LIST_MTO_MS).csv'
  ];
  let csvPath = possiblePaths.find(p => fs.existsSync(p));

  if (!csvPath) {
    console.error('No se encontró el archivo CSV de MTO.');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

  const header = parseCsvLine(lines[0]);
  console.log('Columnas MTO:', header);

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

    console.log(`Importando MTO para Tenant=${tenantId}, Proyecto=${proyectoId}, Usuario=${userId}...`);

    let insertados = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      if (!row || row.length < 12 || !row[0]) continue;

      const [
        idMto,
        tablaCub,
        item,
        ewp,
        cwp,
        cwa,
        pwp,
        idLinea,
        idIso,
        idSpool,
        clase,
        descripcion,
        diam,
        cantidad,
        unidad,
        revisado,
        pesoTotal,
        unidad2,
        suministro,
        grupo,
        proveedor,
        ordenCompra,
        etaObra,
        recepcionado,
        solicitado,
        despachado,
        usuarioCompra,
        revisionMat,
        prioridadFab,
        cantReal,
        ubicacionActual,
        fechaControl,
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

      // Buscar isometrico_id
      let isoId = null;
      if (idIso) {
        const iRes = await client.query(
          "SELECT id FROM piping.isometricos WHERE proyecto_id = $1 AND codigo = $2 LIMIT 1;",
          [proyectoId, idIso.trim()]
        );
        isoId = iRes.rows[0]?.id || null;
      }

      // Buscar spool_id
      let spoolId = null;
      if (idSpool) {
        const sRes = await client.query(
          "SELECT id FROM piping.spools WHERE proyecto_id = $1 AND codigo = $2 LIMIT 1;",
          [proyectoId, idSpool.trim()]
        );
        spoolId = sRes.rows[0]?.id || null;
      }

      // Insertar / Actualizar MTO
      await client.query(`
        INSERT INTO piping.mto (
          tenant_id,
          proyecto_id,
          linea_id,
          isometrico_id,
          spool_id,
          codigo,
          item_numero,
          ewp,
          cwp,
          cwa,
          pwp,
          codigo_linea,
          codigo_iso,
          codigo_spool,
          clase,
          grupo_material,
          descripcion,
          diametro_nps,
          cantidad,
          unidad,
          peso_kg,
          suministro,
          proveedor,
          orden_compra,
          recepcionado,
          solicitado,
          despachado,
          cantidad_real,
          ubicacion_actual,
          estado_material,
          prioridad_fab,
          observaciones,
          estado_actual,
          vigente,
          created_by,
          updated_by,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, 'EMITIDO', TRUE, $33, $33, NOW()
        )
        ON CONFLICT (proyecto_id, codigo) DO UPDATE SET
          linea_id = COALESCE(EXCLUDED.linea_id, piping.mto.linea_id),
          isometrico_id = COALESCE(EXCLUDED.isometrico_id, piping.mto.isometrico_id),
          spool_id = COALESCE(EXCLUDED.spool_id, piping.mto.spool_id),
          item_numero = EXCLUDED.item_numero,
          ewp = EXCLUDED.ewp,
          cwp = EXCLUDED.cwp,
          cwa = EXCLUDED.cwa,
          pwp = EXCLUDED.pwp,
          codigo_linea = EXCLUDED.codigo_linea,
          codigo_iso = EXCLUDED.codigo_iso,
          codigo_spool = EXCLUDED.codigo_spool,
          clase = EXCLUDED.clase,
          grupo_material = EXCLUDED.grupo_material,
          descripcion = EXCLUDED.descripcion,
          diametro_nps = EXCLUDED.diametro_nps,
          cantidad = EXCLUDED.cantidad,
          unidad = EXCLUDED.unidad,
          peso_kg = EXCLUDED.peso_kg,
          suministro = EXCLUDED.suministro,
          proveedor = EXCLUDED.proveedor,
          orden_compra = EXCLUDED.orden_compra,
          recepcionado = EXCLUDED.recepcionado,
          solicitado = EXCLUDED.solicitado,
          despachado = EXCLUDED.despachado,
          cantidad_real = EXCLUDED.cantidad_real,
          ubicacion_actual = EXCLUDED.ubicacion_actual,
          estado_material = EXCLUDED.estado_material,
          prioridad_fab = EXCLUDED.prioridad_fab,
          observaciones = EXCLUDED.observaciones,
          vigente = TRUE,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW();
      `, [
        tenantId,
        proyectoId,
        lineaId,
        isoId,
        spoolId,
        idMto.trim(),
        item ? item.trim() : null,
        ewp ? ewp.trim() : null,
        cwp ? cwp.trim() : null,
        cwa ? cwa.trim() : null,
        pwp ? pwp.trim() : null,
        idLinea ? idLinea.trim() : null,
        idIso ? idIso.trim() : null,
        idSpool ? idSpool.trim() : null,
        clase ? clase.trim() : null,
        grupo ? grupo.trim() : null,
        descripcion ? descripcion.trim() : 'Sin descripción',
        diam ? diam.trim() : null,
        parseNumero(cantidad) || 1,
        unidad ? unidad.trim() : 'un',
        pesoTotal ? parseNumero(pesoTotal) : null,
        suministro ? suministro.trim() : null,
        proveedor ? proveedor.trim() : null,
        ordenCompra ? ordenCompra.trim() : null,
        recepcionado ? (recepcionado.toLowerCase() === 'si' || recepcionado.toLowerCase() === 'true' || recepcionado === '1') : false,
        parseNumero(solicitado),
        parseNumero(despachado),
        parseNumero(cantReal),
        ubicacionActual ? ubicacionActual.trim() : null,
        revisionMat ? revisionMat.trim() : 'SIN REVISAR',
        prioridadFab ? prioridadFab.trim() : null,
        observaciones ? observaciones.trim() : null,
        userId
      ]);

      insertados++;
    }

    await client.query('COMMIT');
    console.log(`✅ Importación exitosa: ${insertados} registros de MTO procesados en el proyecto 501.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error importando MTO:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
