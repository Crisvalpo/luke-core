---
name: excel-ingesta
description: Especificación de plantillas Excel/CSV y validaciones para carga masiva de dotación de personal y flota de equipos en Luke Core.
---

# 📊 Ingesta Masiva de Datos para Faenas (Excel / CSV)

Este Skill define las columnas, formatos y reglas de validación requeridas para cargar datos masivos en Luke Core.

## 👷 1. Plantilla de Personal / Dotación (`personal.xlsx`)

| Columna en Excel | Tipo | Requerido | Ejemplo / Formato | Mapeo a BD |
|---|---|---|---|---|
| `RUT` | Texto | Sí | `15.888.999-K` o `15888999K` | `core.personal.rut` (normalizado) |
| `Nombre Completo` | Texto | Sí | `Cristian Cabello` | `core.personal.nombre_completo` |
| `Cargo` | Texto | Sí | `Supervisor Piping` | `core.personal.cargo` |
| `Rol` | Texto | No | `supervisor`, `capataz`, `operario`, `soldador` | `core.personal.rol_organizacional` |
| `Telefono WhatsApp`| Texto | No | `+56977778888` o `977778888` | `core.personal.telefono_whatsapp` (E.164) |
| `Email` | Texto | No | `ccabello@eim.cl` | `core.personal.email` |
| `Turno` | Texto | No | `7x7`, `14x14`, `5x2` | `core.personal.turno` |
| `Codigo Proyecto` | Texto | No | `ANDINA-PIP` | `core.proyectos.id` (vía búsqueda de código) |

## 🚜 2. Plantilla de Flota / Equipos (`equipos.xlsx`)

| Columna en Excel | Tipo | Requerido | Ejemplo / Formato | Mapeo a BD |
|---|---|---|---|---|
| `Codigo Interno` | Texto | Sí | `GR-101`, `CA-201` | `core.equipos.codigo_interno` |
| `Patente` | Texto | No | `GGAA10`, `CJBB20` | `core.equipos.patente` |
| `Descripcion` | Texto | Sí | `Grúa RT Grove 80 Ton` | `core.equipos.descripcion` |
| `Categoria` | Texto | No | `grua`, `camion_aljibe`, `camioneta` | `core.equipos.categoria` |
| `Tipo Medicion` | Texto | Sí | `horometro` o `kilometraje` | `core.equipos.tipo_medicion` |
| `Contador Inicial`| Número| No | `3450.50` | `core.equipos.ultimo_contador` |
| `Codigo Proyecto` | Texto | No | `ANDINA-PIP` | `core.proyectos.id` |

## ⚙️ Reglas del Parser
1. Encabezados tolerantes (ignorar mayúsculas, tildes y espacios extras).
2. Procesamiento por lotes (`batch insert` o `ON CONFLICT DO UPDATE`).
3. Reporte de errores por fila indicando la causa exacta (ej: RUT inválido en fila 14).
