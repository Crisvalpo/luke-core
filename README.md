# 🏗️ Luke Core — Backbone Organizacional Multi-Tenant

**Luke Core** es el núcleo canónico y multi-tenant de datos para la gestión de faenas industriales y construcción (iniciando con operaciones para **Echeverría Izquierdo Montajes Industriales (EIM)** y **TNS Transportes & Soluciones**).

Provee los servicios transversales de estructura organizacional, dotación, flota de activos, proveedores, roles dinámicos, trazabilidad conversacional y resolución de identidad de alta velocidad para bots de WhatsApp en terreno.

---

## 🛠️ Stack Tecnológico Oficial (Inmutable)

Para mantener el código limpio, veloz y libre de dependencias conflictivas o monolitos, se define el siguiente stack oficial:

```mermaid
graph TD
    subgraph Frontend[Capa de Presentación Web & Móvil]
        UI[HTML5 Semántico + JS Vanilla ES6+<br/>Design Tokens CSS Corporativo Claro #10b981<br/>PWA Mobile-First para Faena]
    end

    subgraph Backend[Capa de Servicios & API REST]
        API[Node.js 20+ LTS + TypeScript 5.7+<br/>Express 5.0+ Modular (Vertical Slice)<br/>Zod 3.24+ (Validación Estricta)<br/>XLSX (Motor de Ingesta Masiva Faenera)]
    end

    subgraph Database[Capa de Datos & Seguridad]
        DB[PostgreSQL 15+ (Esquema core.*)<br/>Pool pg con Row-Level Security RLS<br/>Supabase Auth (GoTrue) + Supabase Storage<br/>RPCs en PL/pgSQL (< 5ms resolución)]
    end

    subgraph Infra[Infraestructura & DevOps]
        DevOps[Oracle Cloud ARM64 24/7 (12GB RAM)<br/>PM2 Process Manager (Puerto 3080)<br/>Cloudflare Tunnels (*.lukeapp.cl)<br/>GitHub (Crisvalpo/luke-core)]
    end

    Frontend --> Backend
    Backend --> Database
    Backend --> Infra
```

### 📋 Detalle de Tecnologías Oficiales:

| Capa | Tecnología | Versión / Detalle | Justificación Técnica |
|---|---|---|---|
| **Runtime Backend** | **Node.js** | `>= 20.x LTS` (ES Modules) | Estabilidad, alto rendimiento en I/O y soporte nativo ESM. |
| **Lenguaje** | **TypeScript** | `5.7+` (Modo Estricto) | Tipado estático robusto, prevención de bugs en tiempo de compilación. |
| **Framework HTTP** | **Express** | `5.0+` (Modular) | Ligero, sin sobrecargas innecesarias, compatible con arquitectura Vertical Slice. |
| **Validación** | **Zod** | `3.24+` | Validación estricta de esquemas en runtime y tipado inferido automático. |
| **Parser Excel/CSV** | **XLSX (SheetJS)** | `0.18+` | Procesamiento ultra rápido de planillas masivas de personal y maquinaria. |
| **Motor de BD** | **PostgreSQL** | `15+` (Esquema `core.*`) | Aislamiento multi-tenant nativo con Row-Level Security (RLS) y JSONB. |
| **Driver DB** | **pg (node-postgres)** | `8.13+` | Conexión directa mediante Pool de alto rendimiento y transacciones atómicas. |
| **Autenticación** | **Supabase Auth** | GoTrue (Docker) | Emisión de tokens JWT con claims de `tenant_id` y `rol` para acceso web. |
| **Almacenamiento** | **Supabase Storage** | S3-Compatible | Buckets dedicados: `core-logos`, `core-documentos`, `core-ingestas`. |
| **Diseño / Frontend** | **Vanilla CSS Tokens** | `design-tokens.css` | Cero estilos inline, paleta clara industrial de `LukeEquipos`, cero dependencias pesadas. |
| **Orquestador** | **PM2** | `6.0+` | Monitoreo 24/7, auto-restart en fallas y recargas sin caída de servicio. |

---

## 🏛️ Entidades Maestras Canónicas (`core.*`)

Todas las tablas operativas y de seguridad se encuentran normalizadas estrictamente en **inglés (snake_case)** en el esquema `core.*`:

| # | Entidad | Tabla | Descripción |
|---|---|---|---|
| 1 | **Tenants** | `core.tenants` | Empresas clientes (`slug`, `razon_social`, `rut`, `config`, RLS). |
| 2 | **Proyectos** | `core.projects` | Obras, faenas y centros de costo contables (`code`, `name`, `cost_center`, `client`). *(Absorbió el esquema legacy `platform`)*. |
| 3 | **Frentes de Trabajo** | `core.work_fronts` | Zonas operativas y paquetes WBS/CWA/IWP (`Chancado`, `Molienda`, etc.). |
| 4 | **Personal** | `core.personnel` | Dotación con RUT normalizado Módulo 11 y teléfono WhatsApp **E.164** (+569...). |
| 5 | **Equipos** | `core.equipment` | Flota y maquinaria pesada con control de horómetro/odómetro. |
| 6 | **Cuadrillas & Turnos** | `core.crews` / `core.crew_members` | Equipos de trabajo en faena liderados por roles operativos autorizados. |
| 7 | **Roles de Seguridad (RBAC)** | `core.company_roles` | Matriz de permisos de software y acceso a la plataforma (admin, supervisor, etc.). |
| 8 | **Roles Operativos de Faena** | `core.company_operational_roles` | Cargos de cuadrilla en terreno (`can_lead_crew`: Capataz, Soldador, Rigger, etc.). |
| 9 | **Mensajería & Subastas** | `core.subastas_mensajes` | Registro conversacional de requerimientos de maquinaria vía bot de WhatsApp. |
| 10 | **Auditoría & Trazabilidad** | `core.audit_logs` | Registro inmutable de eventos, cambios y accesos multi-tenant. |

> [!NOTE]
> El esquema legacy `platform` fue migrado y eliminado por completo. Todos los proyectos y faenas operan centralizadamente en `core.projects` con soporte para el mandante directo (`client`).


---

## 🚀 Inicio Rápido

### 1. Instalación y Dependencias
```bash
npm install
```

### 2. Variables de Entorno
Configura tu archivo `.env` a partir de `.env.example`:
```bash
cp .env.example .env
```

### 3. Migraciones y Semillas
```bash
npm run db:migrate
npm run db:seed
```

### 4. Modo Desarrollo
```bash
npm run dev
```

---

## 🌐 Panel de Administración Visual Super-Admin

Disponible al iniciar el servidor en:
👉 **`http://localhost:3080/admin`** (o en producción en `https://lukeapp.cl/admin`)
- Dashboard de métricas en tiempo real (Empresas, Faenas, Dotación, Flota).
- Onboarding interactivo para dar de alta nuevas empresas y marcas blancas en 1 minuto.
- Búsqueda instantánea por RUT, nombre o slug.

---

## ⚡ Endpoints Principales de la API (v1)

### 🏢 Onboarding y Gestión de Tenants
- `POST /api/v1/tenants/onboarding` — Alta atómica de nuevo cliente (Empresa + Admin + Faena Base + Canal WA + Roles).
- `GET /api/v1/tenants` — Lista de empresas activas con totales agregados.
- `GET /api/v1/tenants/:idOrSlug` — Detalle de tenant por slug o ID.

### 🔍 Resolución de Identidad WhatsApp (< 5ms)
- `GET /api/v1/identidad/resolver-whatsapp?telefono=+56977778888`
- `POST /api/v1/identidad/resolver-whatsapp` (body: `{"telefono": "+56977778888"}`)

### 👷 Dotación, Flota y Proyectos
- `GET /api/v1/projects` — Proyectos de la empresa activa con centro de costo y mandante (`client`).
- `GET /api/v1/personal?proyecto=ANDINA-PIP` — Dotación asignada a la faena con RUT y teléfono normalizados.
- `GET /api/v1/equipos` — Maquinaria activa y contadores.
- `PATCH /api/v1/equipos/:id/contador` — Actualizar horómetro / odómetro desde terreno.

### 👤 Perfil de Usuario & Avatar
- `GET /api/v1/personal/perfil` — Obtiene los datos de perfil y configuración del usuario autenticado (sin requerir tenant).
- `PUT /api/v1/personal/perfil` — Actualiza nombre, teléfono, cargo y avatar recortado mediante Canvas 2D nativo y almacenado en Supabase Storage (`core-logos`).


---

## 🛠️ Despliegue en Producción con PM2 (Oracle Cloud / Luke Server)

```bash
# Compilar TypeScript
npm run build

# Iniciar o recargar con PM2
pm2 start ecosystem.config.js
pm2 save
```

---

## 🗺️ Seguimiento de Tareas & Roadmap
Para consultar las tareas planificadas, en curso y pendientes de implementación, revisa el archivo [ROADMAP.md](file:///c:/Github/Core/ROADMAP.md).

