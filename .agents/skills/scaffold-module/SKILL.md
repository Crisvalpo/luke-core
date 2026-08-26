---
name: scaffold-module
description: Guía y plantilla para crear nuevos submódulos limpios en Luke Core respetando los límites de tamaño y arquitectura Vertical Slice.
---

# 🧩 Creación de Nuevos Módulos en Luke Core

Cuando se requiera agregar un nuevo dominio (por ejemplo: `combustible`, `partes-diarios`, `mantenimiento`, `turnos`), seguir esta estructura estricta:

## 📁 Estructura del Módulo (`src/modules/<modulo>/`)

```
src/modules/<modulo>/
├── <modulo>.routes.ts      # Endpoints REST (Express Router)
├── <modulo>.controller.ts  # Manejo de req / res y llamadas a service
├── <modulo>.service.ts     # Lógica de negocio y consultas SQL (query())
└── <modulo>.schema.ts      # Esquemas de validación con Zod
```

## 📝 Reglas de Creación
1. **Validación primero**: Todo request body o query param debe validarse con un schema Zod de `<modulo>.schema.ts`.
2. **Sin dependencias circulares**: Los servicios solo dependen de `src/config/database.ts` y utilidades de `src/shared/`.
3. **Registro en `app.ts`**:
   ```typescript
   import { <modulo>Router } from './modules/<modulo>/<modulo>.routes.js';
   apiV1.use('/<modulo>', <modulo>Router);
   ```
4. **Límite de líneas**: Cada archivo individual debe mantenerse por debajo de las ~200 líneas de código.
