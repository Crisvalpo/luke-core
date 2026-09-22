# 🏭 Regla: Estándares Industriales y Datos Multi-Tenant

## 1. Multi-Tenancy y Seguridad RLS
- Todas las tablas operativas pertenecen al esquema `core.*` y DEBEN incluir `tenant_id UUID NOT NULL REFERENCES core.tenants(id)`.
- Toda tabla debe tener habilitado **Row Level Security (RLS)** con políticas de aislamiento por `core.current_tenant_id()`.
- En el backend Express, resolver el tenant a través de `req.tenant` (`tenantResolver.ts`).

## 2. Normalización de RUT Chileno
- Los RUTs se almacenan estrictamente sin puntos ni guiones y con dígito verificador en mayúsculas (ejemplo: `15888999K`, `76123456K`).
- Utilizar siempre `normalizarRut()` y `validarRut()` (algoritmo Módulo 11) de `src/shared/utils/rut.ts`.

## 3. Formato Telefónico WhatsApp E.164
- Los números telefónicos para contacto o interacción con bots de WhatsApp deben almacenarse obligatoriamente en formato internacional **E.164** (ejemplo: `+56912345678`).
- Utilizar `normalizarTelefonoChileno()` de `src/shared/utils/phone.ts`.
- La resolución de identidad conversacional debe ejecutarse mediante la función RPC optimizada `core.resolver_identidad_whatsapp()`.

## 4. Control de Equipos y Flota
- Los equipos deben tener tipificado su método de medición: `horometro`, `kilometraje`, `mixto` o `ninguno`.
- Los contadores deben ser valores numéricos con precisión decimal (`NUMERIC(14, 2)`).

## 5. Idioma y Nomenclatura de Base de Datos
- Todos los comentarios, mensajes de error, documentaciones y endpoints API deben estar en **español**.
- Todos los nombres de esquemas, tablas y columnas de base de datos PostgreSQL deben estar estrictamente en **inglés normalizado (snake_case)**:
  - `core.tenants`, `core.projects`, `core.work_fronts`, `core.personnel`, `core.equipment`, `core.crews`, `core.crew_members`, `core.company_roles`, `core.company_operational_roles`, `core.subastas_mensajes`, `core.audit_logs`.
  - El esquema legacy `platform` fue eliminado definitivamente; no volver a crearlo ni referenciarlo.

## 6. Distinción de Roles: RBAC vs Operativos
- **Roles de Sistema (RBAC)**: Almacenados en `core.company_roles`. Definen permisos de acceso a la plataforma de software (ej: super admin, administrador de empresa, supervisor, visualizador).
- **Roles Operativos de Faena**: Almacenados en `core.company_operational_roles`. Definen cargos de terreno asignables a cuadrillas (`core.crews` / `core.crew_members`) y cuentan con la bandera `can_lead_crew` (ej: Capataz, Soldador 6G, Rigger, Ayudante).

## 7. Esquemas Internos de Supabase
- Los esquemas `realtime`, `auth` y `storage` pertenecen al motor Docker de Supabase. Las tablas de mensajes `realtime.messages_YYYY_MM_DD` se particionan y purgan automáticamente; **NUNCA** deben eliminarse o manipularse manualmente.

