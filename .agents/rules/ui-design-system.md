# 🎨 Regla: Sistema de Diseño Corporativo Claro (Inspirado en LukeEquipos)

## 1. Identidad Visual Corporativa (No Plantillas Genéricas de IA)
- **Modo Claro Predeterminado**: El entorno visual debe ser siempre claro, limpio y sobrio, optimizado para faenas industriales y visualización en luz de día.
- **Paleta Oficial**:
  - Fondo general: `#fdfdfb` (`--bg-app`).
  - Navegación / Sidebar: `#f0f3ee` (`--bg-sidebar`), borde `#e1e7dd`.
  - Contenedores / Tarjetas: `#ffffff` (`--bg-container`), borde `#e5e7eb`.
  - Texto principal: `#1f2937` (`--color-text`).
  - Metadatos / Etiquetas: `#6b7280` (`--color-text-muted`).
  - Acento primario: `#10b981` (Verde esmeralda industrial), hover `#059669`.
- **Prohibición**: NUNCA usar temas oscuros con degradados morados, violetas o efectos neón típicos de plantillas genéricas de IA.

## 2. Formularios y Entradas de Datos
- Las etiquetas (`label`) deben estar en mayúsculas pequeñas (`text-xs font-semibold uppercase text-muted`).
- Los inputs deben tener fondo `#f9fafb`, borde `#d1d5db`, radio de borde `8px` (`--border-radius-sm`) y foco verde esmeralda con halo suave.
- Siempre agrupar campos relacionados en estructuras tipo `FormRow` o grid de 2 a 3 columnas.

## 3. Tablas y Densidad de Información
- Las tablas deben tener cabeceras en `#f9fafb` con texto en mayúsculas pequeñas.
- Los estados deben representarse mediante **Chips / Badges** con bordes y fondos suaves:
  - **Éxito / Operativo**: Verde suave (`#dcfce7`, texto `#16a34a`, borde `#86efac`).
  - **Info / Disponible / En Proceso**: Azul suave (`#dbeafe`, texto `#2563eb`, borde `#93c5fd`).
  - **Alerta / Colación / Pendiente**: Ámbar suave (`#fef3c7`, texto `#d97706`, borde `#fcd34d`).
  - **Falla / Detenido / Inactivo**: Rojo suave (`#fee2e2`, texto `#c21a25`, borde `#fca5a5`).
- Los identificadores técnicos (RUT, Patentes, Código de Equipos `GR-101`) deben formatearse con fuente monoespaciada o negrita sutil.

## 4. Reutilización y Cero Estilos Inline
- Usar siempre las clases y variables CSS definidas en `src/shared/styles/design-tokens.css` (`.core-card`, `.core-btn`, `.core-input`, `.core-table`, `.core-badge`, etc.).
- Prohibido concatenar estilos inline repetitivos.
