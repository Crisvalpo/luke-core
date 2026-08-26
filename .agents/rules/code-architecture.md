# 🏛️ Regla: Stack Tecnológico y Arquitectura de Código

## 1. Stack Tecnológico Oficial e Inmutable
- **Runtime**: Node.js `>= 20.x LTS` (ES Modules `type: module`).
- **Lenguaje**: TypeScript `5.7+` con tipado estricto.
- **Framework HTTP**: Express `5.0+` modular (Vertical Slice Architecture).
- **Base de Datos**: PostgreSQL `15+` (Esquema `core.*` en Supabase Docker de Oracle Cloud).
- **Validación de Datos**: Zod `3.24+` en todos los inputs de endpoints y servicios.
- **Procesamiento de Archivos**: `xlsx` (SheetJS) para ingesta de libros Excel/CSV.
- **Frontend & UI**: Vanilla HTML5 + JavaScript ES6+ + `design-tokens.css` (Cero Tailwind, cero CSS-in-JS pesado).
- **Gestión de Procesos**: PM2 (`ecosystem.config.js`, puerto `3080`).

## 2. Límite de Tamaño por Archivo (Anti-Monolito)
- **Máximo 250 - 300 líneas de código** por archivo (`.ts`, `.js`, `.sql`, componentes).
- Si un archivo se acerca a las 250 líneas, es **obligatorio** dividirlo:
  - Extraer lógica de negocio a un `service.ts` o helpers dedicados.
  - Extraer validaciones Zod a un `schema.ts`.
  - Extraer queries SQL a un `repository.ts` o script específico.
  - Extraer subcomponentes si se trata de una interfaz web.

## 3. Prohibición de Estilos en Línea Desordenados
- **NUNCA** escribir componentes web con bloques interminables de estilos inline `style="..."`.
- Utilizar hojas de estilo modulares (`.css`), clases semánticas o variables/tokens CSS de diseño universales (`design-tokens.css`).

## 4. Arquitectura Vertical Slice (Modular por Dominio)
- Todo nuevo dominio de negocio debe vivir en `src/modules/<nombre-dominio>/` y contener:
  - `<dominio>.routes.ts`: Definición de endpoints HTTP.
  - `<dominio>.controller.ts`: Orquestación de peticiones y respuestas.
  - `<dominio>.service.ts`: Lógica de negocio pura y consultas de base de datos.
  - `<dominio>.schema.ts`: Esquemas de validación Zod.
- Lo transversal (middlewares, formateadores, normalizadores) pertenece a `src/shared/`.

## 5. Respuestas de API Estandarizadas
- Todas las rutas HTTP deben responder utilizando los helpers unificados:
  - `sendSuccess(res, data, statusCode, meta)`
  - `sendError(res, mensaje, statusCode, detalles)`
