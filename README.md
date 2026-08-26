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

## 🏛️ Las 7 Entidades Maestras (`core.*`)

| # | Entidad | Tabla | Descripción |
|---|---|---|---|
| 1 | **Tenants** | `core.tenants` | Empresas clientes (`slug`, `razon_social`, `rut`, `config`, RLS). |
| 2 | **Proyectos** | `core.proyectos` | Obras, faenas y centros de costo contables (`codigo`, `nombre`, `centro_costo`). |
| 3 | **Frentes de Trabajo** | `core.frentes_trabajo` | Zonas operativas y WBS/CWA/IWP (`Chancado`, `Molienda`, etc.). |
| 4 | **Personal** | `core.personal` | Dotación con RUT normalizado y teléfono WhatsApp **E.164** (+569...). |
| 5 | **Equipos** | `core.equipos` | Flota y maquinaria pesada con control de horómetro/odómetro. |
| 6 | **Proveedores** | `core.proveedores` | Terceros (arriendo de maquinaria, insumos, subcontratos). |
| 7 | **Sesiones & Auditoría** | `core.sesiones_canal` / `core.audit_logs` | Memoria conversacional para bots WhatsApp y trazabilidad inmutable. |
| 8 | **Roles Dinámicos** | `core.roles_empresa` | Matriz de roles y permisos granulares JSONB clonados por industria. |

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

### 👷 Dotación y Flota
- `GET /api/v1/personal?tenant=eim&proyecto=ANDINA-PIP` — Dotación asignada a la obra.
- `GET /api/v1/equipos?tenant=eim` — Maquinaria activa y contadores.
- `PATCH /api/v1/equipos/:id/contador` — Actualizar horómetro / odómetro desde terreno.

---

## 🛠️ Despliegue en Producción con PM2 (Oracle Cloud / Luke Server)

```bash
# Compilar TypeScript
npm run build

# Iniciar o recargar con PM2
pm2 start ecosystem.config.js
pm2 save
```
