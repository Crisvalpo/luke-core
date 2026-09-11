// =============================================================================
// SUB-MÓDULO: REPORTE DE HH Y DICCIONARIOS DE EMPRESA
// =============================================================================

async function renderReporteHH(cont) {
  cont.innerHTML = `<div style="text-align:center; padding:2rem;">Cargando informe de HH...</div>`;
  const res = await fetch(`/api/v1/cuadrillas/tasks/hours-report?project_id=${cuadrillasState.proyecto.id}`).then(r => r.json());
  const list = res.data || [];

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
      <h4 style="margin:0; font-size:1rem; font-weight:700;">⏱️ Horas Hombre (HH) Reales por Tarea y Partida</h4>
    </div>
    <div style="overflow-x:auto; border:1px solid var(--border-container); border-radius:8px;">
      <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
        <thead style="background:#f8fafc; text-align:left;">
          <tr>
            <th style="padding:0.6rem 0.75rem;">Fecha</th>
            <th style="padding:0.6rem 0.75rem;">Código Tarea</th>
            <th style="padding:0.6rem 0.75rem;">Descripción Tarea</th>
            <th style="padding:0.6rem 0.75rem; text-align:center;">Dotación</th>
            <th style="padding:0.6rem 0.75rem; text-align:right;">HH Prog.</th>
            <th style="padding:0.6rem 0.75rem; text-align:right;">HH Real</th>
            <th style="padding:0.6rem 0.75rem; text-align:right;">Avance Físico</th>
          </tr>
        </thead>
        <tbody>
          ${list.length === 0 ? `<tr><td colspan="7" style="text-align:center; padding:2rem; color:#64748b;">No hay registros de HH para este proyecto aún.</td></tr>` :
            list.map(r => `
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:0.6rem 0.75rem;">${r.assignment_date ? r.assignment_date.slice(0,10) : '-'}</td>
                <td style="padding:0.6rem 0.75rem;"><strong>${r.task_code}</strong></td>
                <td style="padding:0.6rem 0.75rem;">${r.task_name}</td>
                <td style="padding:0.6rem 0.75rem; text-align:center;"><span class="role-badge role-badge-staff">${r.workers_count} op</span></td>
                <td style="padding:0.6rem 0.75rem; text-align:right;">${parseFloat(r.total_hours_allocated).toFixed(1)} h</td>
                <td style="padding:0.6rem 0.75rem; text-align:right; font-weight:700; color:var(--color-primary);">${parseFloat(r.total_hours_real).toFixed(1)} h</td>
                <td style="padding:0.6rem 0.75rem; text-align:right;">${parseFloat(r.total_unit_progress).toFixed(1)}</td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>
  `;
  cont.innerHTML = html;
}

function renderDiccionarios(cont) {
  let html = `
    <h4 style="margin:0 0 1rem 0; font-size:1rem; font-weight:700;">⚙️ Diccionario Configurable de Empresa</h4>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem;">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
          <strong style="font-size:0.9rem;">Especialidades (${cuadrillasState.especialidades.length})</strong>
        </div>
        <div style="max-height:350px; overflow-y:auto; border:1px solid var(--border-container); border-radius:6px;">
          <table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
            <thead style="background:#f1f5f9; position:sticky; top:0;">
              <tr><th style="padding:0.4rem;">Cód</th><th style="padding:0.4rem;">Especialidad</th><th style="padding:0.4rem;">Estado</th></tr>
            </thead>
            <tbody>
              ${cuadrillasState.especialidades.map(s => `
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:0.4rem 0.5rem; font-family:monospace;">${s.code}</td>
                  <td style="padding:0.4rem 0.5rem; font-weight:600;">${s.name}</td>
                  <td style="padding:0.4rem 0.5rem;"><span style="color:${s.is_active ? '#16a34a' : '#94a3b8'}; font-weight:600;">${s.is_active ? 'Activo' : 'Inactivo'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
          <strong style="font-size:0.9rem;">Roles / Cargos Operativos (${cuadrillasState.roles.length})</strong>
        </div>
        <div style="max-height:350px; overflow-y:auto; border:1px solid var(--border-container); border-radius:6px;">
          <table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
            <thead style="background:#f1f5f9; position:sticky; top:0;">
              <tr><th style="padding:0.4rem;">Cód</th><th style="padding:0.4rem;">Cargo</th><th style="padding:0.4rem;">¿Lidera Cuadrilla?</th></tr>
            </thead>
            <tbody>
              ${cuadrillasState.roles.map(r => `
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:0.4rem 0.5rem; font-family:monospace;">${r.code}</td>
                  <td style="padding:0.4rem 0.5rem; font-weight:600;">${r.name}</td>
                  <td style="padding:0.4rem 0.5rem;"><span class="role-badge ${r.can_lead_crew ? 'role-badge-admin' : 'role-badge-operador'}">${r.can_lead_crew ? '✅ Sí (Líder)' : 'No'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  cont.innerHTML = html;
}
