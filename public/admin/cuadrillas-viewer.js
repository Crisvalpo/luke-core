// =============================================================================
// VISOR Y GESTOR WEB DE CUADRILLAS Y ASIGNACIONES
// =============================================================================

let cuadrillasState = {
  proyecto: null,
  tab: 'organigrama',
  cuadrillas: [],
  especialidades: [],
  roles: []
};

function abrirVisorCuadrillas(proyectoId, codigo, nombre) {
  cuadrillasState.proyecto = { id: proyectoId, codigo, nombre };
  cuadrillasState.tab = 'organigrama';

  document.getElementById('tenants-container')?.style.setProperty('display', 'none');
  document.getElementById('dotacion-container')?.style.setProperty('display', 'none');
  document.getElementById('visor-piping-container')?.style.setProperty('display', 'none');
  
  const sec = document.getElementById('visor-cuadrillas-container');
  if (sec) sec.style.display = 'block';

  const elTitulo = document.getElementById('cuadrillas-proy-titulo');
  if (elTitulo) elTitulo.innerText = `${codigo} — ${nombre}`;
  const topbar = document.getElementById('topbar-titulo');
  if (topbar) topbar.innerText = `Cuadrillas y HH — ${codigo}`;

  cargarCatalogosYCuadrillas();
}

function cerrarVisorCuadrillas() {
  const sec = document.getElementById('visor-cuadrillas-container');
  if (sec) sec.style.display = 'none';
  navegarASeccion('proyectos');
}

function cambiarTabCuadrillas(nuevoTab) {
  cuadrillasState.tab = nuevoTab;
  document.querySelectorAll('.tab-cuadrilla-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === nuevoTab);
  });
  renderTabContenido();
}

async function cargarCatalogosYCuadrillas() {
  try {
    const [specRes, rolesRes, crewsRes] = await Promise.all([
      fetch('/api/v1/cuadrillas/specialties').then(r => r.json()),
      fetch('/api/v1/cuadrillas/roles').then(r => r.json()),
      fetch(`/api/v1/cuadrillas?project_id=${cuadrillasState.proyecto.id}`).then(r => r.json())
    ]);

    cuadrillasState.especialidades = specRes.data || [];
    cuadrillasState.roles = rolesRes.data || [];
    cuadrillasState.cuadrillas = crewsRes.data || [];

    renderTabContenido();
  } catch (err) {
    console.error('Error cargando datos de cuadrillas:', err);
  }
}

function renderTabContenido() {
  const cont = document.getElementById('cuadrillas-tab-body');
  if (!cont) return;

  if (cuadrillasState.tab === 'organigrama') renderOrganigrama(cont);
  else if (cuadrillasState.tab === 'asignacion') renderAsignacion(cont);
  else if (cuadrillasState.tab === 'reporte-hh') renderReporteHH(cont);
  else if (cuadrillasState.tab === 'diccionarios') renderDiccionarios(cont);
}

function renderOrganigrama(cont) {
  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
      <h4 style="margin:0; font-size:1rem; font-weight:700;">👷 Organigrama de Cuadrillas por Especialidad</h4>
    </div>
  `;

  if (cuadrillasState.cuadrillas.length === 0) {
    html += `<div style="text-align:center; padding:3rem; color:var(--color-text-muted);">No hay cuadrillas registradas en esta obra aún.</div>`;
    cont.innerHTML = html;
    return;
  }

  html += `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:1rem;">`;
  cuadrillasState.cuadrillas.forEach(c => {
    html += `
      <div style="background:#f8fafc; border:1px solid var(--border-container); border-radius:8px; padding:1rem; position:relative;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <h5 style="margin:0 0 0.25rem 0; font-size:0.95rem; font-weight:700; color:var(--color-primary);">${c.name}</h5>
          <span class="role-badge role-badge-staff" style="font-size:0.75rem;">${c.specialty_name || 'General'}</span>
        </div>
        <div style="font-size:0.85rem; color:#475569; margin:0.5rem 0;">
          <strong>Líder:</strong> ${c.leader_name || c.leader_rut}
        </div>
        <div style="font-size:0.85rem; color:#64748b; margin-bottom:0.75rem;">
          <strong>Dotación:</strong> ${c.members_count || 0} operarios activos
        </div>
      </div>
    `;
  });
  html += `</div>`;
  cont.innerHTML = html;
}

function renderAsignacion(cont) {
  let html = `
    <div style="margin-bottom:1rem;">
      <h4 style="margin:0 0 0.5rem 0; font-size:1rem; font-weight:700;">📋 Asignación Granular de Cuadrilla a Tareas</h4>
      <p style="font-size:0.85rem; color:var(--color-text-muted); margin:0;">
        Distribuye los miembros de una cuadrilla en múltiples tareas de la jornada y registra sus horas reales de trabajo.
      </p>
    </div>
    <div style="display:flex; gap:1rem; margin-bottom:1.25rem; flex-wrap:wrap; align-items:flex-end;">
      <div>
        <label style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:0.25rem;">Cuadrilla:</label>
        <select id="asig-select-cuadrilla" style="padding:0.45rem; border-radius:6px; border:1px solid var(--border-container); font-size:0.85rem;" onchange="cargarMiembrosParaAsignacion(this.value)">
          <option value="">-- Seleccionar Cuadrilla --</option>
          ${cuadrillasState.cuadrillas.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:0.25rem;">Fecha Jornada:</label>
        <input type="date" id="asig-fecha" value="${new Date().toISOString().slice(0, 10)}" style="padding:0.4rem; border-radius:6px; border:1px solid var(--border-container); font-size:0.85rem;">
      </div>
    </div>
    <div id="asig-miembros-container" style="display:none;">
      <div style="overflow-x:auto; border:1px solid var(--border-container); border-radius:8px; margin-bottom:1rem;">
        <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
          <thead style="background:#f1f5f9; text-align:left;">
            <tr>
              <th style="padding:0.5rem 0.75rem;">Operario</th>
              <th style="padding:0.5rem 0.75rem;">Cargo</th>
              <th style="padding:0.5rem 0.75rem;">Cód. Tarea / Partida</th>
              <th style="padding:0.5rem 0.75rem;">Descripción Tarea</th>
              <th style="padding:0.5rem 0.75rem; width:80px;">HH Real</th>
              <th style="padding:0.5rem 0.75rem; width:80px;">Avance</th>
            </tr>
          </thead>
          <tbody id="asig-tabla-body"></tbody>
        </table>
      </div>
      <button class="btn btn-primary" onclick="guardarAsignacionJornada()">💾 Guardar Asignación de Jornada</button>
    </div>
  `;
  cont.innerHTML = html;
}

async function cargarMiembrosParaAsignacion(crewId) {
  const cont = document.getElementById('asig-miembros-container');
  const tbody = document.getElementById('asig-tabla-body');
  if (!crewId) { if (cont) cont.style.display = 'none'; return; }

  const res = await fetch(`/api/v1/cuadrillas/${crewId}`).then(r => r.json());
  const crew = res.data;
  if (!crew || !crew.members || crew.members.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:#64748b;">Esta cuadrilla no tiene operarios registrados.</td></tr>`;
    cont.style.display = 'block';
    return;
  }

  tbody.innerHTML = crew.members.map(m => `
    <tr style="border-bottom:1px solid #e2e8f0;">
      <td style="padding:0.5rem 0.75rem;"><strong>${m.worker_name || m.worker_rut}</strong><br><small style="color:#64748b;">${m.worker_rut}</small></td>
      <td style="padding:0.5rem 0.75rem;"><span class="role-badge role-badge-operador">${m.role_name || 'Operario'}</span></td>
      <td style="padding:0.5rem 0.75rem;"><input type="text" class="asig-task-code" data-rut="${m.worker_rut}" data-name="${m.worker_name || ''}" placeholder="Ej: P-01-SOLD" style="width:100px; padding:0.3rem; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px;"></td>
      <td style="padding:0.5rem 0.75rem;"><input type="text" class="asig-task-name" placeholder="Ej: Soldadura de línea 4\"" style="width:100%; padding:0.3rem; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px;"></td>
      <td style="padding:0.5rem 0.75rem;"><input type="number" class="asig-hh" value="8" step="0.5" min="0" max="24" style="width:70px; padding:0.3rem; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px;"></td>
      <td style="padding:0.5rem 0.75rem;"><input type="number" class="asig-prog" value="1" step="0.1" min="0" style="width:70px; padding:0.3rem; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px;"></td>
    </tr>
  `).join('');
  cont.style.display = 'block';
}

async function guardarAsignacionJornada() {
  const crewId = document.getElementById('asig-select-cuadrilla').value;
  const fecha = document.getElementById('asig-fecha').value;
  const rows = document.querySelectorAll('#asig-tabla-body tr');

  const assignments = [];
  rows.forEach(r => {
    const codeInput = r.querySelector('.asig-task-code');
    const nameInput = r.querySelector('.asig-task-name');
    const hhInput = r.querySelector('.asig-hh');
    const progInput = r.querySelector('.asig-prog');

    if (codeInput && codeInput.value.trim()) {
      assignments.push({
        task_code: codeInput.value.trim(),
        task_name: nameInput.value.trim() || codeInput.value.trim(),
        worker_rut: codeInput.dataset.rut,
        worker_name: codeInput.dataset.name,
        hours_allocated: parseFloat(hhInput.value) || 8.0,
        hours_real: parseFloat(hhInput.value) || 8.0,
        unit_progress: parseFloat(progInput.value) || 0
      });
    }
  });

  if (assignments.length === 0) {
    alert('Ingrese al menos el código de tarea para un operario.');
    return;
  }

  try {
    const res = await fetch('/api/v1/cuadrillas/tasks/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        crew_id: crewId,
        project_id: cuadrillasState.proyecto.id,
        assignment_date: fecha,
        assignments
      })
    }).then(r => r.json());

    if (res.ok) {
      alert(`✅ ${res.data?.inserted || assignments.length} asignaciones guardadas correctamente.`);
      cambiarTabCuadrillas('reporte-hh');
    } else {
      alert(`❌ Error: ${res.error?.message || 'No se pudo guardar'}`);
    }
  } catch (err) {
    alert('Error al guardar asignaciones.');
  }
}
