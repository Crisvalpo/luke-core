-- ==============================================================================
-- MIGRACIÓN 031: RETIRAR AWP DE LÍNEAS Y CONSOLIDAR EN SPOOLS
-- 1. Elimina las columnas CWA/CWP de piping.lines (y actualiza vistas)
-- 2. Asegura que piping.spools tenga los campos de empaquetamiento y fabricación
-- ==============================================================================

-- 1. Eliminar vista de compatibilidad antes de alterar columnas
DROP VIEW IF EXISTS piping.lineas CASCADE;

-- 2. Eliminar columnas AWP de piping.lines
ALTER TABLE piping.lines
    DROP COLUMN IF EXISTS cwa CASCADE,
    DROP COLUMN IF EXISTS cwp CASCADE,
    DROP COLUMN IF EXISTS ewp CASCADE,
    DROP COLUMN IF EXISTS iwp CASCADE,
    DROP COLUMN IF EXISTS pwp CASCADE;

-- 3. Recrear vista de compatibilidad sin columnas AWP
CREATE OR REPLACE VIEW piping.lineas AS 
SELECT 
    id, tenant_id, project_id AS proyecto_id, code AS codigo, 
    service_code AS servicio, pipe_class AS clase,
    nps_code AS nps_codigo, nominal_diameter_inch AS diametro_numerico, diameter_unit AS unidad_diametro,
    origin_point AS origen, destination_point AS destino, route_description AS observaciones,
    design_pressure_bar AS presion_diseno, design_temperature AS temperatura_diseno,
    is_current AS vigente, metadata, created_at, updated_at, created_by, updated_by,
    material, client_drawing_no AS plano_cliente,
    length_meters AS metros, test_pressure_bar AS tipo_prueba, painting_spec AS esquema_pintura,
    internal_coating AS revestimiento_interior, insulation AS aislacion,
    system AS sistema, sub_system AS sub_sistema, status AS estado
FROM piping.lines;

-- 3. Consolidar columnas en piping.spools
ALTER TABLE piping.spools
    ADD COLUMN IF NOT EXISTS iso_code VARCHAR(255),
    ADD COLUMN IF NOT EXISTS spool_type VARCHAR(64),
    ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS length_meters NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS current_location VARCHAR(128),
    ADD COLUMN IF NOT EXISTS current_stage VARCHAR(64),
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'ACTIVO';
