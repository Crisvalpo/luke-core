// Estado Global de la Vista Admin
let todosLosTenants = [];

document.addEventListener('DOMContentLoaded', () => {
  cargarTenants();
});

async function cargarTenants() {
  const container = document.getElementById('tenants-container');
  try {
    const res = await fetch('/api/v1/tenants');
    const json = await res.json();

    if (!json.ok) throw new Error(json.error || 'Error al obtener tenants');

    todosLosTenants = json.data || [];
    actualizarKPIs(todosLosTenants);
    renderizarTenants(todosLosTenants);

  } catch (error) {
    console.error('Error cargando tenants:', error);
    container.innerHTML = `
      <div style="grid-column: 1 / -1; background: #fee2e2; border: 1px solid #fca5a5; color: #c21a25; padding: 1.5rem; border-radius: 8px; text-align: center;">
        ❌ No se pudieron cargar las empresas. Asegúrate de que el backend de Luke Core esté corriendo.
      </div>
    `;
  }
}

function actualizarKPIs(tenants) {
  let totalProyectos = 0;
  let totalPersonal = 0;
  let totalEquipos = 0;

  tenants.forEach(t => {
    totalProyectos += parseInt(t.total_proyectos || 0, 10);
    totalPersonal += parseInt(t.total_personal || 0, 10);
    totalEquipos += parseInt(t.total_equipos || 0, 10);
  });

  document.getElementById('kpi-tenants').innerText = tenants.length;
  document.getElementById('kpi-proyectos').innerText = totalProyectos;
  document.getElementById('kpi-personal').innerText = totalPersonal;
  document.getElementById('kpi-equipos').innerText = totalEquipos;
}

function renderizarTenants(tenants) {
  const container = document.getElementById('tenants-container');
  document.getElementById('contador-mostrados').innerText = tenants.length;

  if (tenants.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--color-text-muted);">
        No se encontraron empresas con los criterios de búsqueda.
      </div>
    `;
    return;
  }

  container.innerHTML = tenants.map(t => {
    const colorPrimario = t.config?.color_primario || '#10b981';
    const modulos = t.config?.modulos_activos || ['core'];

    return `
      <article class="tenant-card" style="border-top-color: ${colorPrimario};">
        <div class="tenant-header">
          <div class="tenant-title">
            <h3>${t.razon_social}</h3>
            <div class="tenant-rut">RUT: <strong>${t.rut}</strong></div>
          </div>
          <span class="tenant-slug">${t.slug}</span>
        </div>

        <div class="tenant-stats">
          <div class="stat-item">
            <span>Faenas</span>
            <span>${t.total_proyectos || 0}</span>
          </div>
          <div class="stat-item">
            <span>Dotación</span>
            <span>${t.total_personal || 0}</span>
          </div>
          <div class="stat-item">
            <span>Flota</span>
            <span>${t.total_equipos || 0}</span>
          </div>
        </div>

        <div class="tenant-modules">
          ${modulos.map(m => `<span class="module-pill">${m}</span>`).join('')}
        </div>

        <div class="tenant-footer">
          <button class="btn btn-secondary" onclick="verDetalleTenant('${t.slug}')">
            🔍 Ver Faenas
          </button>
        </div>
      </article>
    `;
  }).join('');
}

function filtrarTenants() {
  const query = document.getElementById('input-busqueda').value.toLowerCase().trim();
  const filtrados = todosLosTenants.filter(t => 
    t.razon_social.toLowerCase().includes(query) ||
    t.slug.toLowerCase().includes(query) ||
    t.rut.toLowerCase().includes(query)
  );
  renderizarTenants(filtrados);
}

function abrirModalOnboarding() {
  document.getElementById('modal-onboarding').classList.add('active');
}

function cerrarModalOnboarding() {
  document.getElementById('modal-onboarding').classList.remove('active');
  document.getElementById('form-onboarding').reset();
}

async function guardarNuevoTenant(event) {
  event.preventDefault();
  const btn = document.getElementById('btn-submit-onboard');
  btn.disabled = true;
  btn.innerText = 'Dando de alta...';

  const checkboxes = document.querySelectorAll('input[name="modulos"]:checked');
  const modulosSeleccionados = Array.from(checkboxes).map(cb => cb.value);
  if (!modulosSeleccionados.includes('core')) modulosSeleccionados.unshift('core');

  const payload = {
    razon_social: document.getElementById('ob-razon-social').value.trim(),
    rut: document.getElementById('ob-rut').value.trim(),
    slug: document.getElementById('ob-slug').value.trim().toLowerCase(),
    config: {
      color_primario: document.getElementById('ob-color').value,
      logo_url: document.getElementById('ob-logo').value.trim() || undefined,
      modulos_activos: modulosSeleccionados
    },
    administrador_inicial: {
      nombre_completo: document.getElementById('ob-admin-nombre').value.trim(),
      rut: document.getElementById('ob-admin-rut').value.trim(),
      email: document.getElementById('ob-admin-email').value.trim(),
      telefono_whatsapp: document.getElementById('ob-admin-tel').value.trim()
    }
  };

  try {
    const res = await fetch('/api/v1/tenants/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error al crear tenant');

    alert(`🎉 ¡Empresa '${json.data.tenant.razon_social}' creada con éxito!`);
    cerrarModalOnboarding();
    cargarTenants();

  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Dar de Alta Empresa';
  }
}

function verDetalleTenant(slug) {
  alert(`Cargando panel de gestión para el tenant: ${slug.toUpperCase()}`);
}
