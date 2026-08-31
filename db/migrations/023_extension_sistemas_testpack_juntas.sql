-- ==============================================================================
-- MIGRACIÓN 023: SISTEMAS, SUB-SISTEMAS Y TEST PACKS EN JUNTAS DE PIPING
-- Entidades de proceso y comisionamiento para programación y control de construcción
-- ==============================================================================

ALTER TABLE piping.juntas
  ADD COLUMN IF NOT EXISTS sistema VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS sub_sistema VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS test_pack VARCHAR(64) NULL;
