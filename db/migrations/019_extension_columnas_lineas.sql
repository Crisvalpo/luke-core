-- ==============================================================================
-- MIGRACIÓN 019: EXTENSIÓN DE COLUMNAS DE LÍNEAS DE PIPING
-- Soporte completo para atributos operacionales y de diseño de faena
-- ==============================================================================

ALTER TABLE piping.lineas
  ADD COLUMN IF NOT EXISTS material VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS plano_codelco VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS metros NUMERIC(12,2) NULL,
  ADD COLUMN IF NOT EXISTS tipo_prueba VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS esquema_pintura VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS ral VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS revestimiento_interior VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS aislacion VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS observaciones TEXT NULL;
