-- ==============================================================================
-- MIGRACIÓN 018: CAPAS RAW Y STAGING PARA PIPELINE DE MIGRACIÓN PILOTO
-- Entrega 7 - Plan Canónico Multiproyecto LukeApp Piping
-- ==============================================================================

-- 1. CAPA RAW: ALMACENAMIENTO EXACTO DE ARCHIVOS FUENTE EXCEL PILOTO
CREATE TABLE IF NOT EXISTS raw.andina_list_pid (
  id BIGSERIAL PRIMARY KEY,
  payload JSONB NOT NULL,
  archivo_origen VARCHAR(255) NULL,
  ingestado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw.andina_list_lineas (
  id BIGSERIAL PRIMARY KEY,
  payload JSONB NOT NULL,
  archivo_origen VARCHAR(255) NULL,
  ingestado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw.andina_list_isos (
  id BIGSERIAL PRIMARY KEY,
  payload JSONB NOT NULL,
  archivo_origen VARCHAR(255) NULL,
  ingestado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw.andina_list_spools (
  id BIGSERIAL PRIMARY KEY,
  payload JSONB NOT NULL,
  archivo_origen VARCHAR(255) NULL,
  ingestado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw.andina_list_juntas (
  id BIGSERIAL PRIMARY KEY,
  payload JSONB NOT NULL,
  archivo_origen VARCHAR(255) NULL,
  ingestado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw.andina_reg_ejecuciones (
  id BIGSERIAL PRIMARY KEY,
  payload JSONB NOT NULL,
  archivo_origen VARCHAR(255) NULL,
  ingestado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw.andina_reg_inspecciones (
  id BIGSERIAL PRIMARY KEY,
  payload JSONB NOT NULL,
  archivo_origen VARCHAR(255) NULL,
  ingestado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw.andina_log_spools (
  id BIGSERIAL PRIMARY KEY,
  payload JSONB NOT NULL,
  archivo_origen VARCHAR(255) NULL,
  ingestado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw.andina_doc_revisiones (
  id BIGSERIAL PRIMARY KEY,
  payload JSONB NOT NULL,
  archivo_origen VARCHAR(255) NULL,
  ingestado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA DE CONTROL DE RECONCILIACIÓN Y REPORTES DE MIGRACIÓN
CREATE TABLE IF NOT EXISTS staging.migracion_reportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  origen_dataset VARCHAR(100) NOT NULL,
  entidad VARCHAR(50) NOT NULL,
  total_origen INTEGER NOT NULL DEFAULT 0,
  validos INTEGER NOT NULL DEFAULT 0,
  duplicados INTEGER NOT NULL DEFAULT 0,
  sin_padre INTEGER NOT NULL DEFAULT 0,
  codigo_invalido INTEGER NOT NULL DEFAULT 0,
  fecha_invalida INTEGER NOT NULL DEFAULT 0,
  catalogo_faltante INTEGER NOT NULL DEFAULT 0,
  migrados INTEGER NOT NULL DEFAULT 0,
  rechazados INTEGER NOT NULL DEFAULT 0,
  errores JSONB NOT NULL DEFAULT '[]'::jsonb,
  ejecutado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_migracion_rep_proy FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);
