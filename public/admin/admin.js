// Estado Global de la Vista Admin
let todosLosTenants = [];

document.addEventListener('DOMContentLoaded', () => {
  verificarAutenticacion();
  cargarTenants();
});

function aplicarEstiloSidebarPorRol(user) {
  const sidebar = document.querySelector('.sidebar');
  const nameLabel = document.getElementById('user-name-label');
  const roleBadge = document.getElementById('user-display-name');

  if (!sidebar) return;

  sidebar.classList.remove('theme-staff', 'theme-fundador', 'theme-operario');

  const rol = (user.rol || '').toLowerCase().trim();
  const nombre = user.nombre_completo || 'Usuario';

  if (nameLabel) {
    nameLabel.innerText = nombre;
    nameLabel.title = nombre;
  }

  if (rol === 'super_admin' || rol === 'staff') {
    sidebar.classList.add('theme-staff');
    if (roleBadge) {
      roleBadge.className = 'role-badge role-badge-staff';
      roleBadge.innerHTML = '⚡ Staff LukeAPP';
    }
  } else if (['fundador', 'admin_empresa', 'admin_proyecto', 'jefe_proyecto', 'admin'].includes(rol)) {
    sidebar.classList.add('theme-fundador');
    if (roleBadge) {
      roleBadge.className = 'role-badge role-badge-fundador';
      const label = (rol === 'fundador' || rol === 'admin_empresa') ? '👑 Fundador Empresa' : '🛡️ Admin Proyecto';
      roleBadge.innerHTML = label;
    }
  } else {
    sidebar.classList.add('theme-operario');
    if (roleBadge) {
      roleBadge.className = 'role-badge role-badge-operario';
      roleBadge.innerHTML = '👷 Operativo Terreno';
    }
  }
}

function verificarAutenticacion() {
  const token = localStorage.getItem('luke_core_token');
  const userJson = localStorage.getItem('luke_core_user');

  if (!token) {
    window.location.replace('/admin/login.html');
    return;
  }

  // Token presente: mostramos la interfaz suavemente
  document.body.classList.add('authenticated');

  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      aplicarEstiloSidebarPorRol(user);

      // Si no es Super-Admin, adaptar la vista a su Entorno de Empresa
      if (user.rol !== 'super_admin') {
        const btnNuevo = document.getElementById('btn-nuevo-cliente');
        if (btnNuevo) {
          if (user.rol === 'operario' || user.rol === 'admin_proyecto') {
            btnNuevo.style.display = 'none';
          } else {
            btnNuevo.innerText = '➕ Nuevo Proyecto';
            btnNuevo.onclick = () => abrirModalFaenas(user.tenant_id, user.tenant_slug, user.tenant_razon_social);
            btnNuevo.style.display = 'inline-flex';
          }
        }

        const btnIngesta = document.getElementById('btn-topbar-ingesta');
        if (btnIngesta && (user.rol === 'operario' || user.rol === 'admin_proyecto')) {
          btnIngesta.style.display = 'none';
        }

        const btnWa = document.getElementById('btn-topbar-whatsapp');
        if (btnWa) btnWa.style.display = 'none';
        const navWa = document.getElementById('nav-link-whatsapp');
        if (navWa) navWa.style.display = 'none';

        const barBusqueda = document.getElementById('action-bar-busqueda');
        if (barBusqueda) barBusqueda.style.display = 'none';

        const navTenants = document.getElementById('nav-link-tenants');
        if (navTenants) {
          const iconSpan = navTenants.querySelector('.nav-icon');
          const textSpan = navTenants.querySelector('.nav-text');
          const texto = user.rol === 'operario' ? 'Mis Proyectos' : 'Proyectos';
          if (iconSpan) iconSpan.innerText = '📁';
          if (textSpan) textSpan.innerText = texto;
        }

        const navDotacion = document.getElementById('nav-link-dotacion');
        if (navDotacion && user.rol === 'operario') {
          navDotacion.style.display = 'none';
        }

        const topbarTitulo = document.getElementById('topbar-titulo');
        if (topbarTitulo) {
          if (user.rol === 'operario') {
            topbarTitulo.innerText = `Mis Proyectos — ${user.tenant_razon_social || user.tenant_slug || 'Panel Operativo'}`;
          } else {
            topbarTitulo.innerText = `Mi Empresa — ${user.tenant_razon_social || user.tenant_slug || 'Panel de Proyectos'}`;
          }
        }

        const kpiCardTenants = document.getElementById('kpi-card-tenants');
        if (kpiCardTenants) kpiCardTenants.style.display = 'none';
      } else {
        // Es super_admin / Staff LukeAPP: Gestiona las Empresas / Clientes
        const navTenants = document.getElementById('nav-link-tenants');
        if (navTenants) {
          const iconSpan = navTenants.querySelector('.nav-icon');
          const textSpan = navTenants.querySelector('.nav-text');
          if (iconSpan) iconSpan.innerText = '🏢';
          if (textSpan) textSpan.innerText = 'Empresas';
        }
        verificarEstadoWhatsAppBadge();
      }
    } catch {}
  }
}

function cerrarSesion() {
  localStorage.removeItem('luke_core_token');
  localStorage.removeItem('luke_core_user');
  window.location.href = '/admin/login.html';
}

function getAuthHeaders(tenantIdOpcional) {
  const token = localStorage.getItem('luke_core_token');
  const userJson = localStorage.getItem('luke_core_user');
  let tenantId = tenantIdOpcional;
  if (!tenantId && userJson) {
    try {
      const u = JSON.parse(userJson);
      tenantId = u.tenant_id;
    } catch {}
  }
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  if (tenantId) headers['x-tenant-id'] = tenantId;
  return headers;
}

async function cargarTenants() {
  const container = document.getElementById('tenants-container');
  const userJson = localStorage.getItem('luke_core_user');
  let user = null;
  if (userJson) {
    try { user = JSON.parse(userJson); } catch {}
  }

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

    let tenants = (json.data || []).filter(t => t.activo !== false);

    // Si el usuario es de una empresa en particular (rol !== 'super_admin'), filtrar estrictamente su tenant
    if (user && user.rol !== 'super_admin' && user.tenant_id) {
      tenants = tenants.filter(t => (t.id === user.tenant_id || t.slug === user.tenant_slug) && t.activo !== false);
    }

    todosLosTenants = tenants;
    actualizarKPIs(todosLosTenants);
    renderizarTenants(todosLosTenants);

    // Si el tenant tiene logo propio, actualizar el logo en el sidebar
    if (todosLosTenants.length === 1 && todosLosTenants[0].config?.logo_url) {
      const brandLogoElem = document.querySelector('.brand-logo');
      if (brandLogoElem) {
        brandLogoElem.innerHTML = `<img src="${todosLosTenants[0].config.logo_url}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 6px;">`;
        brandLogoElem.style.background = 'transparent';
      }
    }

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

  const userJson = localStorage.getItem('luke_core_user');
  let esSuperAdmin = true;
  if (userJson) {
    try { esSuperAdmin = JSON.parse(userJson).rol === 'super_admin'; } catch {}
  }

  const kpiCardTenants = document.getElementById('kpi-card-tenants');
  if (kpiCardTenants) {
    kpiCardTenants.style.display = esSuperAdmin ? 'block' : 'none';
  }

  if (esSuperAdmin) {
    document.getElementById('kpi-tenants').innerText = tenants.length;
  }
  document.getElementById('kpi-proyectos').innerText = totalProyectos;
  document.getElementById('kpi-personal').innerText = totalPersonal;
  document.getElementById('kpi-equipos').innerText = totalEquipos;
}

function renderizarTenants(tenants) {
  const container = document.getElementById('tenants-container');
  const userJson = localStorage.getItem('luke_core_user');
  let user = null;
  if (userJson) {
    try { user = JSON.parse(userJson); } catch {}
  }

  // Si el usuario es Administrador de una Empresa específica (no Super-Admin global)
  if (user && user.rol !== 'super_admin' && tenants.length > 0) {
    renderizarVistaProyectosTenant(tenants[0]);
    return;
  }

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
    const logoUrl = t.config?.logo_url;
    const estadoBadge = t.activo 
      ? `<span class="module-pill" style="background: #dcfce7; color: #16a34a; border-color: #86efac;">🟢 Activa</span>`
      : `<span class="module-pill" style="background: #fee2e2; color: #c21a25; border-color: #fca5a5;">🔴 Pausada</span>`;

    const logoHtml = logoUrl 
      ? `<img src="${logoUrl}" alt="${t.razon_social}" style="width: 44px; height: 44px; object-fit: contain; border-radius: 8px; border: 1px solid var(--border-container); padding: 2px; background: #ffffff; flex-shrink: 0;">`
      : `<div class="brand-logo" style="width: 44px; height: 44px; font-size: 1.1rem; background: ${colorPrimario}; border-radius: 8px; flex-shrink: 0;">${t.razon_social.charAt(0)}</div>`;

    return `
      <article class="tenant-card" style="border-top-color: ${colorPrimario};">
        <div class="tenant-header">
          <div style="display: flex; align-items: center; gap: 0.75rem; min-width: 0;">
            ${logoHtml}
            <div class="tenant-title" style="min-width: 0;">
              <h3 style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.razon_social}</h3>
              <div class="tenant-rut">RUT: <strong>${t.rut}</strong></div>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem; flex-shrink: 0;">
            <span class="tenant-slug">${t.slug}</span>
            ${estadoBadge}
          </div>
        </div>

        <div class="tenant-stats">
          <div class="stat-item">
            <span>Proyectos</span>
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
          ${modulos.map(m => {
            const labels = {
              core: '⚙️ Core Base',
              combustible: '⛽ Combustible',
              piping: '🔩 Piping & Spools',
              ingesta_masiva: '📊 Ingesta Excel',
              partes_diarios: '📋 Partes Diarios',
              cuadrillas: '👷 Cuadrillas',
              mantenimiento: '🛠️ Mantenimiento'
            };
            return `<span class="module-pill">${labels[m] || m}</span>`;
          }).join('')}
        </div>

        <div class="tenant-footer" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-secondary" onclick="abrirModalEdicion('${t.id}')" style="flex: 1; font-size: 0.75rem; padding: 0.4rem;">
            ✏️ Editar
          </button>
          <button class="btn btn-secondary" onclick="abrirModalIngesta('${t.id}')" style="flex: 1; font-size: 0.75rem; padding: 0.4rem;">
            📊 Cargar Excel
          </button>
          <button class="btn btn-primary" onclick="abrirModalFaenas('${t.id}', '${t.slug}', '${t.razon_social}')" style="flex: 1; font-size: 0.75rem; padding: 0.4rem;">
            📁 Proyectos
          </button>
        </div>
      </article>
    `;
  }).join('');
}

async function renderizarVistaProyectosTenant(tenant) {
  const container = document.getElementById('tenants-container');
  container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--color-text-muted);">Cargando proyectos...</div>';

  const userJson = localStorage.getItem('luke_core_user');
  let user = null;
  if (userJson) {
    try { user = JSON.parse(userJson); } catch {}
  }
  const esOperario = user && user.rol === 'operario';

  try {
    const res = await fetch('/api/v1/proyectos', {
      headers: {
        ...getAuthHeaders(),
        'x-tenant-id': tenant.id
      }
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error al cargar proyectos');

    const proyectos = json.data || [];

    if (proyectos.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-container); border: 1px dashed var(--border-container); border-radius: 12px;">
          <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">No tienes proyectos registrados</h3>
          <p style="color: var(--color-text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
            ${esOperario ? 'No tienes proyectos asignados actualmente.' : 'Crea tu primer proyecto para empezar a operar con Excel y WhatsApp.'}
          </p>
          ${!esOperario ? `
            <button class="btn btn-primary" onclick="abrirModalFaenas('${tenant.id}', '${tenant.slug}', '${tenant.razon_social}')">
              ➕ Crear Primer Proyecto
            </button>
          ` : ''}
        </div>
      `;
      return;
    }

    container.innerHTML = proyectos.map(p => {
      const esEntrenamiento = p.codigo === 'BASE-01' || 
        (p.metadata && (p.metadata.es_entrenamiento || p.metadata.sandbox)) || 
        (p.nombre && (p.nombre.toLowerCase().includes('entrenamiento') || p.nombre.toLowerCase().includes('sandbox') || p.nombre.toLowerCase().includes('pruebas')));

      const trainingBanner = esEntrenamiento ? `
        <div style="font-size: 0.75rem; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 6px; padding: 0.4rem 0.6rem; margin-top: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
          <span>🧪</span>
          <span><strong>Proyecto de Entrenamiento:</strong> Entorno controlado para aprender y crear sin afectar datos reales.</span>
        </div>
      ` : '';
      return `
        <article class="tenant-card" style="border-top-color: #10b981;">
          <div class="tenant-header">
            <div style="display: flex; align-items: center; gap: 0.75rem; min-width: 0;">
              <div class="brand-logo" style="width: 44px; height: 44px; font-size: 0.95rem; background: #059669; border-radius: 8px; flex-shrink: 0; font-weight: 700;">
                ${p.codigo.substring(0, 4)}
              </div>
              <div class="tenant-title" style="min-width: 0;">
                <h3 style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.nombre}</h3>
                <div class="tenant-rut">Código: <strong>${p.codigo}</strong> • CC: ${p.centro_costo || 'N/A'}</div>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem; flex-shrink: 0;">
              <span class="module-pill" style="background: #dcfce7; color: #16a34a; border-color: #86efac;">🟢 ${p.estado || 'Activo'}</span>
            </div>
          </div>

          ${trainingBanner}

          <div style="font-size: 0.825rem; color: var(--color-text-muted); margin-top: 0.5rem; background: #f8fafc; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid #e2e8f0;">
            📍 <strong>Ubicación:</strong> ${p.ubicacion || 'Proyecto Principal'}
          </div>

          ${esOperario ? `
            <div style="margin-top: 1rem; padding: 0.75rem 0.85rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; flex-direction: column; gap: 0.6rem;">
              <div style="font-size: 0.8rem; color: #475569; display: flex; align-items: center; justify-content: space-between;">
                <span>⚡ <strong>Rol Operativo:</strong> Proyecto Asignado</span>
                <span style="font-size: 0.75rem; background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600;">Sincronizado con Excel</span>
              </div>
              <button class="btn btn-secondary" onclick="abrirVisorPiping('${p.id}', '${p.codigo}', '${(p.nombre || '').replace(/'/g, "\\'")}')" style="width: 100%; font-size: 0.85rem; padding: 0.55rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: #0284c7; color: #ffffff; border: none; font-weight: 600;">
                📊 Explorar Tablas de Piping (P&ID, Líneas, Juntas...)
              </button>
              <button class="btn btn-primary" onclick="descargarPlantillaPiping('${p.id}', '${p.codigo}')" style="width: 100%; font-size: 0.8rem; padding: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: #059669;">
                📥 Descargar Planilla Excel (Piping)
              </button>

              <details style="font-size: 0.75rem; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0.5rem 0.65rem; color: #334155; margin-top: 0.2rem; cursor: pointer;">
                <summary style="font-weight: 600; color: #0f766e; list-style: none; display: flex; align-items: center; justify-content: space-between;">
                  <span>🛡️ ¿Excel bloquea las macros? (Instrucciones)</span>
                  <span style="font-size: 0.7rem; color: #64748b;">Ver pasos ▾</span>
                </summary>
                <div style="margin-top: 0.6rem; line-height: 1.45; border-top: 1px solid #e2e8f0; padding-top: 0.5rem;">
                  <p style="margin-bottom: 0.4rem; font-weight: 600; color: #0f172a;">Configurar Windows (Se hace 1 sola vez en tu equipo):</p>
                  <ol style="margin-left: 1.2rem; margin-bottom: 0.5rem; padding-left: 0;">
                    <li>Presiona <kbd style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 3px; padding: 1px 4px; font-family: monospace;">Win + R</kbd>, escribe <code style="color: #0369a1; font-weight: 600;">inetcpl.cpl</code> y presiona <em>Enter</em>.</li>
                    <li>Pestaña <strong>Seguridad</strong> &gt; selecciona <strong>Sitios de confianza</strong> &gt; botón <strong>Sitios</strong>.</li>
                    <li>Agrega <code style="background: #eff6ff; color: #1d4ed8; padding: 1px 4px; border-radius: 3px; font-weight: 600;">https://app.lukeapp.cl</code> y haz clic en <strong>Agregar</strong>, <strong>Cerrar</strong> y <strong>Aceptar</strong>.</li>
                  </ol>
                  <p style="margin-bottom: 0; color: #64748b; font-size: 0.725rem;">
                    💡 <em>Alternativa rápida:</em> Clic derecho en el archivo descargado &gt; <strong>Propiedades</strong> &gt; marca la casilla <strong>☑️ Desbloquear</strong> abajo y pulsa Aceptar.
                  </p>
                </div>
              </details>
            </div>
          ` : `
            <div class="tenant-footer" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem;">
              <button class="btn btn-secondary" onclick="abrirVisorPiping('${p.id}', '${p.codigo}', '${(p.nombre || '').replace(/'/g, "\\'")}')" style="flex: 1; font-size: 0.75rem; padding: 0.45rem; background: #f0fdf4; color: #15803d; border-color: #86efac; font-weight: 600;">
                📊 Piping
              </button>
              ${user && (user.rol === 'fundador' || user.rol === 'admin_empresa' || user.rol === 'super_admin') ? `
                <button class="btn btn-secondary" onclick="abrirModalIngesta('${tenant.id}')" style="flex: 1; font-size: 0.75rem; padding: 0.45rem;">
                  📊 Dotación
                </button>
              ` : ''}
              <button class="btn btn-secondary" onclick="abrirModalInvitarAdmin('${tenant.id}', '${p.id}')" style="flex: 1; font-size: 0.75rem; padding: 0.45rem;">
                👤 Invitar
              </button>
              <button class="btn btn-primary" onclick="abrirModalFaenas('${tenant.id}', '${tenant.slug}', '${tenant.razon_social}')" style="flex: 1; font-size: 0.75rem; padding: 0.45rem;">
                ⚙️ Gestionar
              </button>
            </div>
          `}
        </article>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; background: #fee2e2; border: 1px solid #fca5a5; color: #c21a25; padding: 1.5rem; border-radius: 8px; text-align: center;">
        ❌ Error al cargar proyectos: ${err.message}
      </div>
    `;
  }
}

async function descargarPlantillaPiping(proyectoId, codigoProyecto) {
  const btn = event?.currentTarget;
  const textoOriginal = btn ? btn.innerText : '';
  if (btn) {
    btn.disabled = true;
    btn.innerText = '⏳ Generando planilla personalizada...';
  }

  try {
    const res = await fetch(`/api/v1/proyectos/${proyectoId}/plantilla/piping`, {
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error del servidor (${res.status})`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LukeAPP_Piping_${codigoProyecto || 'Faena'}.xlsm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert(`❌ No se pudo descargar la planilla: ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = textoOriginal;
    }
  }
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
// SUBIDA DE LOGO A SUPABASE STORAGE (ORACLE CLOUD)
// -----------------------------------------------------------------------------
async function subirLogoModal(event, hiddenInputId, previewContainerId) {
  const file = event.target.files?.[0];
  if (!file) return;

  const preview = document.getElementById(previewContainerId);
  preview.innerHTML = `<span style="font-size: 0.65rem; color: #10b981;">Subiendo...</span>`;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result;
    try {
      const res = await fetch('/api/v1/storage/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          filename: file.name,
          base64: base64,
          contentType: file.type || 'image/png',
          bucket: 'core-logos'
        })
      });

      if (res.status === 401) {
        alert('⚠️ Tu sesión ha expirado o el token es antiguo. Por favor inicia sesión nuevamente.');
        cerrarSesion();
        return;
      }

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error al subir imagen');

      const logoUrl = json.data.url;
      document.getElementById(hiddenInputId).value = logoUrl;
      preview.innerHTML = `<img src="${logoUrl}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;

    } catch (err) {
      alert(`❌ Error al subir imagen: ${err.message}`);
      preview.innerHTML = `<span style="font-size: 0.65rem; color: #c21a25;">Error</span>`;
    }
  };
  reader.readAsDataURL(file);
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
  
  const logoUrl = tenant.config?.logo_url || '';
  document.getElementById('edit-logo').value = logoUrl;
  const preview = document.getElementById('edit-logo-preview');
  if (logoUrl) {
    preview.innerHTML = `<img src="${logoUrl}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
  } else {
    preview.innerHTML = `<span style="font-size: 0.7rem; color: var(--color-text-muted);">Logo</span>`;
  }

  document.getElementById('edit-activo').value = tenant.activo ? 'true' : 'false';

  const modulosActivos = tenant.config?.modulos_activos || [];
  document.querySelectorAll('input[name="edit-modulos"]').forEach(cb => {
    cb.checked = modulosActivos.includes(cb.value);
  });

  // Control de permisos según el rol del usuario
  const userJson = localStorage.getItem('luke_core_user');
  let esSuperAdmin = true;
  if (userJson) {
    try { esSuperAdmin = JSON.parse(userJson).rol === 'super_admin'; } catch {}
  }

  const groupActivo = document.getElementById('group-edit-activo');
  const groupModulos = document.getElementById('group-edit-modulos');
  const btnEliminar = document.getElementById('btn-eliminar-tenant');

  if (!esSuperAdmin) {
    if (groupActivo) groupActivo.style.display = 'none';
    if (groupModulos) groupModulos.style.display = 'none';
    if (btnEliminar) btnEliminar.style.display = 'none';
  } else {
    if (groupActivo) groupActivo.style.display = 'block';
    if (groupModulos) groupModulos.style.display = 'block';
    if (btnEliminar) btnEliminar.style.display = 'inline-block';
  }

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

async function eliminarTenantActual() {
  const tenantId = document.getElementById('edit-tenant-id').value;
  const razonSocial = document.getElementById('edit-razon-social').value;
  const slug = document.getElementById('edit-slug').value;

  const confirmacion = prompt(
    `⚠️ PELIGRO: Esto eliminará permanentemente la empresa "${razonSocial}" y TODOS sus proyectos, personal, flota de maquinaria, roles y canales de WhatsApp.\n\nEscribe el slug "${slug}" para confirmar la eliminación:`
  );

  if (confirmacion !== slug) {
    if (confirmacion !== null) {
      alert('❌ El slug ingresado no coincide. Operación cancelada.');
    }
    return;
  }

  try {
    const res = await fetch(`/api/v1/tenants/${tenantId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error al eliminar empresa');

    alert(`🗑️ ${json.meta?.mensaje || 'Empresa eliminada exitosamente'}`);
    cerrarModalEdicion();
    cargarTenants();

  } catch (error) {
    alert(`❌ Error al eliminar: ${error.message}`);
  }
}

let tenantActualFaenas = null;

async function abrirModalFaenas(tenantId, slug, razonSocial) {
  const userJson = localStorage.getItem('luke_core_user');
  if (userJson) {
    try {
      const u = JSON.parse(userJson);
      if (u.rol === 'operario') {
        alert('Los usuarios con rol de Operario no tienen permisos para gestionar proyectos.');
        return;
      }
    } catch {}
  }

  tenantActualFaenas = { id: tenantId, slug: slug, razonSocial: razonSocial };
  document.getElementById('faenas-subtitle').innerText = `Empresa: ${razonSocial || slug}`;
  document.getElementById('faena-tenant-id').value = tenantId;
  document.getElementById('modal-faenas').classList.add('active');
  await cargarFaenasTenant(tenantId);
}

function cerrarModalFaenas() {
  document.getElementById('modal-faenas').classList.remove('active');
}

async function cargarFaenasTenant(tenantId) {
  const container = document.getElementById('faenas-lista-container');
  container.innerHTML = '<div style="text-align: center; padding: 1.5rem; color: var(--color-text-muted);">Cargando proyectos...</div>';

  try {
    const res = await fetch('/api/v1/proyectos', {
      headers: {
        ...getAuthHeaders(),
        'x-tenant-id': tenantId
      }
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error al cargar proyectos');

    const proyectos = json.data || [];

    if (proyectos.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 1rem; color: var(--color-text-muted);">No hay proyectos registrados para esta empresa. Crea el primero abajo.</div>';
      return;
    }

    window._faenasTenantActual = proyectos;

    container.innerHTML = `
      <div style="max-height: 240px; overflow-y: auto; border: 1px solid var(--border-container); border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
          <thead>
            <tr style="background: #f8fafc; text-align: left; border-bottom: 1px solid var(--border-container);">
              <th style="padding: 0.5rem 0.75rem;">Código</th>
              <th style="padding: 0.5rem 0.75rem;">Proyecto</th>
              <th style="padding: 0.5rem 0.75rem;">Ubicación</th>
              <th style="padding: 0.5rem 0.75rem;">Estado</th>
              <th style="padding: 0.5rem 0.75rem; text-align: center;">Acción</th>
            </tr>
          </thead>
          <tbody>
            ${proyectos.map(p => {
              const esEntrenamiento = p.codigo === 'BASE-01' || 
                (p.metadata && (p.metadata.es_entrenamiento || p.metadata.sandbox)) || 
                (p.nombre && (p.nombre.toLowerCase().includes('entrenamiento') || p.nombre.toLowerCase().includes('sandbox') || p.nombre.toLowerCase().includes('pruebas')));

              const badgeEntrenamiento = esEntrenamiento ? `
                <div style="margin-top: 3px;">
                  <span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;" title="Entorno controlado no real para aprender y crear sin afectar operaciones">🧪 Entrenamiento / Sandbox</span>
                </div>
              ` : '';

              return `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 0.5rem 0.75rem; font-weight: 600; color: var(--color-primary);">${p.codigo}</td>
                <td style="padding: 0.5rem 0.75rem;">
                  <div style="font-weight: 500;">${p.nombre}</div>
                  ${badgeEntrenamiento}
                </td>
                <td style="padding: 0.5rem 0.75rem; color: var(--color-text-muted);">${p.ubicacion || '-'}</td>
                <td style="padding: 0.5rem 0.75rem;">
                  <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; background: ${p.estado === 'en_ejecucion' ? '#ecfdf5; color: #059669;' : '#f3f4f6; color: #4b5563;'}">${p.estado}</span>
                </td>
                <td style="padding: 0.5rem 0.75rem; text-align: center;">
                  <div style="display: flex; gap: 0.35rem; justify-content: center; align-items: center;">
                    <button type="button" class="btn btn-secondary" style="padding: 3px 8px; font-size: 0.75rem;" onclick="prepararEditarFaena('${p.id}')" title="Editar datos del proyecto">
                      ✏️ Editar
                    </button>
                    <button type="button" class="btn" style="padding: 3px 8px; font-size: 0.75rem; background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;" onclick="ejecutarEliminarProyecto('${p.id}', '${p.nombre.replace(/'/g, "\\'")}', '${p.codigo}')" title="Eliminar proyecto">
                      🗑️ Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            `;}).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="text-align: center; padding: 1rem; color: #c21a25;">❌ Error: ${err.message}</div>`;
  }
}

function prepararEditarFaena(proyectoId) {
  const proyectos = window._faenasTenantActual || [];
  const p = proyectos.find(item => item.id === proyectoId);
  if (!p) return;

  document.getElementById('faena-id').value = p.id;
  const inputCodigo = document.getElementById('faena-codigo');
  inputCodigo.value = p.codigo;
  inputCodigo.setAttribute('readonly', 'true');
  inputCodigo.style.background = '#f1f5f9';

  document.getElementById('faena-nombre').value = p.nombre;
  document.getElementById('faena-ubicacion').value = p.ubicacion || '';
  document.getElementById('faena-centro-costo').value = p.centro_costo || '';

  document.getElementById('faena-form-title').innerText = `✏️ Editar Proyecto (${p.codigo})`;
  document.getElementById('btn-submit-faena').innerText = 'Guardar Cambios';
  document.getElementById('btn-cancelar-faena').style.display = 'inline-block';
}

function cancelarEditarFaena() {
  const tenantId = document.getElementById('faena-tenant-id').value;
  document.getElementById('form-crear-faena').reset();
  document.getElementById('faena-tenant-id').value = tenantId;
  document.getElementById('faena-id').value = '';

  const inputCodigo = document.getElementById('faena-codigo');
  inputCodigo.removeAttribute('readonly');
  inputCodigo.style.background = '';

  document.getElementById('faena-form-title').innerText = '➕ Crear Nuevo Proyecto';
  document.getElementById('btn-submit-faena').innerText = 'Guardar Proyecto';
  document.getElementById('btn-cancelar-faena').style.display = 'none';
}

async function ejecutarEliminarProyecto(proyectoId, nombre, codigo) {
  const esBase = codigo === 'BASE-01' || nombre.toLowerCase().includes('entrenamiento');
  const advertencia = esBase
    ? `⚠️ Este es el Entorno de Entrenamiento/Sandbox.\n\n¿Estás seguro de que deseas eliminar permanentemente "${nombre}" (${codigo})?\n\nEsta acción borrará definitivamente el proyecto y todos sus planos PID, líneas y datos asociados.`
    : `⚠️ ATENCIÓN: ¿Estás seguro de que deseas eliminar permanentemente el proyecto "${nombre}" (${codigo})?\n\nEsta acción eliminará definitivamente el proyecto y todos sus planos PID, isométricos, juntas, líneas y cubicaciones asociadas de la base de datos.`;

  if (!confirm(advertencia)) return;

  const tenantId = (tenantActualFaenas && tenantActualFaenas.id) || '';

  try {
    const res = await fetch(`/api/v1/proyectos/${proyectoId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
        'x-tenant-id': tenantId
      }
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error al eliminar el proyecto');

    alert(`✅ Proyecto "${nombre}" eliminado exitosamente.`);
    if (tenantId) {
      await cargarFaenasTenant(tenantId);
    }

    const userStr = localStorage.getItem('luke_core_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.rol !== 'super_admin' && user.tenant) {
          await renderizarVistaProyectosTenant(user.tenant);
        }
      } catch {}
    }
    await cargarTenants();
  } catch (error) {
    alert(`❌ Error al eliminar proyecto: ${error.message}`);
  }
}

async function ejecutarCrearFaena(event) {
  event.preventDefault();
  const btn = document.getElementById('btn-submit-faena');
  const tenantId = document.getElementById('faena-tenant-id').value;
  const faenaId = document.getElementById('faena-id').value;
  const isEditing = Boolean(faenaId);

  const payload = {
    nombre: document.getElementById('faena-nombre').value.trim(),
    ubicacion: document.getElementById('faena-ubicacion').value.trim() || null,
    centro_costo: document.getElementById('faena-centro-costo').value.trim() || null
  };

  if (!isEditing) {
    payload.codigo = document.getElementById('faena-codigo').value.trim();
    payload.estado = 'en_ejecucion';
    payload.metadata = {};
  }

  btn.disabled = true;
  btn.innerText = isEditing ? 'Actualizando...' : 'Guardando...';

  try {
    const url = isEditing ? `/api/v1/proyectos/${faenaId}` : '/api/v1/proyectos';
    const method = isEditing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        ...getAuthHeaders(),
        'x-tenant-id': tenantId
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error al procesar el proyecto');

    cancelarEditarFaena();
    alert(isEditing ? `✅ Proyecto actualizado exitosamente.` : `✅ Proyecto '${payload.nombre}' creado exitosamente.`);
    await cargarFaenasTenant(tenantId);
    await cargarTenants();

  } catch (error) {
    alert(`❌ ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.innerText = isEditing ? 'Guardar Cambios' : 'Guardar Proyecto';
  }
}

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// INVITACIÓN DE ADMINISTRADORES Y PERSONAL DE PROYECTO
// -----------------------------------------------------------------------------
async function abrirModalInvitarAdmin(tenantId, proyectoIdOpcional) {
  const userJson = localStorage.getItem('luke_core_user');
  let userRol = 'admin_proyecto';
  if (userJson) {
    try { 
      const u = JSON.parse(userJson);
      userRol = u.rol;
      if (userRol === 'operario') {
        alert('Los usuarios con rol de Operario no tienen permisos para invitar usuarios.');
        return;
      }
    } catch {}
  }

  document.getElementById('admin-tenant-id').value = tenantId;
  const selectProy = document.getElementById('admin-proyecto-select');
  selectProy.innerHTML = '<option value="">Cargando proyectos...</option>';

  // Si el usuario es admin_proyecto, ocultar opción de crear Fundador (prevenir escalamiento)
  const optFundador = document.getElementById('opt-rol-fundador');
  const rolSelect = document.getElementById('admin-rol');
  const puedeCrearFundador = userRol === 'super_admin' || userRol === 'fundador' || userRol === 'admin_empresa';
  if (optFundador) {
    optFundador.style.display = puedeCrearFundador ? 'block' : 'none';
  }
  if (!puedeCrearFundador && rolSelect.value === 'fundador') {
    rolSelect.value = 'operario';
  }

  try {
    const res = await fetch('/api/v1/proyectos', {
      headers: { ...getAuthHeaders(), 'x-tenant-id': tenantId }
    });
    const json = await res.json();
    const proyectos = json.data || [];

    selectProy.innerHTML = '<option value="">Selecciona el proyecto...</option>' + 
      proyectos.map(p => `<option value="${p.id}">${p.codigo} — ${p.nombre}</option>`).join('');

    if (proyectoIdOpcional) {
      selectProy.value = proyectoIdOpcional;
    } else if (proyectos.length === 1) {
      selectProy.value = proyectos[0].id;
    }
  } catch {
    selectProy.innerHTML = '<option value="">Error cargando proyectos</option>';
  }

  cambiarNivelRolAdmin();
  document.getElementById('modal-invitar-admin').classList.add('active');
}

function cerrarModalInvitarAdmin() {
  document.getElementById('modal-invitar-admin').classList.remove('active');
}

function cambiarNivelRolAdmin() {
  const rol = document.getElementById('admin-rol').value;
  const groupProy = document.getElementById('group-admin-proyecto');
  const proySelect = document.getElementById('admin-proyecto-select');
  const cargoInput = document.getElementById('admin-cargo');

  if (rol === 'fundador') {
    groupProy.style.display = 'none';
    proySelect.required = false;
    if (cargoInput.value === 'Cubicador de Terreno' || cargoInput.value === 'Administrador de Proyecto') {
      cargoInput.value = 'Gerente / Fundador';
    }
  } else if (rol === 'admin_proyecto') {
    groupProy.style.display = 'flex';
    proySelect.required = proySelect.options.length > 1;
    if (cargoInput.value === 'Cubicador de Terreno' || cargoInput.value === 'Gerente / Fundador') {
      cargoInput.value = 'Administrador de Proyecto';
    }
  } else {
    // Personal técnico / cubicador
    groupProy.style.display = 'flex';
    proySelect.required = proySelect.options.length > 1;
    if (cargoInput.value === 'Administrador de Proyecto' || cargoInput.value === 'Gerente / Fundador') {
      cargoInput.value = 'Cubicador de Terreno';
    }
  }
}

async function ejecutarInvitarAdmin(event) {
  event.preventDefault();
  const btn = document.getElementById('btn-submit-invitar-admin');
  const tenantId = document.getElementById('admin-tenant-id').value;
  const rol = document.getElementById('admin-rol').value;
  const proyectoId = document.getElementById('admin-proyecto-select').value;

  const payload = {
    tenant_id: tenantId,
    proyecto_id: (rol === 'fundador' || !proyectoId) ? undefined : proyectoId,
    nombre_completo: document.getElementById('admin-nombre').value.trim(),
    rut: document.getElementById('admin-rut').value.trim(),
    email: document.getElementById('admin-email').value.trim().toLowerCase(),
    telefono_whatsapp: document.getElementById('admin-telefono').value.trim(),
    rol_organizacional: rol,
    cargo: document.getElementById('admin-cargo').value.trim() || (rol === 'operario' ? 'Cubicador' : 'Administrador'),
    usuario_windows: document.getElementById('admin-usuario-windows').value.trim() || undefined,
    puede_sincronizar_excel: document.getElementById('admin-puede-sync').checked
  };

  btn.disabled = true;
  btn.innerText = 'Enviando invitación...';

  try {
    const res = await fetch('/api/v1/personal', {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'x-tenant-id': tenantId },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error al registrar personal');

    const descRol = rol === 'fundador' ? 'Fundador / Gerente' : (rol === 'admin_proyecto' ? 'Administrador de Proyecto' : 'Personal Técnico / Cubicador');
    const inviteUrl = json.data?.invite_url || `https://app.lukeapp.cl/admin/crear-clave.html?email=${encodeURIComponent(payload.email)}`;

    cerrarModalInvitarAdmin();
    document.getElementById('form-invitar-admin').reset();
    await cargarTenants();

    // Abrir modal detallado con el enlace directo infalible
    abrirModalInvitacionExitosa(payload.email, descRol, payload.telefono_whatsapp, inviteUrl);

  } catch (error) {
    alert(`❌ ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Enviar Invitación';
  }
}

function abrirModalInvitacionExitosa(email, rolDesc, telefono, inviteUrl) {
  const modal = document.getElementById('modal-invitacion-exitosa');
  if (!modal) return;

  const sub = document.getElementById('invitacion-exitosa-sub');
  if (sub) sub.innerText = `Acceso configurado para rol de ${rolDesc}.`;

  const emailSpan = document.getElementById('invitacion-email-dest');
  if (emailSpan) emailSpan.innerText = email;

  const waBox = document.getElementById('invitacion-wa-box');
  if (waBox) {
    waBox.style.display = telefono ? 'flex' : 'none';
  }

  const linkInput = document.getElementById('invitacion-link-input');
  if (linkInput) {
    linkInput.value = inviteUrl;
  }

  const btnCopiar = document.getElementById('btn-copiar-invitacion');
  if (btnCopiar) {
    btnCopiar.innerHTML = '<span>📋</span> Copiar Enlace';
    btnCopiar.classList.remove('btn-success');
    btnCopiar.classList.add('btn-primary');
  }

  modal.classList.add('active');
}

function cerrarModalInvitacionExitosa() {
  const modal = document.getElementById('modal-invitacion-exitosa');
  if (modal) modal.classList.remove('active');
}

async function copiarEnlaceInvitacionDirecto() {
  const linkInput = document.getElementById('invitacion-link-input');
  const btn = document.getElementById('btn-copiar-invitacion');
  if (!linkInput || !linkInput.value) return;

  try {
    await navigator.clipboard.writeText(linkInput.value);
    if (btn) {
      btn.innerHTML = '<span>✅</span> ¡Copiado!';
      setTimeout(() => {
        btn.innerHTML = '<span>📋</span> Copiar Enlace';
      }, 3000);
    }
  } catch {
    linkInput.select();
    document.execCommand('copy');
    if (btn) {
      btn.innerHTML = '<span>✅</span> ¡Copiado!';
      setTimeout(() => {
        btn.innerHTML = '<span>📋</span> Copiar Enlace';
      }, 3000);
    }
  }
}

async function copiarEnlacePersonal(personalId) {
  try {
    const res = await fetch(`/api/v1/personal/${personalId}/enlace-invitacion`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'No se pudo generar enlace');

    abrirModalInvitacionExitosa(json.data.email, 'Colaborador', null, json.data.invite_url);
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// INGESTA MASIVA DE EXCEL / CSV
// -----------------------------------------------------------------------------
function abrirModalIngesta(tenantIdOpcional) {
  const userJson = localStorage.getItem('luke_core_user');
  if (userJson) {
    try {
      const u = JSON.parse(userJson);
      if (u.rol === 'operario') {
        alert('Los usuarios con rol de Operario no tienen permisos para realizar cargas masivas.');
        return;
      }
    } catch {}
  }

  const selectTenant = document.getElementById('ingesta-tenant');
  selectTenant.innerHTML = '<option value="">Selecciona una empresa...</option>' + 
    todosLosTenants.map(t => `<option value="${t.id}">${t.razon_social} (${t.slug})</option>`).join('');

  if (tenantIdOpcional) {
    selectTenant.value = tenantIdOpcional;
  }

  document.getElementById('ingesta-resultado').style.display = 'none';
  document.getElementById('ingesta-resultado').innerHTML = '';
  document.getElementById('ingesta-file').value = '';
  document.getElementById('modal-ingesta').classList.add('active');
}

function cerrarModalIngesta() {
  document.getElementById('modal-ingesta').classList.remove('active');
}

function descargarPlantillaActual() {
  const tipo = document.getElementById('ingesta-tipo').value;
  window.open(`/api/v1/ingesta/plantilla/${tipo}`, '_blank');
}

async function ejecutarIngesta(event) {
  event.preventDefault();
  const btn = document.getElementById('btn-submit-ingesta');
  const resContainer = document.getElementById('ingesta-resultado');
  const tenantId = document.getElementById('ingesta-tenant').value;
  const tipo = document.getElementById('ingesta-tipo').value;
  const file = document.getElementById('ingesta-file').files?.[0];

  if (!file) return alert('Selecciona un archivo Excel o CSV');

  btn.disabled = true;
  btn.innerText = 'Procesando archivo...';
  resContainer.style.display = 'none';

  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result;
    const endpoint = tipo === 'equipos' ? '/api/v1/ingesta/equipos' : '/api/v1/ingesta/personal';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tenant_id: tenantId, base64: base64 })
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error al procesar el archivo');

      const data = json.data;
      let erroresHtml = '';
      if (data.errores && data.errores.length > 0) {
        erroresHtml = `
          <div style="margin-top: 0.75rem; max-height: 140px; overflow-y: auto; background: #fff; border: 1px solid #fca5a5; border-radius: 4px; padding: 0.5rem; font-size: 0.75rem;">
            <strong style="color: #c21a25;">Filas con errores (${data.errores.length}):</strong>
            <ul style="margin: 0.25rem 0 0 1.25rem; padding: 0;">
              ${data.errores.map(err => `<li>Fila ${err.fila} [${err.identificador}]: ${err.error}</li>`).join('')}
            </ul>
          </div>
        `;
      }

      resContainer.innerHTML = `
        <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 0.75rem;">
          <div style="font-weight: 600; color: #16a34a; font-size: 0.9rem;">
            ✅ ${json.meta?.mensaje || 'Procesamiento completado'}
          </div>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; font-size: 0.8rem;">
            <span class="module-pill" style="background: #dcfce7; color: #16a34a;">🟢 Insertados: ${data.insertados}</span>
            <span class="module-pill" style="background: #e0f2fe; color: #0284c7;">🔵 Actualizados: ${data.actualizados}</span>
            <span class="module-pill" style="background: #fee2e2; color: #c21a25;">🔴 Errores: ${data.errores.length}</span>
          </div>
          ${erroresHtml}
        </div>
      `;
      resContainer.style.display = 'block';
      cargarTenants();

    } catch (err) {
      resContainer.innerHTML = `
        <div style="background: #fee2e2; border: 1px solid #fca5a5; color: #c21a25; border-radius: 6px; padding: 0.75rem; font-size: 0.85rem;">
          ❌ ${err.message}
        </div>
      `;
      resContainer.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.innerText = 'Procesar e Importar';
    }
  };
  reader.readAsDataURL(file);
}

// ═══════════════════════════════════════════════════════════════════
// GESTIÓN DE WHATSAPP BOT Y ESCANEO QR
// ═══════════════════════════════════════════════════════════════════

let intervaloWhatsApp = null;

async function verificarEstadoWhatsAppBadge() {
  try {
    const res = await fetch('/api/v1/whatsapp/status', {
      headers: getAuthHeaders()
    });
    if (!res.ok) return;
    const json = await res.json();
    const data = json.data || {};
    const estaConectado = data.status === 'open' || data.status === 'connected';

    const color = estaConectado ? '#22c55e' : (data.status === 'connecting' ? '#eab308' : '#ef4444');
    
    const topDot = document.getElementById('wa-topbar-dot');
    if (topDot) topDot.style.background = color;
    const sideDot = document.getElementById('wa-sidebar-dot');
    if (sideDot) sideDot.style.background = color;
  } catch (err) {
    console.error('Error al chequear estado WhatsApp:', err);
  }
}

async function abrirModalWhatsApp() {
  const modal = document.getElementById('modal-whatsapp');
  if (!modal) return;
  modal.style.display = 'flex';
  
  // Reset visual state
  const spinner = document.getElementById('wa-loading-spinner');
  const qrContainer = document.getElementById('wa-qr-container');
  const connectedContainer = document.getElementById('wa-connected-container');
  if (spinner) spinner.style.display = 'flex';
  if (qrContainer) qrContainer.style.display = 'none';
  if (connectedContainer) connectedContainer.style.display = 'none';

  // Consultar de inmediato y luego polling cada 4s
  consultarEstadoYQrWhatsApp();
  if (intervaloWhatsApp) clearInterval(intervaloWhatsApp);
  intervaloWhatsApp = setInterval(consultarEstadoYQrWhatsApp, 4000);
}

function cerrarModalWhatsApp() {
  const modal = document.getElementById('modal-whatsapp');
  if (modal) modal.style.display = 'none';
  if (intervaloWhatsApp) {
    clearInterval(intervaloWhatsApp);
    intervaloWhatsApp = null;
  }
}

async function consultarEstadoYQrWhatsApp() {
  const spinner = document.getElementById('wa-loading-spinner');
  const qrContainer = document.getElementById('wa-qr-container');
  const qrImage = document.getElementById('wa-qr-image');
  const connectedContainer = document.getElementById('wa-connected-container');
  const badgeDot = document.getElementById('wa-modal-badge-dot');
  const badgeText = document.getElementById('wa-modal-badge-text');
  const badgeBox = document.getElementById('wa-modal-status-badge');

  try {
    const res = await fetch('/api/v1/whatsapp/qr', {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) {
      if (spinner) spinner.style.display = 'none';
      if (badgeDot) badgeDot.style.background = '#ef4444';
      if (badgeText) badgeText.innerText = 'Servicio no disponible';
      if (badgeBox) {
        badgeBox.style.background = '#fee2e2';
        badgeBox.style.color = '#991b1b';
      }
      return;
    }

    const json = await res.json();
    const data = json.data || {};
    const status = data.status || 'idle';

    if (spinner) spinner.style.display = 'none';

    if (status === 'open' || status === 'connected') {
      // Conectado
      if (badgeDot) badgeDot.style.background = '#22c55e';
      if (badgeText) badgeText.innerText = 'Conectado';
      if (badgeBox) {
        badgeBox.style.background = '#dcfce7';
        badgeBox.style.color = '#166534';
      }
      if (qrContainer) qrContainer.style.display = 'none';
      if (connectedContainer) {
        connectedContainer.style.display = 'flex';
        const numElem = document.getElementById('wa-bot-number');
        if (numElem) numElem.innerText = data.botNumber ? (data.botNumber.startsWith('+') ? data.botNumber : `+${data.botNumber}`) : 'Activo / Vinculado';
      }
      
      const topDot = document.getElementById('wa-topbar-dot');
      if (topDot) topDot.style.background = '#22c55e';
      const sideDot = document.getElementById('wa-sidebar-dot');
      if (sideDot) sideDot.style.background = '#22c55e';

    } else if (data.qrImage) {
      // Esperando escaneo con QR disponible
      if (badgeDot) badgeDot.style.background = '#eab308';
      if (badgeText) badgeText.innerText = 'Esperando Escaneo QR';
      if (badgeBox) {
        badgeBox.style.background = '#fef9c3';
        badgeBox.style.color = '#854d0e';
      }
      if (connectedContainer) connectedContainer.style.display = 'none';
      if (qrContainer) {
        qrContainer.style.display = 'flex';
        if (qrImage) qrImage.src = data.qrImage;
      }
      
      const topDot = document.getElementById('wa-topbar-dot');
      if (topDot) topDot.style.background = '#eab308';
      const sideDot = document.getElementById('wa-sidebar-dot');
      if (sideDot) sideDot.style.background = '#eab308';

    } else {
      // Generando nuevo código
      if (badgeDot) badgeDot.style.background = '#64748b';
      if (badgeText) badgeText.innerText = 'Generando nuevo código QR...';
      if (badgeBox) {
        badgeBox.style.background = '#f1f5f9';
        badgeBox.style.color = '#475569';
      }
    }
  } catch (err) {
    console.error('Error al consultar QR de WhatsApp:', err);
    if (spinner) spinner.style.display = 'none';
    if (badgeDot) badgeDot.style.background = '#ef4444';
    if (badgeText) badgeText.innerText = 'Error de conexión';
  }
}

async function desvincularWhatsApp() {
  if (!confirm('¿Deseas desvincular la sesión actual de WhatsApp? El bot dejará de enviar códigos OTP hasta que se vuelva a escanear el QR.')) {
    return;
  }

  const spinner = document.getElementById('wa-loading-spinner');
  const connectedContainer = document.getElementById('wa-connected-container');
  if (spinner) spinner.style.display = 'flex';
  if (connectedContainer) connectedContainer.style.display = 'none';

  try {
    const res = await fetch('/api/v1/whatsapp/logout', {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('No se pudo cerrar la sesión');
    setTimeout(consultarEstadoYQrWhatsApp, 2000);
  } catch (err) {
    alert('Error al desvincular: ' + err.message);
    consultarEstadoYQrWhatsApp();
  }
}

// =============================================================================
// GESTIÓN Y NAVEGACIÓN DE DOTACIÓN DE PERSONAL
// =============================================================================
let seccionActual = 'proyectos';

function navegarASeccion(seccion) {
  seccionActual = seccion;
  const tenantsGrid = document.getElementById('tenants-container');
  const dotacionSec = document.getElementById('dotacion-container');
  const visorSec = document.getElementById('visor-piping-container');
  const navTenants = document.getElementById('nav-link-tenants');
  const navDotacion = document.getElementById('nav-link-dotacion');
  const topbarTitulo = document.getElementById('topbar-titulo');
  const btnNuevo = document.getElementById('btn-nuevo-cliente');

  const userJson = localStorage.getItem('luke_core_user');
  let user = null;
  if (userJson) { try { user = JSON.parse(userJson); } catch {} }
  const nombreEmpresa = user?.tenant_razon_social || user?.tenant_slug || (todosLosTenants[0]?.razon_social) || 'Mi Empresa';

  if (visorSec) visorSec.style.display = 'none';

  if (seccion === 'dotacion') {
    if (tenantsGrid) tenantsGrid.style.display = 'none';
    if (dotacionSec) dotacionSec.style.display = 'block';
    if (navTenants) navTenants.classList.remove('active');
    if (navDotacion) navDotacion.classList.add('active');
    if (topbarTitulo) topbarTitulo.innerText = `Dotación de Personal — ${nombreEmpresa}`;
    if (btnNuevo && user?.rol !== 'super_admin') {
      btnNuevo.innerText = '➕ Invitar Personal';
      btnNuevo.onclick = () => abrirModalInvitarAdminDirecto();
      btnNuevo.style.display = 'inline-flex';
    }
    cargarDotacionEmpresa();
  } else {
    if (tenantsGrid) tenantsGrid.style.display = 'grid';
    if (dotacionSec) dotacionSec.style.display = 'none';
    if (navTenants) navTenants.classList.add('active');
    if (navDotacion) navDotacion.classList.remove('active');
    if (topbarTitulo) {
      if (user?.rol === 'super_admin') {
        topbarTitulo.innerText = 'Gestión de Empresas & Marcas Blancas';
      } else {
        topbarTitulo.innerText = `Mi Empresa — ${nombreEmpresa}`;
      }
    }
    if (btnNuevo && user?.rol !== 'super_admin') {
      btnNuevo.innerText = '➕ Nuevo Proyecto';
      btnNuevo.onclick = () => {
        const t = todosLosTenants[0] || {};
        abrirModalFaenas(t.id, t.slug, t.razon_social);
      };
      btnNuevo.style.display = 'inline-flex';
    }
    cargarTenants();
  }
}

async function cargarDotacionEmpresa() {
  const tbody = document.getElementById('tabla-dotacion-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">Cargando dotación...</td></tr>';

  const userJson = localStorage.getItem('luke_core_user');
  let user = null;
  if (userJson) { try { user = JSON.parse(userJson); } catch {} }
  const tenantId = user?.tenant_id || (todosLosTenants[0]?.id) || '';

  try {
    const res = await fetch(`/api/v1/personal?tenant=${tenantId}`, {
      headers: getAuthHeaders(tenantId)
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error al obtener personal');

    const personal = json.data || [];
    const kpiEl = document.getElementById('kpi-personal');
    if (kpiEl) kpiEl.innerText = personal.length;

    if (personal.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--color-text-muted);">
            No hay personal registrado en la dotación de esta empresa.<br><br>
            <button class="btn btn-primary" onclick="abrirModalInvitarAdminDirecto()" style="font-size: 0.85rem;">
              ➕ Invitar al Primer Integrante
            </button>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = personal.map(p => {
      const iniciales = (p.nombre_completo || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      let badgeRol = '<span class="module-pill" style="background: #e0f2fe; color: #0369a1; border-color: #bae6fd;">Cubicador / Operario</span>';
      if (p.rol_organizacional === 'fundador' || p.rol_organizacional === 'admin_empresa') {
        badgeRol = '<span class="module-pill" style="background: #f3e8ff; color: #7e22ce; border-color: #e9d5ff;">👑 Fundador</span>';
      } else if (p.rol_organizacional === 'admin_proyecto' || p.rol_organizacional === 'admin') {
        badgeRol = '<span class="module-pill" style="background: #dbeafe; color: #1d4ed8; border-color: #bfdbfe;">🛡️ Admin Proyecto</span>';
      }

      const proyAsignado = p.proyecto_codigo ? `<strong>${p.proyecto_codigo}</strong>` : '<span style="color: var(--color-text-muted);">— Nivel Empresa</span>';

      return `
        <tr style="border-bottom: 1px solid var(--border-container); transition: background 0.15s ease;">
          <td style="padding: 0.85rem 1rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #059669; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem;">
                ${iniciales}
              </div>
              <div>
                <strong style="display: block; color: var(--color-text-main);">${p.nombre_completo}</strong>
                ${p.usuario_windows ? `<span style="font-size: 0.75rem; color: var(--color-text-muted);">Win: ${p.usuario_windows}</span>` : ''}
              </div>
            </div>
          </td>
          <td style="padding: 0.85rem 1rem; font-family: monospace; font-size: 0.82rem; color: var(--color-text-muted);">${p.rut || '—'}</td>
          <td style="padding: 0.85rem 1rem; color: var(--color-text-main);">${p.cargo || 'Personal'}</td>
          <td style="padding: 0.85rem 1rem;">${badgeRol}</td>
          <td style="padding: 0.85rem 1rem;">
            <div style="font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.15rem;">
              ${p.email ? `<span>✉️ ${p.email}</span>` : ''}
              ${p.telefono_whatsapp ? `<span>📱 ${p.telefono_whatsapp}</span>` : ''}
            </div>
          </td>
          <td style="padding: 0.85rem 1rem; font-size: 0.82rem;">${proyAsignado}</td>
          <td style="padding: 0.85rem 1rem; text-align: right;">
            <div style="display: inline-flex; gap: 0.4rem; justify-content: flex-end;">
              <button class="btn btn-secondary" onclick="obtenerEnlaceActivacion('${p.id}')" style="padding: 0.35rem 0.6rem; font-size: 0.75rem;" title="Generar / Ver Enlace de Activación Directo">
                🔗 Enlace
              </button>
              <button class="btn btn-secondary" onclick="eliminarPersonalDeDotacion('${p.id}', '${(p.nombre_completo || '').replace(/'/g, "\\'")}')" style="padding: 0.35rem 0.6rem; font-size: 0.75rem; color: #dc2626; border-color: #fca5a5;" title="Eliminar de la Dotación">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #dc2626;">Error al cargar dotación: ${err.message}</td></tr>`;
  }
}

async function eliminarPersonalDeDotacion(id, nombre) {
  if (!confirm(`⚠️ ¿Estás seguro de que deseas eliminar a "${nombre}" de la dotación de la empresa?\n\nEsta acción revocará su acceso a LukeAPPs y lo eliminará de la base de datos.`)) {
    return;
  }

  const userJson = localStorage.getItem('luke_core_user');
  let user = null;
  if (userJson) { try { user = JSON.parse(userJson); } catch {} }
  const tenantId = user?.tenant_id || (todosLosTenants[0]?.id) || '';

  try {
    const res = await fetch(`/api/v1/personal/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(tenantId)
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error al eliminar personal');

    alert(`✅ ${json.meta?.mensaje || `Personal "${nombre}" eliminado de la dotación exitosamente.`}`);
    await cargarDotacionEmpresa();
    await cargarTenants();
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
}

function abrirModalInvitarAdminDirecto() {
  const userJson = localStorage.getItem('luke_core_user');
  let user = null;
  if (userJson) { try { user = JSON.parse(userJson); } catch {} }
  const tenantId = user?.tenant_id || (todosLosTenants[0]?.id) || '';
  abrirModalInvitarAdmin(tenantId);
}

