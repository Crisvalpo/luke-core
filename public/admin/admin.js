// Estado Global de la Vista Admin
let todosLosTenants = [];

document.addEventListener('DOMContentLoaded', () => {
  verificarAutenticacion();
  cargarTenants();
});

function verificarAutenticacion() {
  const token = localStorage.getItem('luke_core_token');
  const userJson = localStorage.getItem('luke_core_user');

  if (!token) {
    window.location.href = '/admin/login.html';
    return;
  }

  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      const displayElem = document.getElementById('user-display-name');
      if (displayElem) {
        displayElem.innerText = `${user.nombre_completo.split(' ')[0]} (${user.rol})`;
      }
    } catch {}
  }
}

function cerrarSesion() {
  localStorage.removeItem('luke_core_token');
  localStorage.removeItem('luke_core_user');
  window.location.href = '/admin/login.html';
}

function getAuthHeaders() {
  const token = localStorage.getItem('luke_core_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

async function cargarTenants() {
  const container = document.getElementById('tenants-container');
  try {
    const res = await fetch('/api/v1/tenants', {
      headers: getAuthHeaders()
    });

    if (res.status === 401) {
      cerrarSesion();
      return;
    }

    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error al obtener tenants');

    todosLosTenants = json.data || [];
    actualizarKPIs(todosLosTenants);
    renderizarTenants(todosLosTenants);

  } catch (error) {
    console.error('Error cargando tenants:', error);
    container.innerHTML = `
      <div style="grid-column: 1 / -1; background: #fee2e2; border: 1px solid #fca5a5; color: #c21a25; padding: 1.5rem; border-radius: 8px; text-align: center;">
        ❌ No se pudieron cargar las empresas. Error: ${error.message}
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
    const estadoBadge = t.activo 
      ? `<span class="module-pill" style="background: #dcfce7; color: #16a34a; border-color: #86efac;">🟢 Activa</span>`
      : `<span class="module-pill" style="background: #fee2e2; color: #c21a25; border-color: #fca5a5;">🔴 Pausada</span>`;

    return `
      <article class="tenant-card" style="border-top-color: ${colorPrimario};">
        <div class="tenant-header">
          <div class="tenant-title">
            <h3>${t.razon_social}</h3>
            <div class="tenant-rut">RUT: <strong>${t.rut}</strong></div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem;">
            <span class="tenant-slug">${t.slug}</span>
            ${estadoBadge}
          </div>
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
          <button class="btn btn-secondary" onclick="abrirModalEdicion('${t.id}')">
            ✏️ Editar Empresa
          </button>
          <button class="btn btn-primary" onclick="verDetalleTenant('${t.slug}')">
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
      headers: getAuthHeaders(),
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

// -----------------------------------------------------------------------------
// EDICIÓN DE EMPRESA
// -----------------------------------------------------------------------------
function abrirModalEdicion(tenantId) {
  const tenant = todosLosTenants.find(t => t.id === tenantId);
  if (!tenant) return;

  document.getElementById('edit-tenant-id').value = tenant.id;
  document.getElementById('edit-razon-social').value = tenant.razon_social;
  document.getElementById('edit-rut').value = tenant.rut;
  document.getElementById('edit-slug').value = tenant.slug;
  document.getElementById('edit-color').value = tenant.config?.color_primario || '#10b981';
  document.getElementById('edit-logo').value = tenant.config?.logo_url || '';
  document.getElementById('edit-activo').value = tenant.activo ? 'true' : 'false';

  const modulosActivos = tenant.config?.modulos_activos || [];
  document.querySelectorAll('input[name="edit-modulos"]').forEach(cb => {
    cb.checked = modulosActivos.includes(cb.value);
  });

  document.getElementById('modal-editar-tenant').classList.add('active');
}

function cerrarModalEdicion() {
  document.getElementById('modal-editar-tenant').classList.remove('active');
}

async function guardarEdicionTenant(event) {
  event.preventDefault();
  const btn = document.getElementById('btn-submit-edit');
  const tenantId = document.getElementById('edit-tenant-id').value;
  btn.disabled = true;
  btn.innerText = 'Guardando...';

  const checkboxes = document.querySelectorAll('input[name="edit-modulos"]:checked');
  const modulosSeleccionados = Array.from(checkboxes).map(cb => cb.value);
  if (!modulosSeleccionados.includes('core')) modulosSeleccionados.unshift('core');

  const payload = {
    razon_social: document.getElementById('edit-razon-social').value.trim(),
    rut: document.getElementById('edit-rut').value.trim(),
    slug: document.getElementById('edit-slug').value.trim().toLowerCase(),
    activo: document.getElementById('edit-activo').value === 'true',
    config: {
      color_primario: document.getElementById('edit-color').value,
      logo_url: document.getElementById('edit-logo').value.trim() || undefined,
      modulos_activos: modulosSeleccionados
    }
  };

  try {
    const res = await fetch(`/api/v1/tenants/${tenantId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error al actualizar empresa');

    alert(`✅ Empresa actualizada con éxito`);
    cerrarModalEdicion();
    cargarTenants();

  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Guardar Cambios';
  }
}

function verDetalleTenant(slug) {
  alert(`Cargando faenas y dotación para el tenant: ${slug.toUpperCase()}`);
}
