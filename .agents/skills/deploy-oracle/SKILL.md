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
