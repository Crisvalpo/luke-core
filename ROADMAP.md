# 🗺️ Roadmap & Backlog de Tareas — Luke Core

Registro oficial de requerimientos, mejoras de arquitectura y funcionalidades planificadas para el desarrollo continuo de **Luke Core**.

---

## 📌 Backlog de Funcionalidades Pendientes

### 🔐 Tarea 01: Autenticación e Inicio de Sesión con Google (Google OAuth)
- **Estado:** 📝 *Planificada / Anotada para implementación futura*
- **Módulo:** `src/modules/auth/` y `public/admin/login.html`
- **Prioridad:** Media / Alta
- **Objetivo:** Permitir que los usuarios y colaboradores puedan registrarse o iniciar sesión en el panel administrativo de Luke Core utilizando sus cuentas de Google (Gmail o Google Workspace corporativo).

#### 📋 Especificación Técnica:
1. **Infraestructura & Proveedor (Oracle Cloud & Google Cloud Console):**
   - Configuración de credenciales de OAuth 2.0 en [Google Cloud Console](https://console.cloud.google.com/) (Web Application).
   - Definición de URIs de redirección autorizadas (`https://api-oracle.lukeapp.cl/auth/v1/callback` y local).
   - Activación de variables GoTrue en el contenedor Docker de Supabase (`~/supabase-docker`):
     - `GOTRUE_EXTERNAL_GOOGLE_ENABLED=true`
     - `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID`
     - `GOTRUE_EXTERNAL_GOOGLE_SECRET`
     - `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI`
2. **Lógica de Negocio y Vinculación (`AuthService`):**
   - Al autenticar el token emitido por Google / Supabase, resolver la ficha en `core.personal` mediante el email normalizado.
   - Enlace automático del `auth_user_id` en la ficha de personal si aún no estaba enlazado.
   - Preservación de la regla de aislamiento de apps corporativas: si un usuario autenticado por Google no pertenece a ninguna empresa activa en `core.personal` ni es `super_admin`, aplicar el flujo correspondiente (mensaje de solicitud de acceso o asistente de onboarding de nueva empresa).
3. **Interfaz de Usuario (Frontend):**
   - Integración del botón estándar *"Continuar con Google"* en [login.html](file:///c:/Github/Core/public/admin/login.html).
   - Manejo fluido de redirección o callback sin parpadeos ni pérdida de estado.

---

## 🏗️ Tareas en Curso & Entregadas Recientemente

| ID | Tarea | Componente | Estado |
|---|---|---|---|
| **CORE-01** | Ocultación de dotación global en barra lateral para sesión Staff LukeAPP | `public/admin/` | ✅ Completada |
| **CORE-02** | Botón de gestión directa de personal en cada proyecto de empresa | `public/admin/admin.js` | ✅ Completada |
| **CORE-03** | Autenticación con Google (Google OAuth) | `src/modules/auth/` | 📝 Anotada (Pendiente) |
| **CORE-04** | buk-mirror-service: Espejo RRHH solo lectura por obra (Fase 1: Macro & XLSX) | `src/modules/mirror/` | ✅ Completada |

