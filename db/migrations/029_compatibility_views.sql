-- ==============================================================================
-- MIGRACIÓN 029: VISTAS DE COMPATIBILIDAD RETROACTIVA (SPANISH -> ENGLISH)
-- Permite compatibilidad transparente con consultas existentes mientras se
-- consolida la nueva arquitectura en inglés.
-- ==============================================================================

-- 1. core.proyectos -> core.projects
CREATE OR REPLACE VIEW core.proyectos AS 
SELECT 
    id, tenant_id, code AS codigo, name AS nombre, 
    cost_center AS centro_costo, location AS ubicacion, 
    status AS estado, metadata, is_active AS activo, 
    created_at, updated_at
FROM core.projects;

-- 2. core.personal -> core.personnel
CREATE OR REPLACE VIEW core.personal AS 
SELECT 
    id, tenant_id, project_id AS proyecto_id, 
    national_id AS rut, full_name AS nombre_completo, 
    job_title AS cargo, org_role AS rol_organizacional, 
    phone_number AS telefono_whatsapp, email, shift AS turno, 
    is_active AS activo, metadata, auth_user_id, rol_funcional_id,
    puede_sincronizar_excel, usuario_windows, created_at, updated_at
FROM core.personnel;

-- 3. core.equipos -> core.equipment
CREATE OR REPLACE VIEW core.equipos AS 
SELECT 
    id, tenant_id, project_id AS proyecto_id, 
    internal_code AS codigo_interno, license_plate AS patente, 
    description AS descripcion, category AS categoria, 
    meter_type AS tipo_medicion, last_reading AS ultimo_contador, 
    is_active AS activo, metadata, created_at, updated_at
FROM core.equipment;

-- 4. piping.lineas -> piping.lines
CREATE OR REPLACE VIEW piping.lineas AS 
SELECT 
    id, tenant_id, project_id AS proyecto_id, code AS codigo, 
    project_fluid_id AS fluido_proyecto_id, project_pipe_class_id AS clase_proyecto_id,
    nps_code AS nps_codigo, nominal_diameter_inch AS diametro_numerico, diameter_unit AS unidad_diametro,
    origin AS origen, destination AS destino, design_pressure AS presion_diseno, design_temperature AS temperatura_diseno,
    is_current AS vigente, legacy_id, source_row_key, metadata, created_at, updated_at, created_by, updated_by,
    material, client_drawing_no AS plano_cliente, client_drawing_no AS plano_codelco,
    length_meters AS metros, test_type AS tipo_prueba, painting_spec AS esquema_pintura,
    ral_color AS ral, internal_coating AS revestimiento_interior, insulation AS aislacion,
    remarks AS observaciones, cwa, cwp, ewp, iwp, pwp
FROM piping.lines;

-- 5. piping.isometricos -> piping.isometrics
CREATE OR REPLACE VIEW piping.isometricos AS 
SELECT 
    id, tenant_id, project_id AS proyecto_id, line_id AS linea_id,
    code AS codigo, sheet_no AS hoja, current_revision AS revision_vigente,
    document_status AS estado_documental, is_current AS vigente,
    remarks AS observacion, remarks AS observaciones, legacy_id, source_row_key,
    metadata, created_at, updated_at, created_by, updated_by,
    client_drawing_no AS plano_cliente, client_drawing_no AS plano_codelco,
    plano_contratista, clase, nps, empresa_ingenieria, condicion, spooleado, distribuido,
    cwa, cwp, ewp, iwp, pwp
FROM piping.isometrics;

-- 6. piping.juntas -> piping.joints
CREATE OR REPLACE VIEW piping.juntas AS 
SELECT 
    id, tenant_id, project_id AS proyecto_id, isometric_id AS isometrico_id, spool_id,
    code AS codigo, joint_no AS numero_junta, joint_type_id AS tipo_union_id,
    nps_code AS nps_codigo, wdi_diameter AS diametro_wdi, source_revision AS revision_origen,
    current_status AS estado_actual, is_current AS vigente, deactivated_at AS inactivado_at,
    deactivated_by AS inactivado_por, deactivation_reason AS motivo_inactivacion,
    legacy_id, source_row_key, metadata, created_at, updated_at, created_by, updated_by,
    joint_type_code AS tipo_union_codigo, destination, sch, pipe_class AS clase, material,
    length_meters AS metros, service AS servicio, supervisor_name AS responsable,
    welder_stamp AS soldador, remarks AS observaciones, total_progress_pct AS porc_total,
    supply_progress_pct AS porc_suministro, fitup_progress_pct AS porc_prearmado,
    welding_progress_pct AS porc_soldadura, painting_progress_pct AS porc_pintura,
    erection_progress_pct AS porc_montaje, touchup_progress_pct AS porc_touchup,
    qa_protocols_progress_pct AS porc_protocolos, execution_date AS fecha_ejecucion,
    system AS sistema, sub_system AS sub_sistema, test_pack,
    cwa, cwp, ewp, iwp, pwp
FROM piping.joints;

-- 7. piping.valvulas -> piping.valves
CREATE OR REPLACE VIEW piping.valvulas AS 
SELECT 
    id, tenant_id, project_id AS proyecto_id, line_id AS linea_id,
    code AS codigo, tag, valve_type AS tipo, rating, diameter AS diametro,
    current_status AS estado_actual, is_current AS vigente, legacy_id, source_row_key,
    metadata, created_at, updated_at, mto_item_id AS id_mto, line_code AS codigo_linea,
    pipe_class AS clase, description AS descripcion, piping_tag AS tag_piping,
    model_ref_no AS correlativo_maqueta, external_transmittal_no AS numero_aconex,
    diagram_no AS diagrama, instrumentation_tag AS tag_instrumentacion,
    nps_diameter AS diametro_nps, quantity AS cantidad, created_by, updated_by,
    cwa, cwp, ewp, iwp, pwp
FROM piping.valves;

-- 8. piping.soportes -> piping.supports
CREATE OR REPLACE VIEW piping.soportes AS 
SELECT 
    id, tenant_id, project_id AS proyecto_id, line_id AS linea_id,
    code AS codigo, tag, support_type_id AS tipo_soporte_id,
    current_status AS estado_actual, is_current AS vigente, legacy_id, source_row_key,
    metadata, created_at, updated_at, item_no AS item_numero,
    cwa, cwp, ewp, iwp, pwp, line_code AS codigo_linea, iso_code AS codigo_iso,
    pipe_class AS clase, support_type AS tipo_soporte, nps_diameter AS diametro_nps,
    quantity AS cantidad, unit_of_measure AS unidad, weight_kg AS peso_kg,
    supply_scope AS suministro, remarks AS observaciones, created_by, updated_by
FROM piping.supports;

-- 9. piping.cat_fluidos_proyecto -> piping.project_fluids
CREATE OR REPLACE VIEW piping.cat_fluidos_proyecto AS 
SELECT id, tenant_id, project_id AS proyecto_id, code AS codigo, nombre, servicio, description AS descripcion, activo
FROM piping.project_fluids;

-- 10. piping.cat_clases_proyecto -> piping.project_pipe_classes
CREATE OR REPLACE VIEW piping.cat_clases_proyecto AS 
SELECT id, tenant_id, project_id AS proyecto_id, code AS codigo, rating, base_material AS material_base, schedule, espesor_std, activo
FROM piping.project_pipe_classes;
