-- ==============================================================================
-- MIGRACIÓN 028: NORMALIZACIÓN DE ESQUEMAS, TABLAS Y COLUMNAS A INGLÉS (COMPLETA)
-- Estandarización internacional y neutralidad de marcas/clientes en base de datos
-- ==============================================================================

-- 1. CREACIÓN DE NUEVOS ESQUEMAS ESTÁNDAR
CREATE SCHEMA IF NOT EXISTS quality;
CREATE SCHEMA IF NOT EXISTS documents;

-- ==============================================================================
-- 2. ESQUEMA CORE (Empresas, Proyectos, Personal, Equipos, Roles)
-- ==============================================================================

-- 2.1 core.tenants
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='tenants' AND column_name='razon_social') THEN
        ALTER TABLE core.tenants RENAME COLUMN razon_social TO business_name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='tenants' AND column_name='rut') THEN
        ALTER TABLE core.tenants RENAME COLUMN rut TO tax_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='tenants' AND column_name='activo') THEN
        ALTER TABLE core.tenants RENAME COLUMN activo TO is_active;
    END IF;
END $$;

-- 2.2 core.proyectos -> core.projects
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='core' AND table_name='proyectos') THEN
        ALTER TABLE core.proyectos RENAME TO projects;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='projects' AND column_name='codigo') THEN
        ALTER TABLE core.projects RENAME COLUMN codigo TO code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='projects' AND column_name='nombre') THEN
        ALTER TABLE core.projects RENAME COLUMN nombre TO name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='projects' AND column_name='centro_costo') THEN
        ALTER TABLE core.projects RENAME COLUMN centro_costo TO cost_center;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='projects' AND column_name='ubicacion') THEN
        ALTER TABLE core.projects RENAME COLUMN ubicacion TO location;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='projects' AND column_name='estado') THEN
        ALTER TABLE core.projects RENAME COLUMN estado TO status;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='projects' AND column_name='activo') THEN
        ALTER TABLE core.projects RENAME COLUMN activo TO is_active;
    END IF;
END $$;

-- 2.3 core.frentes_trabajo -> core.work_fronts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='core' AND table_name='frentes_trabajo') THEN
        ALTER TABLE core.frentes_trabajo RENAME TO work_fronts;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='work_fronts' AND column_name='proyecto_id') THEN
        ALTER TABLE core.work_fronts RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='work_fronts' AND column_name='codigo') THEN
        ALTER TABLE core.work_fronts RENAME COLUMN codigo TO code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='work_fronts' AND column_name='nombre') THEN
        ALTER TABLE core.work_fronts RENAME COLUMN nombre TO name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='work_fronts' AND column_name='disciplina') THEN
        ALTER TABLE core.work_fronts RENAME COLUMN disciplina TO discipline;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='work_fronts' AND column_name='activo') THEN
        ALTER TABLE core.work_fronts RENAME COLUMN activo TO is_active;
    END IF;
END $$;

-- 2.4 core.personal -> core.personnel
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='core' AND table_name='personal') THEN
        ALTER TABLE core.personal RENAME TO personnel;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='personnel' AND column_name='proyecto_id') THEN
        ALTER TABLE core.personnel RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='personnel' AND column_name='rut') THEN
        ALTER TABLE core.personnel RENAME COLUMN rut TO national_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='personnel' AND column_name='nombre_completo') THEN
        ALTER TABLE core.personnel RENAME COLUMN nombre_completo TO full_name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='personnel' AND column_name='cargo') THEN
        ALTER TABLE core.personnel RENAME COLUMN cargo TO job_title;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='personnel' AND column_name='rol_organizacional') THEN
        ALTER TABLE core.personnel RENAME COLUMN rol_organizacional TO org_role;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='personnel' AND column_name='telefono_whatsapp') THEN
        ALTER TABLE core.personnel RENAME COLUMN telefono_whatsapp TO phone_number;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='personnel' AND column_name='turno') THEN
        ALTER TABLE core.personnel RENAME COLUMN turno TO shift;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='personnel' AND column_name='activo') THEN
        ALTER TABLE core.personnel RENAME COLUMN activo TO is_active;
    END IF;
END $$;

-- 2.5 core.equipos -> core.equipment
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='core' AND table_name='equipos') THEN
        ALTER TABLE core.equipos RENAME TO equipment;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='equipment' AND column_name='proyecto_id') THEN
        ALTER TABLE core.equipment RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='equipment' AND column_name='codigo_interno') THEN
        ALTER TABLE core.equipment RENAME COLUMN codigo_interno TO internal_code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='equipment' AND column_name='patente') THEN
        ALTER TABLE core.equipment RENAME COLUMN patente TO license_plate;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='equipment' AND column_name='descripcion') THEN
        ALTER TABLE core.equipment RENAME COLUMN descripcion TO description;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='equipment' AND column_name='categoria') THEN
        ALTER TABLE core.equipment RENAME COLUMN categoria TO category;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='equipment' AND column_name='tipo_medicion') THEN
        ALTER TABLE core.equipment RENAME COLUMN tipo_medicion TO meter_type;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='equipment' AND column_name='ultimo_contador') THEN
        ALTER TABLE core.equipment RENAME COLUMN ultimo_contador TO last_reading;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='equipment' AND column_name='activo') THEN
        ALTER TABLE core.equipment RENAME COLUMN activo TO is_active;
    END IF;
END $$;

-- 2.6 core.proveedores -> core.vendors
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='core' AND table_name='proveedores') THEN
        ALTER TABLE core.proveedores RENAME TO vendors;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='vendors' AND column_name='rut') THEN
        ALTER TABLE core.vendors RENAME COLUMN rut TO tax_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='vendors' AND column_name='razon_social') THEN
        ALTER TABLE core.vendors RENAME COLUMN razon_social TO business_name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='vendors' AND column_name='giro') THEN
        ALTER TABLE core.vendors RENAME COLUMN giro TO industry_type;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='vendors' AND column_name='contacto_nombre') THEN
        ALTER TABLE core.vendors RENAME COLUMN contacto_nombre TO contact_name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='vendors' AND column_name='telefono') THEN
        ALTER TABLE core.vendors RENAME COLUMN telefono TO phone_number;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='vendors' AND column_name='activo') THEN
        ALTER TABLE core.vendors RENAME COLUMN activo TO is_active;
    END IF;
END $$;

-- 2.7 core.roles_empresa -> core.company_roles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='core' AND table_name='roles_empresa') THEN
        ALTER TABLE core.roles_empresa RENAME TO company_roles;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='company_roles' AND column_name='proyecto_id') THEN
        ALTER TABLE core.company_roles RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='company_roles' AND column_name='codigo') THEN
        ALTER TABLE core.company_roles RENAME COLUMN codigo TO code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='company_roles' AND column_name='nombre') THEN
        ALTER TABLE core.company_roles RENAME COLUMN nombre TO name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='company_roles' AND column_name='descripcion') THEN
        ALTER TABLE core.company_roles RENAME COLUMN descripcion TO description;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='company_roles' AND column_name='rol_seguridad_base') THEN
        ALTER TABLE core.company_roles RENAME COLUMN rol_seguridad_base TO base_security_role;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='company_roles' AND column_name='permisos') THEN
        ALTER TABLE core.company_roles RENAME COLUMN permisos TO permissions;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='company_roles' AND column_name='activo') THEN
        ALTER TABLE core.company_roles RENAME COLUMN activo TO is_active;
    END IF;
END $$;

-- 2.8 core.roles_proyecto -> core.project_roles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='core' AND table_name='roles_proyecto') THEN
        ALTER TABLE core.roles_proyecto RENAME TO project_roles;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='project_roles' AND column_name='proyecto_id') THEN
        ALTER TABLE core.project_roles RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='project_roles' AND column_name='codigo') THEN
        ALTER TABLE core.project_roles RENAME COLUMN codigo TO code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='project_roles' AND column_name='nombre') THEN
        ALTER TABLE core.project_roles RENAME COLUMN nombre TO name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='project_roles' AND column_name='descripcion') THEN
        ALTER TABLE core.project_roles RENAME COLUMN descripcion TO description;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='project_roles' AND column_name='rol_seguridad_base') THEN
        ALTER TABLE core.project_roles RENAME COLUMN rol_seguridad_base TO base_security_role;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='project_roles' AND column_name='permisos') THEN
        ALTER TABLE core.project_roles RENAME COLUMN permisos TO permissions;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='project_roles' AND column_name='activo') THEN
        ALTER TABLE core.project_roles RENAME COLUMN activo TO is_active;
    END IF;
END $$;

-- 2.9 core.personal_proyectos -> core.project_personnel
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='core' AND table_name='personal_proyectos') THEN
        ALTER TABLE core.personal_proyectos RENAME TO project_personnel;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='project_personnel' AND column_name='proyecto_id') THEN
        ALTER TABLE core.project_personnel RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='project_personnel' AND column_name='personal_id') THEN
        ALTER TABLE core.project_personnel RENAME COLUMN personal_id TO personnel_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='project_personnel' AND column_name='rol_proyecto_id') THEN
        ALTER TABLE core.project_personnel RENAME COLUMN rol_proyecto_id TO project_role_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='project_personnel' AND column_name='activo') THEN
        ALTER TABLE core.project_personnel RENAME COLUMN activo TO is_active;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='project_personnel' AND column_name='asignado_en') THEN
        ALTER TABLE core.project_personnel RENAME COLUMN asignado_en TO assigned_at;
    END IF;
END $$;

-- 2.10 core.solicitudes_acceso -> core.access_requests
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='core' AND table_name='solicitudes_acceso') THEN
        ALTER TABLE core.solicitudes_acceso RENAME TO access_requests;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='access_requests' AND column_name='telefono_whatsapp') THEN
        ALTER TABLE core.access_requests RENAME COLUMN telefono_whatsapp TO phone_number;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='access_requests' AND column_name='rut') THEN
        ALTER TABLE core.access_requests RENAME COLUMN rut TO national_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='access_requests' AND column_name='nombre_completo') THEN
        ALTER TABLE core.access_requests RENAME COLUMN nombre_completo TO full_name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='access_requests' AND column_name='estado') THEN
        ALTER TABLE core.access_requests RENAME COLUMN estado TO status;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='access_requests' AND column_name='revisado_por') THEN
        ALTER TABLE core.access_requests RENAME COLUMN revisado_por TO reviewed_by;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='access_requests' AND column_name='revisado_en') THEN
        ALTER TABLE core.access_requests RENAME COLUMN revisado_en TO reviewed_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='access_requests' AND column_name='motivo_rechazo') THEN
        ALTER TABLE core.access_requests RENAME COLUMN motivo_rechazo TO rejection_reason;
    END IF;
END $$;

-- 2.11 core.usuarios_excel -> core.excel_users
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='core' AND table_name='usuarios_excel') THEN
        ALTER TABLE core.usuarios_excel RENAME TO excel_users;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='excel_users' AND column_name='rut') THEN
        ALTER TABLE core.excel_users RENAME COLUMN rut TO national_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='excel_users' AND column_name='nombre_completo') THEN
        ALTER TABLE core.excel_users RENAME COLUMN nombre_completo TO full_name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='excel_users' AND column_name='telefono_whatsapp') THEN
        ALTER TABLE core.excel_users RENAME COLUMN telefono_whatsapp TO phone_number;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='excel_users' AND column_name='cargo') THEN
        ALTER TABLE core.excel_users RENAME COLUMN cargo TO job_title;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='excel_users' AND column_name='activo') THEN
        ALTER TABLE core.excel_users RENAME COLUMN activo TO is_active;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='excel_users' AND column_name='ultimo_acceso') THEN
        ALTER TABLE core.excel_users RENAME COLUMN ultimo_acceso TO last_login_at;
    END IF;
END $$;

-- 2.12 core.usuarios_excel_proyectos -> core.excel_user_projects
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='core' AND table_name='usuarios_excel_proyectos') THEN
        ALTER TABLE core.usuarios_excel_proyectos RENAME TO excel_user_projects;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='excel_user_projects' AND column_name='usuario_excel_id') THEN
        ALTER TABLE core.excel_user_projects RENAME COLUMN usuario_excel_id TO excel_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='excel_user_projects' AND column_name='proyecto_id') THEN
        ALTER TABLE core.excel_user_projects RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='excel_user_projects' AND column_name='activo') THEN
        ALTER TABLE core.excel_user_projects RENAME COLUMN activo TO is_active;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='excel_user_projects' AND column_name='asignado_en') THEN
        ALTER TABLE core.excel_user_projects RENAME COLUMN asignado_en TO assigned_at;
    END IF;
END $$;

-- ==============================================================================
-- 3. ESQUEMA PIPING (Líneas, Isométricos, Spools, Juntas, Válvulas, Soportes)
-- ==============================================================================

-- 3.1 piping.pid
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='pid' AND column_name='proyecto_id') THEN
        ALTER TABLE piping.pid RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='pid' AND column_name='codigo') THEN
        ALTER TABLE piping.pid RENAME COLUMN codigo TO code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='pid' AND column_name='titulo') THEN
        ALTER TABLE piping.pid RENAME COLUMN titulo TO title;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='pid' AND column_name='revision_vigente') THEN
        ALTER TABLE piping.pid RENAME COLUMN revision_vigente TO current_revision;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='pid' AND column_name='estado_documental') THEN
        ALTER TABLE piping.pid RENAME COLUMN estado_documental TO document_status;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='pid' AND column_name='vigente') THEN
        ALTER TABLE piping.pid RENAME COLUMN vigente TO is_current;
    END IF;
END $$;

-- 3.2 piping.lineas -> piping.lines
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='lineas') THEN
        ALTER TABLE piping.lineas RENAME TO lines;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='proyecto_id') THEN
        ALTER TABLE piping.lines RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='codigo') THEN
        ALTER TABLE piping.lines RENAME COLUMN codigo TO code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='fluido_proyecto_id') THEN
        ALTER TABLE piping.lines RENAME COLUMN fluido_proyecto_id TO project_fluid_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='clase_proyecto_id') THEN
        ALTER TABLE piping.lines RENAME COLUMN clase_proyecto_id TO project_pipe_class_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='nps_codigo') THEN
        ALTER TABLE piping.lines RENAME COLUMN nps_codigo TO nps_code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='diametro_numerico') THEN
        ALTER TABLE piping.lines RENAME COLUMN diametro_numerico TO nominal_diameter_inch;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='unidad_diametro') THEN
        ALTER TABLE piping.lines RENAME COLUMN unidad_diametro TO diameter_unit;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='origen') THEN
        ALTER TABLE piping.lines RENAME COLUMN origen TO origin;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='destino') THEN
        ALTER TABLE piping.lines RENAME COLUMN destino TO destination;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='presion_diseno') THEN
        ALTER TABLE piping.lines RENAME COLUMN presion_diseno TO design_pressure;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='temperatura_diseno') THEN
        ALTER TABLE piping.lines RENAME COLUMN temperatura_diseno TO design_temperature;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='plano_codelco') THEN
        ALTER TABLE piping.lines RENAME COLUMN plano_codelco TO client_drawing_no;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='plano_cliente') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='client_drawing_no') THEN
            ALTER TABLE piping.lines RENAME COLUMN plano_cliente TO client_drawing_no;
        ELSE
            ALTER TABLE piping.lines DROP COLUMN plano_cliente;
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='vigente') THEN
        ALTER TABLE piping.lines RENAME COLUMN vigente TO is_current;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='metros') THEN
        ALTER TABLE piping.lines RENAME COLUMN metros TO length_meters;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='tipo_prueba') THEN
        ALTER TABLE piping.lines RENAME COLUMN tipo_prueba TO test_type;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='esquema_pintura') THEN
        ALTER TABLE piping.lines RENAME COLUMN esquema_pintura TO painting_spec;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='ral') THEN
        ALTER TABLE piping.lines RENAME COLUMN ral TO ral_color;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='revestimiento_interior') THEN
        ALTER TABLE piping.lines RENAME COLUMN revestimiento_interior TO internal_coating;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='aislacion') THEN
        ALTER TABLE piping.lines RENAME COLUMN aislacion TO insulation;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='lines' AND column_name='observaciones') THEN
        ALTER TABLE piping.lines RENAME COLUMN observaciones TO remarks;
    END IF;
END $$;

-- 3.3 piping.pid_lineas -> piping.pid_lines
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='pid_lineas') THEN
        ALTER TABLE piping.pid_lineas RENAME TO pid_lines;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='pid_lines' AND column_name='proyecto_id') THEN
        ALTER TABLE piping.pid_lines RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='pid_lines' AND column_name='linea_id') THEN
        ALTER TABLE piping.pid_lines RENAME COLUMN linea_id TO line_id;
    END IF;
END $$;

-- 3.4 piping.isometricos -> piping.isometrics
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='isometricos') THEN
        ALTER TABLE piping.isometricos RENAME TO isometrics;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='isometrics' AND column_name='proyecto_id') THEN
        ALTER TABLE piping.isometrics RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='isometrics' AND column_name='linea_id') THEN
        ALTER TABLE piping.isometrics RENAME COLUMN linea_id TO line_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='isometrics' AND column_name='codigo') THEN
        ALTER TABLE piping.isometrics RENAME COLUMN codigo TO code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='isometrics' AND column_name='hoja') THEN
        ALTER TABLE piping.isometrics RENAME COLUMN hoja TO sheet_no;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='isometrics' AND column_name='revision_vigente') THEN
        ALTER TABLE piping.isometrics RENAME COLUMN revision_vigente TO current_revision;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='isometrics' AND column_name='estado_documental') THEN
        ALTER TABLE piping.isometrics RENAME COLUMN estado_documental TO document_status;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='isometrics' AND column_name='plano_codelco') THEN
        ALTER TABLE piping.isometrics RENAME COLUMN plano_codelco TO client_drawing_no;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='isometrics' AND column_name='plano_cliente') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='isometrics' AND column_name='client_drawing_no') THEN
            ALTER TABLE piping.isometrics RENAME COLUMN plano_cliente TO client_drawing_no;
        ELSE
            ALTER TABLE piping.isometrics DROP COLUMN plano_cliente;
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='isometrics' AND column_name='vigente') THEN
        ALTER TABLE piping.isometrics RENAME COLUMN vigente TO is_current;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='isometrics' AND column_name='observacion') THEN
        ALTER TABLE piping.isometrics RENAME COLUMN observacion TO remarks;
    END IF;
END $$;

-- 3.5 piping.spools
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='spools' AND column_name='proyecto_id') THEN
        ALTER TABLE piping.spools RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='spools' AND column_name='isometrico_id') THEN
        ALTER TABLE piping.spools RENAME COLUMN isometrico_id TO isometric_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='spools' AND column_name='codigo') THEN
        ALTER TABLE piping.spools RENAME COLUMN codigo TO code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='spools' AND column_name='tag_gestion') THEN
        ALTER TABLE piping.spools RENAME COLUMN tag_gestion TO mgmt_tag;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='spools' AND column_name='sistema') THEN
        ALTER TABLE piping.spools RENAME COLUMN sistema TO system;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='spools' AND column_name='sub_sistema') THEN
        ALTER TABLE piping.spools RENAME COLUMN sub_sistema TO sub_system;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='spools' AND column_name='codigo_linea') THEN
        ALTER TABLE piping.spools RENAME COLUMN codigo_linea TO line_code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='spools' AND column_name='hoja') THEN
        ALTER TABLE piping.spools RENAME COLUMN hoja TO sheet_no;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='spools' AND column_name='spool_numero') THEN
        ALTER TABLE piping.spools RENAME COLUMN spool_numero TO spool_no;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='spools' AND column_name='servicio') THEN
        ALTER TABLE piping.spools RENAME COLUMN servicio TO service;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='spools' AND column_name='esquema_pintura') THEN
        ALTER TABLE piping.spools RENAME COLUMN esquema_pintura TO painting_spec;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='spools' AND column_name='proceso') THEN
        ALTER TABLE piping.spools RENAME COLUMN proceso TO process_unit;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='spools' AND column_name='pintura_revestimiento') THEN
        ALTER TABLE piping.spools RENAME COLUMN pintura_revestimiento TO coating_type;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='spools' AND column_name='observaciones') THEN
        ALTER TABLE piping.spools RENAME COLUMN observaciones TO remarks;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='spools' AND column_name='vigente') THEN
        ALTER TABLE piping.spools RENAME COLUMN vigente TO is_current;
    END IF;
END $$;

-- 3.6 piping.juntas -> piping.joints
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='juntas') THEN
        ALTER TABLE piping.juntas RENAME TO joints;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='proyecto_id') THEN
        ALTER TABLE piping.joints RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='isometrico_id') THEN
        ALTER TABLE piping.joints RENAME COLUMN isometrico_id TO isometric_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='codigo') THEN
        ALTER TABLE piping.joints RENAME COLUMN codigo TO code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='numero_junta') THEN
        ALTER TABLE piping.joints RENAME COLUMN numero_junta TO joint_no;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='tipo_union_id') THEN
        ALTER TABLE piping.joints RENAME COLUMN tipo_union_id TO joint_type_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='nps_codigo') THEN
        ALTER TABLE piping.joints RENAME COLUMN nps_codigo TO nps_code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='diametro_wdi') THEN
        ALTER TABLE piping.joints RENAME COLUMN diametro_wdi TO wdi_diameter;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='revision_origen') THEN
        ALTER TABLE piping.joints RENAME COLUMN revision_origen TO source_revision;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='estado_actual') THEN
        ALTER TABLE piping.joints RENAME COLUMN estado_actual TO current_status;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='inactivado_at') THEN
        ALTER TABLE piping.joints RENAME COLUMN inactivado_at TO deactivated_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='inactivado_por') THEN
        ALTER TABLE piping.joints RENAME COLUMN inactivado_por TO deactivated_by;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='motivo_inactivacion') THEN
        ALTER TABLE piping.joints RENAME COLUMN motivo_inactivacion TO deactivation_reason;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='tipo_union_codigo') THEN
        ALTER TABLE piping.joints RENAME COLUMN tipo_union_codigo TO joint_type_code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='clase') THEN
        ALTER TABLE piping.joints RENAME COLUMN clase TO pipe_class;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='metros') THEN
        ALTER TABLE piping.joints RENAME COLUMN metros TO length_meters;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='servicio') THEN
        ALTER TABLE piping.joints RENAME COLUMN servicio TO service;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='responsable') THEN
        ALTER TABLE piping.joints RENAME COLUMN responsable TO supervisor_name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='soldador') THEN
        ALTER TABLE piping.joints RENAME COLUMN soldador TO welder_stamp;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='observaciones') THEN
        ALTER TABLE piping.joints RENAME COLUMN observaciones TO remarks;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='porc_total') THEN
        ALTER TABLE piping.joints RENAME COLUMN porc_total TO total_progress_pct;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='porc_suministro') THEN
        ALTER TABLE piping.joints RENAME COLUMN porc_suministro TO supply_progress_pct;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='porc_prearmado') THEN
        ALTER TABLE piping.joints RENAME COLUMN porc_prearmado TO fitup_progress_pct;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='porc_soldadura') THEN
        ALTER TABLE piping.joints RENAME COLUMN porc_soldadura TO welding_progress_pct;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='porc_pintura') THEN
        ALTER TABLE piping.joints RENAME COLUMN porc_pintura TO painting_progress_pct;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='porc_montaje') THEN
        ALTER TABLE piping.joints RENAME COLUMN porc_montaje TO erection_progress_pct;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='porc_touchup') THEN
        ALTER TABLE piping.joints RENAME COLUMN porc_touchup TO touchup_progress_pct;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='porc_protocolos') THEN
        ALTER TABLE piping.joints RENAME COLUMN porc_protocolos TO qa_protocols_progress_pct;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='fecha_ejecucion') THEN
        ALTER TABLE piping.joints RENAME COLUMN fecha_ejecucion TO execution_date;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='sistema') THEN
        ALTER TABLE piping.joints RENAME COLUMN sistema TO system;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='sub_sistema') THEN
        ALTER TABLE piping.joints RENAME COLUMN sub_sistema TO sub_system;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='joints' AND column_name='vigente') THEN
        ALTER TABLE piping.joints RENAME COLUMN vigente TO is_current;
    END IF;
END $$;

-- 3.7 piping.valvulas -> piping.valves
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='valvulas') THEN
        ALTER TABLE piping.valvulas RENAME TO valves;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='valves' AND column_name='proyecto_id') THEN
        ALTER TABLE piping.valves RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='valves' AND column_name='linea_id') THEN
        ALTER TABLE piping.valves RENAME COLUMN linea_id TO line_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='valves' AND column_name='codigo') THEN
        ALTER TABLE piping.valves RENAME COLUMN codigo TO code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='valves' AND column_name='tipo') THEN
        ALTER TABLE piping.valves RENAME COLUMN tipo TO valve_type;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='valves' AND column_name='diametro') THEN
        ALTER TABLE piping.valves RENAME COLUMN diametro TO diameter;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='valves' AND column_name='estado_actual') THEN
        ALTER TABLE piping.valves RENAME COLUMN estado_actual TO current_status;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='valves' AND column_name='vigente') THEN
        ALTER TABLE piping.valves RENAME COLUMN vigente TO is_current;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='valves' AND column_name='id_mto') THEN
        ALTER TABLE piping.valves RENAME COLUMN id_mto TO mto_item_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='valves' AND column_name='codigo_linea') THEN
        ALTER TABLE piping.valves RENAME COLUMN codigo_linea TO line_code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='valves' AND column_name='clase') THEN
        ALTER TABLE piping.valves RENAME COLUMN clase TO pipe_class;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='valves' AND column_name='descripcion') THEN
        ALTER TABLE piping.valves RENAME COLUMN descripcion TO description;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='valves' AND column_name='tag_piping') THEN
        ALTER TABLE piping.valves RENAME COLUMN tag_piping TO piping_tag;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='valves' AND column_name='correlativo_maqueta') THEN
        ALTER TABLE piping.valves RENAME COLUMN correlativo_maqueta TO model_ref_no;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='valves' AND column_name='numero_aconex') THEN
        ALTER TABLE piping.valves RENAME COLUMN numero_aconex TO external_transmittal_no;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='valves' AND column_name='diagrama') THEN
        ALTER TABLE piping.valves RENAME COLUMN diagrama TO diagram_no;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='valves' AND column_name='tag_instrumentacion') THEN
        ALTER TABLE piping.valves RENAME COLUMN tag_instrumentacion TO instrumentation_tag;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='valves' AND column_name='diametro_nps') THEN
        ALTER TABLE piping.valves RENAME COLUMN diametro_nps TO nps_diameter;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='valves' AND column_name='cantidad') THEN
        ALTER TABLE piping.valves RENAME COLUMN cantidad TO quantity;
    END IF;
END $$;

-- 3.8 piping.soportes -> piping.supports
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='soportes') THEN
        ALTER TABLE piping.soportes RENAME TO supports;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='supports' AND column_name='proyecto_id') THEN
        ALTER TABLE piping.supports RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='supports' AND column_name='linea_id') THEN
        ALTER TABLE piping.supports RENAME COLUMN linea_id TO line_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='supports' AND column_name='tipo_soporte_id') THEN
        ALTER TABLE piping.supports RENAME COLUMN tipo_soporte_id TO support_type_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='supports' AND column_name='estado_actual') THEN
        ALTER TABLE piping.supports RENAME COLUMN estado_actual TO current_status;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='supports' AND column_name='vigente') THEN
        ALTER TABLE piping.supports RENAME COLUMN vigente TO is_current;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='supports' AND column_name='codigo') THEN
        ALTER TABLE piping.supports RENAME COLUMN codigo TO code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='supports' AND column_name='item_numero') THEN
        ALTER TABLE piping.supports RENAME COLUMN item_numero TO item_no;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='supports' AND column_name='codigo_linea') THEN
        ALTER TABLE piping.supports RENAME COLUMN codigo_linea TO line_code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='supports' AND column_name='codigo_iso') THEN
        ALTER TABLE piping.supports RENAME COLUMN codigo_iso TO iso_code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='supports' AND column_name='clase') THEN
        ALTER TABLE piping.supports RENAME COLUMN clase TO pipe_class;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='supports' AND column_name='tipo_soporte') THEN
        ALTER TABLE piping.supports RENAME COLUMN tipo_soporte TO support_type;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='supports' AND column_name='diametro_nps') THEN
        ALTER TABLE piping.supports RENAME COLUMN diametro_nps TO nps_diameter;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='supports' AND column_name='cantidad') THEN
        ALTER TABLE piping.supports RENAME COLUMN cantidad TO quantity;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='supports' AND column_name='unidad') THEN
        ALTER TABLE piping.supports RENAME COLUMN unidad TO unit_of_measure;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='supports' AND column_name='peso_kg') THEN
        ALTER TABLE piping.supports RENAME COLUMN peso_kg TO weight_kg;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='supports' AND column_name='suministro') THEN
        ALTER TABLE piping.supports RENAME COLUMN suministro TO supply_scope;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='supports' AND column_name='observaciones') THEN
        ALTER TABLE piping.supports RENAME COLUMN observaciones TO remarks;
    END IF;
END $$;

-- 3.9 Catálogos y Tablas Auxiliares de Piping
DO $$
BEGIN
    -- cat_elementos_normalizados -> catalog_standard_elements
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='cat_elementos_normalizados') THEN
        ALTER TABLE piping.cat_elementos_normalizados RENAME TO catalog_standard_elements;
    END IF;

    -- cat_esquemas_pintura_proyecto -> project_painting_specs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='cat_esquemas_pintura_proyecto') THEN
        ALTER TABLE piping.cat_esquemas_pintura_proyecto RENAME TO project_painting_specs;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='project_painting_specs' AND column_name='proyecto_id') THEN
        ALTER TABLE piping.project_painting_specs RENAME COLUMN proyecto_id TO project_id;
    END IF;

    -- cat_tipos_prueba -> catalog_test_types
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='cat_tipos_prueba') THEN
        ALTER TABLE piping.cat_tipos_prueba RENAME TO catalog_test_types;
    END IF;

    -- cat_tipos_soporte -> catalog_support_types
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='cat_tipos_soporte') THEN
        ALTER TABLE piping.cat_tipos_soporte RENAME TO catalog_support_types;
    END IF;

    -- elementos_bim -> bim_elements
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='elementos_bim') THEN
        ALTER TABLE piping.elementos_bim RENAME TO bim_elements;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='bim_elements' AND column_name='proyecto_id') THEN
        ALTER TABLE piping.bim_elements RENAME COLUMN proyecto_id TO project_id;
    END IF;

    -- lista_juntas -> legacy_joint_list
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='lista_juntas') THEN
        ALTER TABLE piping.lista_juntas RENAME TO legacy_joint_list;
    END IF;

    -- proyecto_configuracion -> project_configs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='proyecto_configuracion') THEN
        ALTER TABLE piping.proyecto_configuracion RENAME TO project_configs;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='project_configs' AND column_name='proyecto_id') THEN
        ALTER TABLE piping.project_configs RENAME COLUMN proyecto_id TO project_id;
    END IF;

    -- proyecto_diametros -> project_diameters
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='proyecto_diametros') THEN
        ALTER TABLE piping.proyecto_diametros RENAME TO project_diameters;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='project_diameters' AND column_name='proyecto_id') THEN
        ALTER TABLE piping.project_diameters RENAME COLUMN proyecto_id TO project_id;
    END IF;

    -- proyecto_tipos_union -> project_joint_types
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='proyecto_tipos_union') THEN
        ALTER TABLE piping.proyecto_tipos_union RENAME TO project_joint_types;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='project_joint_types' AND column_name='proyecto_id') THEN
        ALTER TABLE piping.project_joint_types RENAME COLUMN proyecto_id TO project_id;
    END IF;

    -- tie_ins
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='tie_ins' AND column_name='proyecto_id') THEN
        ALTER TABLE piping.tie_ins RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='tie_ins' AND column_name='linea_id') THEN
        ALTER TABLE piping.tie_ins RENAME COLUMN linea_id TO line_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='tie_ins' AND column_name='codigo') THEN
        ALTER TABLE piping.tie_ins RENAME COLUMN codigo TO code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='tie_ins' AND column_name='tipo') THEN
        ALTER TABLE piping.tie_ins RENAME COLUMN tipo TO tie_in_type;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='tie_ins' AND column_name='estado_actual') THEN
        ALTER TABLE piping.tie_ins RENAME COLUMN estado_actual TO current_status;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='tie_ins' AND column_name='vigente') THEN
        ALTER TABLE piping.tie_ins RENAME COLUMN vigente TO is_current;
    END IF;

    -- mto
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='mto' AND column_name='proyecto_id') THEN
        ALTER TABLE piping.mto RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='mto' AND column_name='linea_id') THEN
        ALTER TABLE piping.mto RENAME COLUMN linea_id TO line_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='mto' AND column_name='isometrico_id') THEN
        ALTER TABLE piping.mto RENAME COLUMN isometrico_id TO isometric_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='mto' AND column_name='codigo') THEN
        ALTER TABLE piping.mto RENAME COLUMN codigo TO code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='mto' AND column_name='descripcion') THEN
        ALTER TABLE piping.mto RENAME COLUMN descripcion TO description;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='mto' AND column_name='cantidad') THEN
        ALTER TABLE piping.mto RENAME COLUMN cantidad TO quantity;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='mto' AND column_name='unidad') THEN
        ALTER TABLE piping.mto RENAME COLUMN unidad TO unit_of_measure;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='mto' AND column_name='peso_unitario_kg') THEN
        ALTER TABLE piping.mto RENAME COLUMN peso_unitario_kg TO unit_weight_kg;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='mto' AND column_name='peso_total_kg') THEN
        ALTER TABLE piping.mto RENAME COLUMN peso_total_kg TO total_weight_kg;
    END IF;

    -- mto_items
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='mto_items' AND column_name='proyecto_id') THEN
        ALTER TABLE piping.mto_items RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='mto_items' AND column_name='codigo') THEN
        ALTER TABLE piping.mto_items RENAME COLUMN codigo TO code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='mto_items' AND column_name='descripcion') THEN
        ALTER TABLE piping.mto_items RENAME COLUMN descripcion TO description;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='mto_items' AND column_name='unidad') THEN
        ALTER TABLE piping.mto_items RENAME COLUMN unidad TO unit_of_measure;
    END IF;
END $$;

-- ==============================================================================
-- 4. ESQUEMA QUALITY (Inspecciones visuales, NDT, Reparaciones)
-- ==============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='calidad' AND table_name='inspecciones_visuales') THEN
        ALTER TABLE calidad.inspecciones_visuales SET SCHEMA quality;
        ALTER TABLE quality.inspecciones_visuales RENAME TO visual_inspections;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='quality' AND table_name='visual_inspections' AND column_name='proyecto_id') THEN
        ALTER TABLE quality.visual_inspections RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='quality' AND table_name='visual_inspections' AND column_name='junta_id') THEN
        ALTER TABLE quality.visual_inspections RENAME COLUMN junta_id TO joint_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='quality' AND table_name='visual_inspections' AND column_name='fecha_inspeccion') THEN
        ALTER TABLE quality.visual_inspections RENAME COLUMN fecha_inspeccion TO inspection_date;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='quality' AND table_name='visual_inspections' AND column_name='resultado') THEN
        ALTER TABLE quality.visual_inspections RENAME COLUMN resultado TO result;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='quality' AND table_name='visual_inspections' AND column_name='defectos') THEN
        ALTER TABLE quality.visual_inspections RENAME COLUMN defectos TO defects;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='quality' AND table_name='visual_inspections' AND column_name='observaciones') THEN
        ALTER TABLE quality.visual_inspections RENAME COLUMN observaciones TO remarks;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='calidad' AND table_name='ensayos_nde') THEN
        ALTER TABLE calidad.ensayos_nde SET SCHEMA quality;
        ALTER TABLE quality.ensayos_nde RENAME TO ndt_inspections;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='quality' AND table_name='ndt_inspections' AND column_name='proyecto_id') THEN
        ALTER TABLE quality.ndt_inspections RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='quality' AND table_name='ndt_inspections' AND column_name='junta_id') THEN
        ALTER TABLE quality.ndt_inspections RENAME COLUMN junta_id TO joint_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='quality' AND table_name='ndt_inspections' AND column_name='metodo_nde') THEN
        ALTER TABLE quality.ndt_inspections RENAME COLUMN metodo_nde TO ndt_method;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='quality' AND table_name='ndt_inspections' AND column_name='informe_numero') THEN
        ALTER TABLE quality.ndt_inspections RENAME COLUMN informe_numero TO report_no;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='quality' AND table_name='ndt_inspections' AND column_name='resultado') THEN
        ALTER TABLE quality.ndt_inspections RENAME COLUMN resultado TO result;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='quality' AND table_name='ndt_inspections' AND column_name='fecha_ensayo') THEN
        ALTER TABLE quality.ndt_inspections RENAME COLUMN fecha_ensayo TO test_date;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='calidad' AND table_name='reparaciones_junta') THEN
        ALTER TABLE calidad.reparaciones_junta SET SCHEMA quality;
        ALTER TABLE quality.reparaciones_junta RENAME TO joint_repairs;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='quality' AND table_name='joint_repairs' AND column_name='proyecto_id') THEN
        ALTER TABLE quality.joint_repairs RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='quality' AND table_name='joint_repairs' AND column_name='junta_id') THEN
        ALTER TABLE quality.joint_repairs RENAME COLUMN junta_id TO joint_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='quality' AND table_name='joint_repairs' AND column_name='soldador') THEN
        ALTER TABLE quality.joint_repairs RENAME COLUMN soldador TO welder_stamp;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='quality' AND table_name='joint_repairs' AND column_name='fecha_reparacion') THEN
        ALTER TABLE quality.joint_repairs RENAME COLUMN fecha_reparacion TO repair_date;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='quality' AND table_name='joint_repairs' AND column_name='reinspeccion_resultado') THEN
        ALTER TABLE quality.joint_repairs RENAME COLUMN reinspeccion_resultado TO reinspection_result;
    END IF;
END $$;

-- ==============================================================================
-- 5. ESQUEMA DOCUMENTS (Documentos, Revisiones, Impactos)
-- ==============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='documental' AND table_name='documentos') THEN
        ALTER TABLE documental.documentos SET SCHEMA documents;
        ALTER TABLE documents.documentos RENAME TO documents;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='documents' AND table_name='documents' AND column_name='proyecto_id') THEN
        ALTER TABLE documents.documents RENAME COLUMN proyecto_id TO project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='documents' AND table_name='documents' AND column_name='tipo_documento') THEN
        ALTER TABLE documents.documents RENAME COLUMN tipo_documento TO doc_type;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='documents' AND table_name='documents' AND column_name='codigo') THEN
        ALTER TABLE documents.documents RENAME COLUMN codigo TO code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='documents' AND table_name='documents' AND column_name='titulo') THEN
        ALTER TABLE documents.documents RENAME COLUMN titulo TO title;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='documents' AND table_name='documents' AND column_name='revision_vigente') THEN
        ALTER TABLE documents.documents RENAME COLUMN revision_vigente TO current_revision;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='documents' AND table_name='documents' AND column_name='estado') THEN
        ALTER TABLE documents.documents RENAME COLUMN estado TO status;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='documental' AND table_name='revisiones') THEN
        ALTER TABLE documental.revisiones SET SCHEMA documents;
        ALTER TABLE documents.revisiones RENAME TO revisions;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='documents' AND table_name='revisions' AND column_name='documento_id') THEN
        ALTER TABLE documents.revisions RENAME COLUMN documento_id TO document_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='documents' AND table_name='revisions' AND column_name='fecha_emision') THEN
        ALTER TABLE documents.revisions RENAME COLUMN fecha_emision TO issue_date;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='documents' AND table_name='revisions' AND column_name='descripcion_cambio') THEN
        ALTER TABLE documents.revisions RENAME COLUMN descripcion_cambio TO change_description;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='documents' AND table_name='revisions' AND column_name='archivo_url') THEN
        ALTER TABLE documents.revisions RENAME COLUMN archivo_url TO file_url;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='documents' AND table_name='revisions' AND column_name='vigente') THEN
        ALTER TABLE documents.revisions RENAME COLUMN vigente TO is_current;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='documental' AND table_name='impactos_revision') THEN
        ALTER TABLE documental.impactos_revision SET SCHEMA documents;
        ALTER TABLE documents.impactos_revision RENAME TO revision_impacts;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='documents' AND table_name='revision_impacts' AND column_name='tipo_entidad') THEN
        ALTER TABLE documents.revision_impacts RENAME COLUMN tipo_entidad TO entity_type;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='documents' AND table_name='revision_impacts' AND column_name='entidad_id') THEN
        ALTER TABLE documents.revision_impacts RENAME COLUMN entidad_id TO entity_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='documents' AND table_name='revision_impacts' AND column_name='impacto_descripcion') THEN
        ALTER TABLE documents.revision_impacts RENAME COLUMN impacto_descripcion TO impact_description;
    END IF;
END $$;

-- ==============================================================================
-- 6. ESQUEMA RAW (Neutralización de marcas de clientes)
-- ==============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='raw' AND table_name='andina_list_pid') THEN
        ALTER TABLE raw.andina_list_pid RENAME TO staging_piping_pid;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='raw' AND table_name='andina_list_lineas') THEN
        ALTER TABLE raw.andina_list_lineas RENAME TO staging_piping_lines;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='raw' AND table_name='andina_list_isos') THEN
        ALTER TABLE raw.andina_list_isos RENAME TO staging_piping_isometrics;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='raw' AND table_name='andina_list_spools') THEN
        ALTER TABLE raw.andina_list_spools RENAME TO staging_piping_spools;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='raw' AND table_name='andina_list_juntas') THEN
        ALTER TABLE raw.andina_list_juntas RENAME TO staging_piping_joints;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='raw' AND table_name='andina_reg_ejecuciones') THEN
        ALTER TABLE raw.andina_reg_ejecuciones RENAME TO staging_joint_executions;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='raw' AND table_name='andina_reg_inspecciones') THEN
        ALTER TABLE raw.andina_reg_inspecciones RENAME TO staging_inspections;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='raw' AND table_name='andina_log_spools') THEN
        ALTER TABLE raw.andina_log_spools RENAME TO staging_spool_logs;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='raw' AND table_name='andina_doc_revisiones') THEN
        ALTER TABLE raw.andina_doc_revisiones RENAME TO staging_doc_revisions;
    END IF;
END $$;

-- ==============================================================================
-- 7. RECREACIÓN DE FUNCIONES DE ROLES CON NOMENCLATURA EN INGLÉS
-- ==============================================================================

CREATE OR REPLACE FUNCTION core.clone_standard_roles(p_tenant_id UUID, p_industry_type TEXT DEFAULT 'industrial')
RETURNS INTEGER AS $$
DECLARE
    v_roles_created INTEGER := 0;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM core.tenants WHERE id = p_tenant_id) THEN
        RAISE EXCEPTION 'Tenant % does not exist', p_tenant_id;
    END IF;

    IF p_industry_type = 'industrial' OR p_industry_type = 'montaje' THEN
        INSERT INTO core.company_roles (tenant_id, code, name, description, base_security_role, color, permissions, is_template)
        VALUES
            (p_tenant_id, 'ADMIN_GENERAL', 'Administrador General', 'Control total administrativo de la empresa y proyectos', 'admin', '#10b981', '{"modulos": {"all": {"acceso": true}}, "recursos": {"all": {"crear": true, "editar": true, "eliminar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'JEFE_PROYECTO', 'Gerencia / Jefe de Proyecto', 'Visibilidad completa de avances, curvas S y reportes financieros', 'supervisor', '#8b5cf6', '{"modulos": {"dashboard": {"ver": true}, "partes_diarios": {"ver": true}, "combustible": {"ver": true}, "reportes": {"ver": true, "exportar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'CLIENTE_ITO', 'Cliente / Inspector Técnico (ITO)', 'Visibilidad y aprobación de protocolos de calidad y entregables', 'supervisor', '#f59e0b', '{"modulos": {"calidad": {"ver": true, "aprobar": true, "rechazar": true}, "reportes": {"ver": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'PLANIFICADOR', 'Planificación & Control (P&C)', 'Control de programas, líneas base, curvas de avance y HH', 'supervisor', '#3b82f6', '{"modulos": {"planificacion": {"ver": true, "editar": true}, "reportes": {"exportar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'JEFE_OFICINA_TECNICA', 'Jefe Oficina Técnica', 'Gestión de cubicaciones, ingeniería, planos e ingesta de datos', 'admin', '#059669', '{"modulos": {"ingenieria": {"ver": true, "editar": true}, "ingesta_masiva": {"ejecutar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'CONTROL_DOCUMENTAL', 'Control Documental', 'Recepción y distribución de planos, transmittals y revisiones', 'supervisor', '#06b6d4', '{"modulos": {"documentos": {"ver": true, "subir": true, "versionar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'JEFE_TERRENO', 'Jefe de Terreno', 'Coordinación general de frentes de faena, maquinaria y cuadrillas', 'supervisor', '#f97316', '{"modulos": {"partes_diarios": {"aprobar": true}, "combustible": {"aprobar_vales": true}, "cuadrillas": {"gestionar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'SUPERVISOR_TERRENO', 'Supervisor de Terreno', 'Liderazgo de cuadrillas operativas y reporte diario de avance', 'supervisor', '#ea580c', '{"modulos": {"partes_diarios": {"crear": true}, "combustible": {"solicitar": true}, "cuadrillas": {"asignar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'INSPECTOR_CALIDAD', 'Inspector de Calidad QA/QC', 'Inspección visual, liberación de juntas y ensayos no destructivos', 'supervisor', '#22c55e', '{"modulos": {"calidad": {"inspeccionar": true, "liberar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'PREVENCIONISTA', 'Asesor en Prevención (HSE)', 'Control de incidentes, inducciones, pases de faena y EPP', 'supervisor', '#eab308', '{"modulos": {"seguridad": {"ver": true, "auditar": true}, "personal": {"ver_documentos": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'CAPATAZ', 'Capataz de Cuadrilla', 'Mando directo en terreno y asignación de tareas operativas', 'supervisor', '#64748b', '{"modulos": {"partes_diarios": {"crear": true}, "asistencia": {"marcar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'OPERADOR_MAQUINARIA', 'Operador de Maquinaria / Conductor', 'Operación de equipos, checklist diario y reporte por WhatsApp', 'worker', '#475569', '{"modulos": {"whatsapp_bot": {"check_diario": true, "carga_combustible": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'MAESTRO_MAYOR', 'Maestro Mayor / Especialista Piping', 'Ejecución especializada en terreno (trazado, corte, biselado)', 'worker', '#94a3b8', '{"modulos": {"mis_protocolos": {"ver": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'SOLDADOR_CALIFICADO', 'Soldador Calificado (6G / TIG)', 'Ejecución de soldadura con registro de cuño para trazabilidad', 'worker', '#cbd5e1', '{"modulos": {"mis_juntas": {"ver": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'BODEGUERO', 'Encargado de Bodega & Pañol', 'Control de stock, recepción de materiales y despacho de insumos', 'supervisor', '#14b8a6', '{"modulos": {"bodega": {"ver": true, "movimientos": true}, "combustible": {"despachar": true}}}'::jsonb, TRUE)
        ON CONFLICT (tenant_id, code) WHERE project_id IS NULL DO NOTHING;
    ELSIF p_industry_type = 'transporte' OR p_industry_type = 'logistica' THEN
        INSERT INTO core.company_roles (tenant_id, code, name, description, base_security_role, color, permissions, is_template)
        VALUES
            (p_tenant_id, 'ADMIN_GENERAL', 'Administrador General Flota', 'Control total de la flota y contratos', 'admin', '#10b981', '{"modulos": {"all": {"acceso": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'JEFE_OPERACIONES', 'Jefe de Operaciones Flota', 'Planificación de rutas y disponibilidad', 'supervisor', '#3b82f6', '{"modulos": {"rutas": {"ver": true}, "flota": {"gestionar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'DESPACHADOR', 'Despachador / Controlador de Ruta', 'Monitoreo en ruta y asignación de viajes', 'supervisor', '#f97316', '{"modulos": {"despacho": {"crear": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'CHOFER_RAMPLA', 'Conductor de Rampla Pesada', 'Conducción y reporte de odómetro/petróleo por WhatsApp', 'worker', '#64748b', '{"modulos": {"whatsapp_bot": {"reporte_odometro": true, "carga_combustible": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'MECANICO_TALLER', 'Mecánico de Mantenimiento', 'Pautas preventivas y correctivas de camiones', 'supervisor', '#a855f7', '{"modulos": {"mantenimiento": {"ejecutar": true}}}'::jsonb, TRUE)
        ON CONFLICT (tenant_id, code) WHERE project_id IS NULL DO NOTHING;
    END IF;

    GET DIAGNOSTICS v_roles_created = ROW_COUNT;
    RETURN v_roles_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aliases de funciones antiguas para compatibilidad
CREATE OR REPLACE FUNCTION core.clonar_roles_estandar(p_tenant_id UUID, p_tipo_industria TEXT DEFAULT 'industrial')
RETURNS INTEGER AS $$
BEGIN
    RETURN core.clone_standard_roles(p_tenant_id, p_tipo_industria);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION core.clone_roles_to_project(p_tenant_id UUID, p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_roles_created INTEGER := 0;
BEGIN
    INSERT INTO core.project_roles (tenant_id, project_id, code, name, description, base_security_role, color, permissions, is_active)
    SELECT 
        tenant_id, 
        p_project_id, 
        code, 
        name, 
        description, 
        base_security_role, 
        color, 
        permissions, 
        is_active
    FROM core.company_roles
    WHERE tenant_id = p_tenant_id 
      AND (project_id IS NULL OR is_template = TRUE)
      AND is_active = TRUE
    ON CONFLICT (tenant_id, project_id, code) DO NOTHING;

    GET DIAGNOSTICS v_roles_created = ROW_COUNT;
    RETURN v_roles_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION core.clonar_roles_a_proyecto(p_tenant_id UUID, p_proyecto_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN core.clone_roles_to_project(p_tenant_id, p_proyecto_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
