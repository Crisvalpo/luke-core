-- ==============================================================================
-- MIGRACIÓN 021: EXTENSIÓN DE COLUMNAS DE SPOOLS DE PIPING
-- Soporte completo para atributos operacionales, trazabilidad y control de montaje
-- ==============================================================================

ALTER TABLE piping.spools
  ADD COLUMN IF NOT EXISTS tag_gestion VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS sistema VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS sub_sistema VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS test_pack VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS area VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS codigo_linea VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS hoja VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS revision VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS spool_numero VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS nps VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS material VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS servicio VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS esquema_pintura VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS ral VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS proceso VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS pintura_revestimiento VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS observaciones TEXT NULL;
