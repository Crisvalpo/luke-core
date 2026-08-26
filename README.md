# 🏗️ Luke Core — Backbone Organizacional Multi-Tenant

**Luke Core** es el núcleo canónico y multi-tenant de datos para la gestión de faenas industriales y construcción (iniciando con operaciones para **Echeverría Izquierdo Montajes Industriales (EIM)** y **TNS Transportes & Soluciones**).

Provee los servicios transversales de estructura organizacional, dotación, flota de activos, proveedores, trazabilidad conversacional y resolución de identidad de alta velocidad para bots de WhatsApp en terreno.

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

---

## 🚀 Inicio Rápido

### 1. Requisitos Previos
- Node.js >= 20.x
- PostgreSQL >= 15.x (o Supabase Docker)

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Configuración de Variables de Entorno
Copia el archivo `.env.example` a `.env` y ajusta tus credenciales de base de datos:
```bash
cp .env.example .env
```

### 4. Ejecutar Migraciones SQL y Semillas Maestras
```bash
# Aplicar todas las migraciones del esquema core.*
npm run db:migrate

# Cargar las semillas iniciales de EIM y TNS
npm run db:seed
```

### 5. Iniciar en Modo Desarrollo
```bash
npm run dev
```

---

## ⚡ Endpoints Principales de la API (v1)

### 🔍 Resolución de Identidad WhatsApp (< 5ms)
- `GET /api/v1/identidad/resolver-whatsapp?telefono=+56977778888`
- `POST /api/v1/identidad/resolver-whatsapp` (body: `{"telefono": "+56977778888"}`)

**Respuesta de Ejemplo**:
```json
{
  "ok": true,
  "data": {
    "encontrado": true,
    "personal_id": "8f888888-8888-8888-8888-888888888888",
    "rut": "15888999K",
    "nombre_completo": "Cristian Cabello",
    "cargo": "Jefe de Terreno & Líder Digital",
    "rol_organizacional": "admin",
    "telefono_whatsapp": "+56977778888",
    "tenant_slug": "eim",
    "tenant_razon_social": "Echeverría Izquierdo Montajes Industriales S.A.",
    "proyecto_codigo": "ANDINA-PIP",
    "proyecto_nombre": "Piping & Montaje Codelco Andina",
    "frentes_disponibles": [
      { "codigo": "FR-01", "nombre": "Chancado Primario Subterráneo", "disciplina": "PIPING" },
      { "codigo": "FR-02", "nombre": "Molienda SAG y Bolas", "disciplina": "MECANICA" }
    ]
  }
}
```

### 🏢 Gestión de Tenants y Proyectos
- `GET /api/v1/tenants` — Lista de empresas activas con totales agregados.
- `GET /api/v1/proyectos?tenant=eim` — Obras y faenas de Echeverría Izquierdo.
- `GET /api/v1/proyectos/:id` — Detalle de faena con sus frentes de trabajo.

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
