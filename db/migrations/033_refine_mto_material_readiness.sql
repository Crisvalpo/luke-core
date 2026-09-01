-- ==============================================================================
-- MIGRACIÓN 033: REFINAMIENTO DE MTO (DISPONIBILIDAD DE MATERIALES Y TRAZABILIDAD)
-- 1. Asegura columnas para disponibilidad por Spool y Trazabilidad de Colada
-- ==============================================================================

ALTER TABLE piping.mto
    ADD COLUMN IF NOT EXISTS spool_code VARCHAR(255),
    ADD COLUMN IF NOT EXISTS iso_code VARCHAR(255),
    ADD COLUMN IF NOT EXISTS item_no VARCHAR(32),
    ADD COLUMN IF NOT EXISTS material_group VARCHAR(64),
    ADD COLUMN IF NOT EXISTS rating_schedule VARCHAR(64),
    ADD COLUMN IF NOT EXISTS material_spec VARCHAR(64),
    ADD COLUMN IF NOT EXISTS purchase_order_no VARCHAR(64),
    ADD COLUMN IF NOT EXISTS heat_number VARCHAR(64),
    ADD COLUMN IF NOT EXISTS warehouse_location VARCHAR(128),
    ADD COLUMN IF NOT EXISTS material_status VARCHAR(64) DEFAULT 'EN_BODEGA';
