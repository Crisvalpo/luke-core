-- ==============================================================================
-- MIGRACIÓN 030: CORRECCIÓN DE FUNCIONES CORE Y VISTAS DE COMPATIBILIDAD
-- 1. Actualiza core.resolver_identidad_whatsapp a nombres normalizados
-- 2. Crea vistas retrocompatibles para frentes_trabajo, proveedores, solicitudes_acceso
-- 3. Crea vistas de compatibilidad para roles_empresa, roles_proyecto, project_roles
-- 4. Corrige core.clone_roles_to_project para insertar en core.company_roles
-- ==============================================================================

-- 1. VISTAS DE COMPATIBILIDAD RETROACTIVA
CREATE OR REPLACE VIEW core.frentes_trabajo AS
SELECT 
    id,
    tenant_id,
    project_id AS proyecto_id,
    code AS codigo,
    name AS nombre,
    discipline AS disciplina,
    metadata,
    is_active AS activo,
    created_at,
    updated_at
FROM core.work_fronts;

CREATE OR REPLACE VIEW core.proveedores AS
SELECT 
    id,
    tenant_id,
    tax_id AS rut,
    business_name AS razon_social,
    industry_type AS giro,
    contact_name AS contacto_nombre,
    phone_number AS telefono,
    email,
    is_active AS activo,
    metadata,
    created_at,
    updated_at
FROM core.vendors;

DROP VIEW IF EXISTS core.solicitudes_acceso CASCADE;
CREATE VIEW core.solicitudes_acceso AS
SELECT 
    id,
    usuario_windows,
    telefono,
    nombre,
    equipo,
    tenant_id,
    proyecto_id,
    status AS estado,
    aprobado_por,
    metadata,
    created_at,
    updated_at
FROM core.access_requests;

-- Vistas para roles
CREATE OR REPLACE VIEW core.project_roles AS
SELECT 
    id,
    tenant_id,
    project_id,
    code,
    name,
    description,
    color,
    base_security_role,
    permissions,
    is_template,
    is_active,
    created_at,
    updated_at
FROM core.company_roles
WHERE project_id IS NOT NULL;

CREATE OR REPLACE VIEW core.roles_empresa AS
SELECT 
    id,
    tenant_id,
    project_id AS proyecto_id,
    code AS codigo,
    name AS nombre,
    description AS descripcion,
    color,
    base_security_role AS rol_seguridad_base,
    permissions AS permisos,
    is_template,
    is_active AS activo,
    created_at,
    updated_at
FROM core.company_roles;

CREATE OR REPLACE VIEW core.roles_proyecto AS
SELECT 
    id,
    tenant_id,
    project_id AS proyecto_id,
    code AS codigo,
    name AS nombre,
    description AS descripcion,
    color,
    base_security_role AS rol_seguridad_base,
    permissions AS permisos,
    is_template,
    is_active AS activo,
    created_at,
    updated_at
FROM core.company_roles
WHERE project_id IS NOT NULL;

-- 2. CORRECCIÓN DE FUNCIONES DE CLONACIÓN DE ROLES
CREATE OR REPLACE FUNCTION core.clone_roles_to_project(p_tenant_id UUID, p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_roles_created INTEGER := 0;
BEGIN
    INSERT INTO core.company_roles (tenant_id, project_id, code, name, description, base_security_role, color, permissions, is_active, is_template)
    SELECT 
        tenant_id, 
        p_project_id, 
        code, 
        name, 
        description, 
        base_security_role, 
        color, 
        permissions, 
        is_active,
        FALSE
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

-- 3. ACTUALIZACIÓN DE FUNCIÓN core.resolver_identidad_whatsapp
DROP FUNCTION IF EXISTS core.resolver_identidad_whatsapp(text);

CREATE OR REPLACE FUNCTION core.resolver_identidad_whatsapp(p_telefono text)
RETURNS TABLE(
    encontrado boolean,
    personal_id uuid,
    rut character varying,
    nombre_completo character varying,
    cargo character varying,
    rol_organizacional character varying,
    telefono_whatsapp character varying,
    turno character varying,
    tenant_id uuid,
    tenant_slug character varying,
    tenant_razon_social character varying,
    proyecto_id uuid,
    proyecto_codigo character varying,
    proyecto_nombre character varying,
    proyecto_centro_costo character varying,
    frentes_disponibles jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_norm_tel TEXT;
BEGIN
    -- Normalizar teléfono: eliminar espacios, guiones y asegurar prefijo +
    v_norm_tel := regexp_replace(p_telefono, '[^0-9+]', '', 'g');
    IF NOT v_norm_tel LIKE '+%' THEN
        v_norm_tel := '+' || v_norm_tel;
    END IF;

    RETURN QUERY
    SELECT 
        TRUE AS encontrado,
        p.id AS personal_id,
        p.national_id AS rut,
        p.full_name AS nombre_completo,
        p.job_title AS cargo,
        p.org_role AS rol_organizacional,
        p.phone_number AS telefono_whatsapp,
        p.shift AS turno,
        t.id AS tenant_id,
        t.slug AS tenant_slug,
        t.business_name AS tenant_razon_social,
        pr.id AS proyecto_id,
        pr.code AS proyecto_codigo,
        pr.name AS proyecto_nombre,
        pr.cost_center AS proyecto_centro_costo,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', f.id,
                        'codigo', f.code,
                        'nombre', f.name,
                        'disciplina', f.discipline
                    )
                )
                FROM core.work_fronts f
                WHERE f.project_id = pr.id AND f.is_active = TRUE
            ),
            '[]'::jsonb
        ) AS frentes_disponibles
    FROM core.personnel p
    JOIN core.tenants t ON t.id = p.tenant_id
    LEFT JOIN core.projects pr ON pr.id = p.project_id
    WHERE p.phone_number = v_norm_tel
      AND p.is_active = TRUE
      AND t.is_active = TRUE
    LIMIT 1;
END;
$$;
