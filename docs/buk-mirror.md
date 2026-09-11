# 👥 Buk Mirror Service — Guía de Arquitectura & Operación

Microservicio espejo de RR.HH. (solo lectura) para alimentar aplicaciones de terreno con aislamiento por obra y proyecto oficial de Dynamics.

---

## 🏛️ Principio de Arquitectura (Patrón Adaptador)

El servicio desacopla completamente el origen de los datos de los consumidores operativos (App de Terreno, Visor Piping, Control de Faena) mediante la interfaz única **`HRSource`**:

```
                         ┌─────────────────────────┐
                         │      App de Terreno     │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │   GET /mirror/workers   │
                         │   GET /mirror/foremen   │
                         └────────────┬────────────┘
                                      │
                                      ▼
                            [ Interfaz HRSource ]
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   ExcelSource    │         │    BukSource     │         │    MockSource    │
│  (Fase 1: Macro  │         │ (Fase 2: API     │         │ (Pruebas Locales │
│  VBA & XLSX)     │         │ oficial Buk.cl)  │         │    y CI/CD)      │
└──────────────────┘         └──────────────────┘         └──────────────────┘
```

La fuente activa se define mediante la variable de entorno:
```env
SOURCE=excel   # Opciones: excel | buk | mock
```

---

## 🚀 Endpoints para la Aplicación de Terreno

### 1. Consultar Trabajadores de una Obra
```http
GET /mirror/workers?project_id=PRJ-ANDINA&available_today=true
```
* **Parámetros query:**
  - `project_id` (string): Código o ID oficial de la obra en Dynamics.
  - `available_today` (boolean, opcional): Si es `true`, filtra solo aquellos que registraron marca de entrada hoy.
  - `job_title` (string, opcional): Búsqueda por cargo (ej: `Soldador`).
  - `search` (string, opcional): Búsqueda por nombre o RUT.

### 2. Consultar Capataces y Supervisores de una Obra
```http
GET /mirror/foremen?project_id=PRJ-ANDINA
```
* Filtra automáticamente trabajadores activos de la obra con cargos de `Capataz`, `Supervisor` o `Jefe`.

---

## 📥 Vías de Ingesta (Fase 1)

### Vía 1: Sincronización Directa con Macro Excel (Piping Style)
Los usuarios pueden sincronizar su planilla con 1 solo clic en Excel usando el módulo VBA [vba/Buk_ExcelSync_Snippet.bas](file:///c:/Github/Core/vba/Buk_ExcelSync_Snippet.bas):
```http
POST /mirror/sync/workers
Content-Type: application/json

{
  "workers": [
    {
      "rut": "16.890.123-4",
      "full_name": "Juan Perez Capataz",
      "job_title": "Capataz Montaje Piping",
      "cost_center": "CC-8104",
      "area": "Piping",
      "phone": "+56 9 8888 7777",
      "status": "active"
    }
  ]
}
```

### Vía 2: Carga de Archivo Excel Binario (`.xlsx` o `.csv`)
```http
POST /mirror/import/excel
Content-Type: application/json

{
  "archivo_base64": "UEsDBBQAAAAIA..."
}
```

---

## 🗺️ Regla de Mapeo: Centro de Costo Buk -> Obra Dynamics

Buk entrega `cost_center` y `area`. El espejo resuelve el `project_id` de Dynamics mediante:
1. **Regla 1:** Match exacto en `mirror_project_mappings` por `cost_center` + `area`.
2. **Regla 2:** Match por `cost_center` general.
3. **Regla 3:** Fallback 1:1 si el centro de costo coincide con el código de obra en `core.proyectos`.
4. **Regla 4:** Asigna `UNASSIGNED` si no hay equivalencia registrada.

### Administrar Mapeos:
* **Consultar:** `GET /mirror/mappings`
* **Registrar regla:**
  ```http
  POST /mirror/mappings
  Content-Type: application/json

  {
    "cost_center": "CC-8104",
    "area": "Piping",
    "project_id": "PRJ-ANDINA"
  }
  ```

---

## 🔄 Migración a Fase 2 (API Oficial de Buk)

Cuando se reciba la API Key oficial de Buk:
1. Configurar las variables en `.env`:
   ```env
   SOURCE=buk
   BUK_TENANT=miempresa
   BUK_API_KEY=tu_api_key_secreta
   ```
2. **Cero cambios de código:** Los endpoints `/mirror/workers`, `/mirror/foremen` y la app de terreno continuarán funcionando sin ninguna modificación.
