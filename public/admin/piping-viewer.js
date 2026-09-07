// =============================================================================
// VISOR Y GESTOR WEB DE PIPING PARA EL CUBICADOR
// =============================================================================

let visorState = {
  proyecto: null,
  tab: 'lineas',
  datos: [],
  busqueda: ''
};

const TAB_CONFIG = {
  pid: { titulo: 'P&IDs', icono: '📑', colHeaders: ['Código P&ID', 'Título del Plano', 'Rev', 'Estado', 'Archivo PDF', 'Responsable'] },
  lineas: { titulo: 'Líneas de Piping', icono: '📏', colHeaders: ['Tag Línea', 'NPS', 'Servicio', 'Clase', 'Material', 'P&ID Ref', 'Longitud (m)', 'Presión (bar)', 'Estado'] },
  isometricos: { titulo: 'Isométricos', icono: '📐', colHeaders: ['Código Isométrico', 'Hoja', 'Línea Padre', 'Rev', 'Plano Cliente', 'Estado Spooleado', 'Estado'] },
  spools: { titulo: 'Spools', icono: '🔩', colHeaders: ['Código Spool', 'Isométrico', 'Tipo', 'Peso (kg)', 'Longitud (m)', 'Ubicación Actual', 'Etapa', 'Estado'] },
  'lista-juntas': { titulo: 'Juntas / Soldaduras', icono: '⚡', colHeaders: ['ID Junta', 'Isométrico', 'Spool', 'Tipo (BW/FW)', 'NPS', 'Clase', 'Material', 'Estado Soldadura'] },
  valvulas: { titulo: 'Válvulas', icono: '🚰', colHeaders: ['Tag Válvula', 'Línea', 'NPS', 'Clase', 'Descripción', 'Estado Montaje'] },
  soportes: { titulo: 'Soportes', icono: '🗜️', colHeaders: ['Tag Soporte', 'Línea', 'Isométrico', 'Tipo Soporte', 'NPS', 'Alcance', 'Estado Fabricación'] },
  mto: { titulo: 'MTO / Cubicaciones', icono: '📦', colHeaders: ['Código Material', 'Descripción', 'Línea / Iso', 'NPS', 'Cantidad', 'Unidad', 'Bodega', 'Estado'] }
};

function abrirVisorPiping(proyectoId, codigo, nombre) {
  visorState.proyecto = { id: proyectoId, codigo, nombre };
  visorState.tab = 'lineas';
  visorState.busqueda = '';

  const tenantsGrid = document.getElementById('tenants-container');
  const dotacionSec = document.getElementById('dotacion-container');
  const visorSec = document.getElementById('visor-piping-container');
  const topbarTitulo = document.getElementById('topbar-titulo');

  if (tenantsGrid) tenantsGrid.style.display = 'none';
  if (dotacionSec) dotacionSec.style.display = 'none';
  if (visorSec) visorSec.style.display = 'block';

  document.getElementById('visor-proy-titulo').innerText = `${codigo} — ${nombre}`;
  if (topbarTitulo) topbarTitulo.innerText = `Ingeniería Piping — ${codigo}`;

  actualizarTabsUI();
  cargarDatosTabPiping();
}

function cerrarVisorPiping() {
  const visorSec = document.getElementById('visor-piping-container');
  if (visorSec) visorSec.style.display = 'none';
  navegarASeccion('proyectos');
}

function cambiarTabPiping(nuevoTab) {
  if (visorState.tab === nuevoTab) return;
  visorState.tab = nuevoTab;
  visorState.busqueda = '';
  const searchInput = document.getElementById('visor-busqueda-input');
  if (searchInput) searchInput.value = '';
  actualizarTabsUI();
  cargarDatosTabPiping();
}

function actualizarTabsUI() {
  document.querySelectorAll('.piping-tab-btn').forEach(btn => {
    const t = btn.getAttribute('data-tab');
    if (t === visorState.tab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

async function cargarDatosTabPiping() {
  const tbody = document.getElementById('visor-tabla-body');
  const thead = document.getElementById('visor-tabla-head');
  const contador = document.getElementById('visor-contador-registros');
  if (!tbody) return;

  const conf = TAB_CONFIG[visorState.tab] || TAB_CONFIG.lineas;
  thead.innerHTML = `<tr>${conf.colHeaders.map(h => `<th style="padding: 0.75rem 1rem;">${h}</th>`).join('')}</tr>`;
  tbody.innerHTML = `<tr><td colspan="${conf.colHeaders.length}" style="text-align: center; padding: 2.5rem; color: var(--color-text-muted);">Cargando ${conf.titulo}...</td></tr>`;

  try {
    const res = await fetch(`/api/v1/piping/${visorState.tab}?id_proyecto=${encodeURIComponent(visorState.proyecto.codigo)}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error al obtener datos');

    visorState.datos = json.data?.registros || [];
    if (contador) contador.innerText = `${visorState.datos.length} registros`;
    renderizarFilasPiping();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="${conf.colHeaders.length}" style="text-align: center; padding: 2.5rem; color: #dc2626;">Error al cargar datos: ${err.message}</td></tr>`;
  }
}

function filtrarVisorPiping(texto) {
  visorState.busqueda = (texto || '').toLowerCase().trim();
  renderizarFilasPiping();
}

function renderizarFilasPiping() {
  const tbody = document.getElementById('visor-tabla-body');
  const conf = TAB_CONFIG[visorState.tab] || TAB_CONFIG.lineas;
  if (!tbody) return;

  let filtrados = visorState.datos;
  if (visorState.busqueda) {
    filtrados = filtrados.filter(item => {
      const rowStr = JSON.stringify(Object.values(item)).toLowerCase();
      return rowStr.includes(visorState.busqueda);
    });
  }

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${conf.colHeaders.length}" style="text-align: center; padding: 2.5rem; color: var(--color-text-muted);">${visorState.busqueda ? 'No se encontraron coincidencias para la búsqueda.' : `No hay registros en ${conf.titulo}.`}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtrados.map(r => generarFilaSegunTab(visorState.tab, r)).join('');
}

function badgeEstadoPiping(val) {
  const v = (val || '').toUpperCase();
  let bg = '#f1f5f9', color = '#475569', border = '#cbd5e1';
  if (['SOLDADA', 'MONTADA', 'VIGENTE', 'ACTIVO', 'FABRICADO', 'RECEPCIONADO', 'EN BODEGA'].some(k => v.includes(k))) {
    bg = '#dcfce7'; color = '#15803d'; border = '#86efac';
  } else if (['PREFABRICADO', 'MAESTRANZA', 'POR MONTAR', 'SPOOLEADO', 'EMITIDO'].some(k => v.includes(k))) {
    bg = '#e0f2fe'; color = '#0369a1'; border = '#bae6fd';
  } else if (['PENDIENTE', 'POR_FABRICAR', 'POR_MONTAR'].some(k => v.includes(k))) {
    bg = '#fef3c7'; color = '#b45309'; border = '#fde68a';
  } else if (['RECHAZADO', 'OBSOLETO', 'DETENIDO'].some(k => v.includes(k))) {
    bg = '#fee2e2'; color = '#b91c1c'; border = '#fca5a5';
  }
  return `<span class="module-pill" style="background: ${bg}; color: ${color}; border-color: ${border}; font-weight: 600;">${val || '—'}</span>`;
}

function generarFilaSegunTab(tab, r) {
  let celdas = [];
  if (tab === 'pid') {
    celdas = [
      `<strong>${r.codigo_pid || '—'}</strong>`, r.titulo || '—', r.revision || '0', badgeEstadoPiping(r.estado),
      r.archivo_pdf ? `<a href="#" style="color: #0284c7; text-decoration: underline;">📄 ${r.archivo_pdf}</a>` : '—',
      r.responsable || '—'
    ];
  } else if (tab === 'lineas') {
    celdas = [
      `<strong>${r.line_tag || r.codigo_linea || '—'}</strong>`, r.nominal_size || '—', r.service_code || '—',
      r.piping_class || '—', r.material_base || '—', r.pid_reference || '—',
      r.total_length ? `${r.total_length} m` : '—', r.design_pressure_bar ? `${r.design_pressure_bar} bar` : '—',
      badgeEstadoPiping(r.line_status || r.estado)
    ];
  } else if (tab === 'isometricos') {
    celdas = [
      `<strong>${r.iso_tag || r.codigo_iso || '—'}</strong>`, r.sheet_no || '1', r.line_tag || '—',
      r.current_revision || '—', r.client_drawing_no || '—', badgeEstadoPiping(r.spooling_status || 'SPOOLEADO'),
      badgeEstadoPiping(r.iso_status || r.estado)
    ];
  } else if (tab === 'spools') {
    celdas = [
      `<strong>${r.spool_tag || r.codigo_spool || '—'}</strong>`, r.iso_tag || '—', r.spool_type || 'FIGURADO',
      r.total_weight_kg ? `${r.total_weight_kg} kg` : '—', r.total_length_m ? `${r.total_length_m} m` : '—',
      badgeEstadoPiping(r.current_location || 'MAESTRANZA'), badgeEstadoPiping(r.current_stage || 'FABRICADO'),
      badgeEstadoPiping(r.spool_status || 'ACTIVO')
    ];
  } else if (tab === 'lista-juntas') {
    celdas = [
      `<strong>${r.id_junta || r.tag || '—'}</strong>`, r.codigo_iso || '—', r.codigo_spool || '—',
      r.tipo_junta || 'BW', r.diametro_nps || '—', r.clase || '—', r.material || '—',
      badgeEstadoPiping(r.estado || 'SOLDADA')
    ];
  } else if (tab === 'valvulas') {
    celdas = [
      `<strong>${r.codigo_valvula || r.tag_piping || '—'}</strong>`, r.codigo_linea || '—', r.nps || '—',
      r.clase || '—', r.descripcion || '—', badgeEstadoPiping(r.estado || 'POR_MONTAR')
    ];
  } else if (tab === 'soportes') {
    celdas = [
      `<strong>${r.codigo_soporte || '—'}</strong>`, r.codigo_linea || '—', r.codigo_iso || '—',
      r.tipo_soporte || 'GUIA', r.nps || '—', r.suministro || 'PIPING',
      badgeEstadoPiping(r.estado || 'FABRICADO')
    ];
  } else if (tab === 'mto') {
    celdas = [
      `<strong>${r.codigo_mto || '—'}</strong>`, r.descripcion || '—', r.codigo_linea || r.codigo_iso || '—',
      r.nps || '—', r.cantidad || '1', r.unidad || 'un',
      badgeEstadoPiping(r.recepcionado ? 'RECEPCIONADO' : 'PENDIENTE'), badgeEstadoPiping(r.estado_material || 'EN BODEGA')
    ];
  }

  return `<tr style="border-bottom: 1px solid var(--border-container); transition: background 0.15s ease;">${celdas.map(c => `<td style="padding: 0.85rem 1rem; font-size: 0.84rem;">${c}</td>`).join('')}</tr>`;
}
