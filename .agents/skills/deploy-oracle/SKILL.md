---
name: deploy-oracle
description: Procedimientos y comandos para compilar, migrar y desplegar Luke Core en el servidor Oracle Cloud (vm-free-arm-01) bajo PM2 y Supabase Docker.
---

# 🚀 Despliegue de Luke Core en Oracle Cloud (`oracle-ssh`)

Este Skill describe los pasos exactos para desplegar o actualizar **Luke Core** en la máquina virtual ARM64 de Oracle Cloud.

## 🔑 Parámetros del Servidor
- **Host**: `vm-free-arm-01` (Oracle Cloud OCI sa-santiago-1)
- **Acceso SSH**: `ssh oracle-ssh` (Usuario `ubuntu`)
- **Directorio de despliegue**: `~/LukeCore/` o `~/luke-core/`
- **Puerto Asignado**: `3080` (HTTP Express 5)
- **Base de Datos**: PostgreSQL local en contenedor Docker de Supabase (`127.0.0.1:5432`)
- **Gestor de Procesos**: PM2 (`luke-core`)

## 📋 Flujo de Despliegue

### 1. Compilación Local / Verificación
```bash
# Validar compilación de TypeScript
npm run build
```

### 2. Sincronización con GitHub
```bash
git add .
git commit -m "feat(core): actualizacion de modulo"
git push origin main
```

### 3. Conexión y Actualización en Oracle Cloud
```bash
ssh oracle-ssh
cd ~/LukeCore
git pull origin main
npm install --omit=dev
npm run build
npm run db:migrate
pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js
pm2 save
```

### 4. Verificación de Salud
```bash
curl http://localhost:3080/health
```
Respuesta esperada: `{"ok": true, "data": {"status": "online", "app": "Luke Core", ...}}`

---

## 🔐 Estándar de Autenticación & Aislamiento de Apps (Supabase Shared Auth)

Dado que la instancia de **Supabase Auth (`auth.users`)** es compartida en el servidor entre múltiples aplicaciones (`app.lukeapp.cl`, `quiz.lukeapp.cl`, `ruleta.lukeapp.cl`, `tiktok.lukeapp.cl`):

### 📌 Regla de Aislamiento de Identidad
1. **No asumir acceso por existencia en `auth.users`**: Un usuario registrado en una app pública (ej. `quiz` o `ruleta`) existe en `auth.users`, pero **NO debe tener acceso automático a Luke Core (`app.lukeapp.cl`)**.
2. **Control por `app_metadata.apps_habilitadas`**:
   Cada aplicación debe gestionar el array `apps_habilitadas` en `user.app_metadata`:
   ```json
   {
     "apps_habilitadas": ["core", "piping", "quiz"],
     "tenant_id": "uuid-del-tenant",
     "rol": "admin"
   }
   ```
3. **Flujo para Aplicaciones Corporativas (Luke Core)**:
   - Al hacer login en `app.lukeapp.cl`, se consulta `core.personal` filtrando por `p.activo = TRUE`.
   - Si no existe en `core.personal` y no es `super_admin`, se rechaza con HTTP 403 (`Acceso denegado: Su cuenta no tiene una empresa asignada en Luke Core`).
   - Al dar de alta una nueva empresa, si el correo ya existe en `auth.users`, se enlaza su `auth_user_id` y se le envía el enlace para definir o actualizar contraseña (`resetPasswordForEmail`).
4. **Flujo para Aplicaciones Públicas (Quiz / Ruleta / TikTok)**:
   - Al registrarse o loguearse, agregar su slug a `apps_habilitadas` sin tocar ni dar acceso a los esquemas corporativos de `core`.

