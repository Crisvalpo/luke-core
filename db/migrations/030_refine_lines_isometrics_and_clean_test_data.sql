-- ==============================================================================
-- MIGRACIÓN 030: REFINAMIENTO DE LÍNEAS, ISOMÉTRICOS Y LIMPIEZA DE DATOS DE PRUEBA
-- 1. Agrega las nuevas columnas de ingeniería, AWP y calidad en piping.lines y piping.isometrics
-- 2. Asegura la estructura de documents.revisions para el log de planos
-- 3. Limpia (TRUNCATE) todos los datos de prueba acumulados
-- ==============================================================================

-- 1. Refinar piping.lines
ALTER TABLE piping.lines
    ADD COLUMN IF NOT EXISTS service_code VARCHAR(32),
    ADD COLUMN IF NOT EXISTS pid_reference TEXT,
    ADD COLUMN IF NOT EXISTS pipe_class VARCHAR(64),
    ADD COLUMN IF NOT EXISTS origin_point VARCHAR(128),
    ADD COLUMN IF NOT EXISTS destination_point VARCHAR(128),
    ADD COLUMN IF NOT EXISTS route_description TEXT,
    ADD COLUMN IF NOT EXISTS design_pressure_bar NUMERIC(10,3),
    ADD COLUMN IF NOT EXISTS test_pressure_bar NUMERIC(10,3),
    ADD COLUMN IF NOT EXISTS operating_pressure_normal VARCHAR(64),
    ADD COLUMN IF NOT EXISTS operating_temp_normal VARCHAR(64),
    ADD COLUMN IF NOT EXISTS heat_tracing VARCHAR(128),
    ADD COLUMN IF NOT EXISTS ndt_level VARCHAR(64),
    ADD COLUMN IF NOT EXISTS pwht_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'VIGENTE',
    ADD COLUMN IF NOT EXISTS data_source VARCHAR(255),
    ADD COLUMN IF NOT EXISTS system VARCHAR(128),
    ADD COLUMN IF NOT EXISTS sub_system VARCHAR(128);

-- 2. Refinar piping.isometrics
ALTER TABLE piping.isometrics
    ADD COLUMN IF NOT EXISTS line_code VARCHAR(255),
    ADD COLUMN IF NOT EXISTS engineering_company VARCHAR(128),
    ADD COLUMN IF NOT EXISTS contractor_drawing_no VARCHAR(128),
    ADD COLUMN IF NOT EXISTS line_segment VARCHAR(32),
    ADD COLUMN IF NOT EXISTS condition VARCHAR(64),
    ADD COLUMN IF NOT EXISTS spooling_status VARCHAR(32),
    ADD COLUMN IF NOT EXISTS distribution_status VARCHAR(32),
    ADD COLUMN IF NOT EXISTS test_pack_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'VIGENTE',
    ADD COLUMN IF NOT EXISTS document_url TEXT;

-- 3. Refinar documents.revisions
ALTER TABLE documents.revisions
    ADD COLUMN IF NOT EXISTS document_code VARCHAR(255),
    ADD COLUMN IF NOT EXISTS revision_code VARCHAR(32),
    ADD COLUMN IF NOT EXISTS issue_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS transmittal_no VARCHAR(128),
    ADD COLUMN IF NOT EXISTS issue_purpose VARCHAR(64),
    ADD COLUMN IF NOT EXISTS file_url TEXT,
    ADD COLUMN IF NOT EXISTS change_summary TEXT;

-- 4. Limpieza de datos de prueba en cascada
TRUNCATE TABLE 
    quality.joint_repairs, 
    quality.ndt_inspections, 
    quality.visual_inspections, 
    piping.joint_executions, 
    piping.spool_events, 
    piping.mto_items, 
    piping.mto, 
    piping.valves, 
    piping.supports, 
    piping.joints, 
    piping.spools, 
    piping.isometrics, 
    piping.pid_lines, 
    piping.lines, 
    piping.pid, 
    piping.legacy_joint_list, 
    documents.revision_impacts, 
    documents.revisions, 
    core.audit_sync, 
    core.access_requests, 
    raw.staging_doc_revisions, 
    raw.staging_inspections, 
    raw.staging_joint_executions, 
    raw.staging_piping_isometrics, 
    raw.staging_piping_joints, 
    raw.staging_piping_lines, 
    raw.staging_piping_pid, 
    raw.staging_piping_spools, 
    raw.staging_spool_logs 
CASCADE;
