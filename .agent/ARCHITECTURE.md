# 🏛️ Luke Core — Arquitectura y Stack Tecnológico Oficial

Este repositorio contiene el **Backbone Organizacional Multi-Tenant** de la plataforma LukeAPP para faenas industriales y de construcción.

## 🛠️ Stack Tecnológico Oficial
- **Runtime**: Node.js 20+ LTS (ES Modules)
- **Lenguaje**: TypeScript 5.7+ (Modo Estricto)
- **Framework Backend**: Express 5.0+ (Modular / Vertical Slice)
- **Validación**: Zod 3.24+
- **Procesamiento de Planillas**: XLSX (SheetJS)
- **Base de Datos**: PostgreSQL 15+ (Esquema `core.*` en Supabase Docker Oracle Cloud)
- **Driver DB**: `pg` (Pool con transacciones RLS)
- **Frontend**: Vanilla HTML5 + JavaScript ES6+ + `design-tokens.css` (Paleta `LukeEquipos`)
- **DevOps**: PM2 (`ecosystem.config.js`, Puerto 3080) en Oracle Cloud ARM64 (`oracle-ssh`)

## 🏛️ Entidades Canónicas y Base de Datos (`core.*`)

Todas las tablas se encuentran normalizadas estrictamente en **inglés (snake_case)** en el esquema `core.*`:
- `core.tenants`: Empresas clientes (`slug`, `rut`, `razon_social`, `config`, RLS).
- `core.projects`: Obras, faenas y centros de costo. Incluye columna `client` para el mandante directo (ej: Anglo American, Codelco). *El esquema legacy `platform` fue eliminado definitivamente*.
- `core.work_fronts`: Zonas operativas y WBS/CWA/IWP (`Chancado`, `Molienda`, etc.).
- `core.personnel`: Fichas de dotación con RUT Módulo 11, teléfono WhatsApp E.164 y vinculación opcional a `auth_user_id`.
- `core.equipment`: Flota de equipos y maquinaria con control de horómetro/odómetro.
- `core.crews` & `core.crew_members`: Cuadrillas operativas y miembros con asignación de turnos y cargos de terreno.
- `core.company_roles`: Matriz de seguridad y permisos de software (RBAC de la aplicación).
- `core.company_operational_roles`: Cargos operativos de faena/terreno (`can_lead_crew`, ej: Capataz, Soldador, Rigger).
- `core.subastas_mensajes`: Mensajería conversacional y subastas de WhatsApp.
- `core.audit_logs`: Trazabilidad inmutable de eventos.

> [!WARNING]
> Los esquemas internos de Supabase (`realtime`, `auth`, `storage`) son administrados por el motor de Supabase Docker. Las tablas `realtime.messages_*` son auto-particionadas y purgadas automáticamente; **NUNCA** deben manipularse ni eliminarse manualmente.

## ⚠️ Reglas Obligatorias para Asistentes y Desarrolladores

1. **Anti-Monolitos**:
   - NINGÚN archivo de lógica o controlador debe superar ~250–300 líneas.
   - Si una lógica crece, dividirla en servicios, repositorios o handlers especializados.
   - NUNCA escribir componentes con estilos en línea desordenados ni bibliotecas pesadas innecesarias.
2. **Multi-Tenancy & RLS**:
   - Toda entidad operativa pertenece a un `tenant_id` y tiene habilitado **Row-Level Security (RLS)**.
   - Middleware `requireTenant`: Aplica a rutas operativas (`/api/v1/projects`, `/api/v1/personnel`, etc.).
   - Excepciones de Tenant: Rutas de administración global y rutas personales (ej: `PUT /api/v1/personal/perfil`) solo requieren autenticación JWT (`requireAuth`), permitiendo operar a Super-Admins sin tenant forzado.
3. **Normalización de Datos de Terreno**:
   - **RUT**: Siempre sanitizado sin puntos ni guiones y en mayúsculas (ej: `15888999K`) mediante Módulo 11.
   - **Teléfonos**: Siempre en formato internacional E.164 (ej: `+56912345678`) para resolución de identidad en tiempo real con bots de WhatsApp.
   - **Contadores de Equipos**: Siempre numéricos y tipificados (`horometro`, `kilometraje`).
4. **Diseño de UI e Interfaz (Corporativo Claro)**:
   - **Prohibición Total de Emojis**: Cero emojis en botones, tablas, modales o títulos. Usar exclusivamente iconos SVG outline/silueta (estilo Supabase).
   - **Menús Contextuales en Tablas**: Dropdowns flotantes (ej: botón Kebab `⋮`) deben usar `position: fixed` calculando coordenadas con `getBoundingClientRect()` para evitar recortes de `overflow` en tablas con scroll.
   - **Canvas Nativo**: Operaciones de recorte de avatar o imágenes deben usar Canvas 2D nativo de HTML5 con pan, zoom y rotación, sin dependencias externas.
5. **Despliegue y DevOps**:
   - Operación 24/7 en Oracle Cloud (`vm-free-arm-01`) bajo PM2 (`luke-core`, puerto `3080`).
   - Dominio corporativo: `https://lukeapp.cl` / `https://api-oracle.lukeapp.cl`.
6. **Idioma**:
   - Código, comentarios, commits y documentación 100% en **español**. Tablas y columnas de BD estrictamente en **inglés normalizado**.

