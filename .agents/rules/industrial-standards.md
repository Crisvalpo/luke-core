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

## 5. Idioma y Nomenclatura
- Todos los nombres de tablas, columnas, endpoints, funciones, comentarios, mensajes de error y documentación deben estar en **español**.
