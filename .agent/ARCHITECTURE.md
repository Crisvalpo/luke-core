# 🏛️ Luke Core — Reglas de Arquitectura y Estándares de Código

Este repositorio contiene el **Backbone Organizacional Multi-Tenant** de la plataforma LukeAPP para faenas industriales y de construcción.

## ⚠️ Reglas Obligatorias para Asistentes y Desarrolladores

1. **Anti-Monolitos**:
   - NINGÚN archivo de lógica o controlador debe superar ~250–300 líneas.
   - Si una lógica crece, dividirla en servicios, repositorios o handlers especializados.
   - NUNCA escribir componentes con estilos en línea gigantes o código desestructurado.
2. **Multi-Tenancy & RLS**:
   - Toda entidad maestra pertenece a un `tenant_id`.
   - Las consultas a nivel de aplicación deben respetar el tenant resuelto por middleware (`req.tenant`).
   - El esquema PostgreSQL canónico es `core.*`.
3. **Normalización de Datos de Terreno**:
   - **RUT**: Siempre sanitizado sin puntos ni guiones y en mayúsculas (ej: `15888999K`).
   - **Teléfonos**: Siempre en formato internacional E.164 (ej: `+56912345678`) para permitir resolución en tiempo real desde WhatsApp/Telegram.
   - **Contadores de Equipos**: Siempre numéricos y tipificados (`horometro`, `kilometraje`).
4. **Despliegue y DevOps**:
   - Diseñado para operar 24/7 en Oracle Cloud (`vm-free-arm-01`) y/o `lukeserver` bajo PM2.
   - Puerto por defecto: `3080`.
   - Dominio corporativo: `*.lukeapp.cl`.
5. **Idioma**:
   - Código, comentarios, commits y documentación 100% en español.
