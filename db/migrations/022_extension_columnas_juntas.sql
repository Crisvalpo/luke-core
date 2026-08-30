-- ==============================================================================
-- MIGRACIÓN 022: EXTENSIÓN DE COLUMNAS DE JUNTAS DE PIPING
-- Soporte completo para soldadura, trazabilidad, porcentajes de avance y soldadores
-- ==============================================================================

ALTER TABLE piping.juntas
  ADD COLUMN IF NOT EXISTS tipo_union_codigo VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS destination VARCHAR(10) NULL,
  ADD COLUMN IF NOT EXISTS sch VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS clase VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS material VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS metros NUMERIC(12, 4) NULL,
  ADD COLUMN IF NOT EXISTS servicio VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS responsable VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS soldador VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS observaciones TEXT NULL,
  ADD COLUMN IF NOT EXISTS porc_total NUMERIC(6, 2) NULL,
  ADD COLUMN IF NOT EXISTS porc_suministro NUMERIC(6, 2) NULL,
  ADD COLUMN IF NOT EXISTS porc_prearmado NUMERIC(6, 2) NULL,
  ADD COLUMN IF NOT EXISTS porc_soldadura NUMERIC(6, 2) NULL,
  ADD COLUMN IF NOT EXISTS porc_pintura NUMERIC(6, 2) NULL,
  ADD COLUMN IF NOT EXISTS porc_montaje NUMERIC(6, 2) NULL,
  ADD COLUMN IF NOT EXISTS porc_touchup NUMERIC(6, 2) NULL,
  ADD COLUMN IF NOT EXISTS porc_protocolos NUMERIC(6, 2) NULL,
  ADD COLUMN IF NOT EXISTS fecha_ejecucion DATE NULL;
