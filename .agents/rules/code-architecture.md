# 🏛️ Regla: Arquitectura de Código y Límite Anti-Monolito

## 1. Límite de Tamaño por Archivo
- **Máximo 250 - 300 líneas de código** por archivo (`.ts`, `.js`, `.sql`, componentes).
- Si un archivo se acerca a las 250 líneas, es **obligatorio** dividirlo:
  - Extraer lógica de negocio a un `service.ts` o helpers dedicados.
  - Extraer validaciones Zod a un `schema.ts`.
  - Extraer queries SQL a un `repository.ts` o script específico.
  - Extraer subcomponentes si se trata de una interfaz web.

## 2. Prohibición de Estilos en Línea Desordenados
- **NUNCA** escribir componentes web con bloques interminables de estilos inline `style="..."`.
- Utilizar hojas de estilo modulares (`.css`), clases semánticas o variables/tokens CSS de diseño universales.

## 3. Arquitectura Vertical Slice (Modular por Dominio)
- Todo nuevo dominio de negocio debe vivir en `src/modules/<nombre-dominio>/` y contener:
  - `<dominio>.routes.ts`: Definición de endpoints HTTP.
  - `<dominio>.controller.ts`: Orquestación de peticiones y respuestas.
  - `<dominio>.service.ts`: Lógica de negocio pura y consultas de base de datos.
  - `<dominio>.schema.ts`: Esquemas de validación Zod.
- Lo transversal (middlewares, formateadores, normalizadores) pertenece a `src/shared/`.

## 4. Respuestas de API Estandarizadas
- Todas las rutas HTTP deben responder utilizando los helpers unificados:
  - `sendSuccess(res, data, statusCode, meta)`
  - `sendError(res, mensaje, statusCode, detalles)`
