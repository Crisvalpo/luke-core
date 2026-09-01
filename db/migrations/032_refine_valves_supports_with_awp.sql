-- ==============================================================================
-- MIGRACIÓN 032: REFINAMIENTO DE VÁLVULAS Y SOPORTES CON CAPA AWP
-- 1. Consolida AWP (CWA, CWP, IWP, PWP) en piping.valves
-- 2. Asegura atributos mecánicos en piping.valves y piping.supports
-- ==============================================================================

-- 1. Consolidar columnas en piping.valves
ALTER TABLE piping.valves
    ADD COLUMN IF NOT EXISTS iso_code VARCHAR(255),
    ADD COLUMN IF NOT EXISTS end_connection VARCHAR(64),
    ADD COLUMN IF NOT EXISTS body_material VARCHAR(64),
    ADD COLUMN IF NOT EXISTS actuator_type VARCHAR(64),
    ADD COLUMN IF NOT EXISTS pwp VARCHAR(64);

-- 2. Consolidar columnas en piping.supports
ALTER TABLE piping.supports
    ADD COLUMN IF NOT EXISTS standard_detail_no VARCHAR(64),
    ADD COLUMN IF NOT EXISTS material VARCHAR(64);
