import jwt from 'jsonwebtoken';

const JWT_SECRET = 'super-secret-jwt-token-with-32-chars';

const tokenAnglo = jwt.sign(
  { sub: 'CRISTIANLUKECABELLO', tenant_id: '11111111-1111-1111-1111-111111111111', perm: 'sync', scope: 'excel_sync', rol: 'admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const tokenCodelco = jwt.sign(
  { sub: 'CRISTIANLUKECABELLO', tenant_id: '22222222-2222-2222-2222-222222222222', perm: 'sync', scope: 'excel_sync', rol: 'admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const BASE = 'http://127.0.0.1:3080';

async function testProject(nombre, idProy, token) {
  console.log(`\n================================================================`);
  console.log(`🏢 ${nombre} (Proyecto: ${idProy})`);
  console.log(`================================================================`);

  // 1. Configuración Día 0
  const cfgRes = await fetch(`${BASE}/api/piping/config?id_proyecto=${idProy}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const cfgJson = await cfgRes.json();
  const cfg = cfgJson.data;
  console.log(`⚙️ Configuración Día 0:`, {
    usa_pwht: cfg?.usa_pwht,
    controla_revisiones: cfg?.controla_revisiones,
    total_columnas_activas: cfg?.columnas_lineas?.length,
    columnas_activas: cfg?.columnas_lineas?.join(', ')
  });

  // 2. Líneas
  const linesRes = await fetch(`${BASE}/api/piping/lineas?id_proyecto=${idProy}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const linesJson = await linesRes.json();
  const lines = linesJson.data?.registros || [];
  console.log(`\n📏 Líneas (${lines.length} registradas):`);
  lines.forEach((l, idx) => {
    console.log(`   ${idx + 1}. [${l.line_tag}] NPS: ${l.nominal_size} | Clase: ${l.piping_class} | Material: ${l.material_base} | Presión: ${l.design_pressure} bar | PWHT: ${l.pwht_required}`);
  });

  // 3. Isométricos
  const isoRes = await fetch(`${BASE}/api/piping/isometricos?id_proyecto=${idProy}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const isoJson = await isoRes.json();
  const isos = isoJson.data?.registros || [];
  console.log(`\n📄 Isométricos (${isos.length} registrados):`);
  isos.forEach((i, idx) => {
    console.log(`   ${idx + 1}. [${i.iso_tag}] Línea: ${i.line_tag} | Tramo: ${i.line_segment} | Rev: ${i.current_revision} | PDF: ${i.document_url}`);
  });

  // 4. Spools con AWP
  const spoolsRes = await fetch(`${BASE}/api/piping/spools?id_proyecto=${idProy}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const spoolsJson = await spoolsRes.json();
  const spools = spoolsJson.data?.registros || [];
  console.log(`\n🔩 Spools (${spools.length} registrados):`);
  spools.forEach((s, idx) => {
    console.log(`   ${idx + 1}. [${s.spool_tag}] Iso: ${s.iso_tag} | CWP: ${s.cwp} | IWP: ${s.iwp} | Peso: ${s.weight_kg} kg | Etapa: ${s.current_stage}`);
  });

  // 5. MTO / Disponibilidad de Materiales
  const mtoRes = await fetch(`${BASE}/api/piping/mto?id_proyecto=${idProy}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const mtoJson = await mtoRes.json();
  const mtos = mtoJson.data?.registros || [];
  console.log(`\n📦 MTO / Cubicaciones (${mtos.length} registros):`);
  mtos.forEach((m, idx) => {
    console.log(`   ${idx + 1}. [${m.mto_tag}] Spool: ${m.spool_tag} | ${m.description} | Cant: ${m.quantity} ${m.unit} | Estado: ${m.material_status} | Colada: ${m.heat_number || 'PENDIENTE'}`);
  });
}

async function run() {
  await testProject('ANGLO AMERICAN SUR', 'LB-2026', tokenAnglo);
  await testProject('CODELCO EL TENIENTE', 'DT-N7', tokenCodelco);
}

run().catch(console.error);
