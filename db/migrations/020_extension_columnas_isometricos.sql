-- ==============================================================================
-- MIGRACIÓN 020: EXTENSIÓN DE COLUMNAS DE ISOMÉTRICOS DE PIPING
-- Soporte para planos contratista, planos codelco y control de spooleado
-- ==============================================================================

ALTER TABLE piping.isometricos
  ADD COLUMN IF NOT EXISTS plano_contratista VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS plano_codelco VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS clase VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS nps VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS empresa_ingenieria VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS condicion VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS spooleado VARCHAR(10) NULL,
  ADD COLUMN IF NOT EXISTS distribuido VARCHAR(10) NULL;
