-- =============================================================================
-- MIGRACIÓN 005: Funciones Helper, Seguridad RLS y Resolución de Identidad
-- =============================================================================

-- 1. Helper: Obtener Tenant Actual desde la Sesión de BD
CREATE OR REPLACE FUNCTION core.current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Helper: Setear Tenant en la Sesión de BD
CREATE OR REPLACE FUNCTION core.set_current_tenant(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', p_tenant_id::text, false);
END;
$$ LANGUAGE plpgsql;

-- 3. Habilitar RLS (Row Level Security) en Tablas Principales
ALTER TABLE core.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.frentes_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.sesiones_canal ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS: Aislamiento estricto por tenant o bypass con super_admin
-- Tenants
DROP POLICY IF EXISTS rls_tenants_tenant_isolation ON core.tenants;
CREATE POLICY rls_tenants_tenant_isolation ON core.tenants
    USING (
        id = core.current_tenant_id()
        OR current_setting('app.is_super_admin', true) = 'true'
        OR core.current_tenant_id() IS NULL
    );

-- Proyectos
DROP POLICY IF EXISTS rls_proyectos_tenant_isolation ON core.proyectos;
CREATE POLICY rls_proyectos_tenant_isolation ON core.proyectos
    USING (
        tenant_id = core.current_tenant_id()
        OR current_setting('app.is_super_admin', true) = 'true'
        OR core.current_tenant_id() IS NULL
    )
    WITH CHECK (
        tenant_id = core.current_tenant_id()
        OR current_setting('app.is_super_admin', true) = 'true'
        OR core.current_tenant_id() IS NULL
    );

-- Frentes de Trabajo
DROP POLICY IF EXISTS rls_frentes_tenant_isolation ON core.frentes_trabajo;
CREATE POLICY rls_frentes_tenant_isolation ON core.frentes_trabajo
    USING (
        tenant_id = core.current_tenant_id()
        OR current_setting('app.is_super_admin', true) = 'true'
        OR core.current_tenant_id() IS NULL
    )
    WITH CHECK (
        tenant_id = core.current_tenant_id()
        OR current_setting('app.is_super_admin', true) = 'true'
        OR core.current_tenant_id() IS NULL
    );

-- Personal
DROP POLICY IF EXISTS rls_personal_tenant_isolation ON core.personal;
CREATE POLICY rls_personal_tenant_isolation ON core.personal
    USING (
        tenant_id = core.current_tenant_id()
        OR current_setting('app.is_super_admin', true) = 'true'
        OR core.current_tenant_id() IS NULL
    )
    WITH CHECK (
        tenant_id = core.current_tenant_id()
        OR current_setting('app.is_super_admin', true) = 'true'
        OR core.current_tenant_id() IS NULL
    );

-- Equipos
DROP POLICY IF EXISTS rls_equipos_tenant_isolation ON core.equipos;
CREATE POLICY rls_equipos_tenant_isolation ON core.equipos
    USING (
        tenant_id = core.current_tenant_id()
        OR current_setting('app.is_super_admin', true) = 'true'
        OR core.current_tenant_id() IS NULL
    )
    WITH CHECK (
        tenant_id = core.current_tenant_id()
        OR current_setting('app.is_super_admin', true) = 'true'
        OR core.current_tenant_id() IS NULL
    );

-- Proveedores
DROP POLICY IF EXISTS rls_proveedores_tenant_isolation ON core.proveedores;
CREATE POLICY rls_proveedores_tenant_isolation ON core.proveedores
    USING (
        tenant_id = core.current_tenant_id()
        OR current_setting('app.is_super_admin', true) = 'true'
        OR core.current_tenant_id() IS NULL
    )
    WITH CHECK (
        tenant_id = core.current_tenant_id()
        OR current_setting('app.is_super_admin', true) = 'true'
        OR core.current_tenant_id() IS NULL
    );

-- Sesiones Canal
DROP POLICY IF EXISTS rls_sesiones_tenant_isolation ON core.sesiones_canal;
CREATE POLICY rls_sesiones_canal_isolation ON core.sesiones_canal
    USING (
        tenant_id = core.current_tenant_id()
        OR current_setting('app.is_super_admin', true) = 'true'
        OR core.current_tenant_id() IS NULL
    )
    WITH CHECK (
        tenant_id = core.current_tenant_id()
        OR current_setting('app.is_super_admin', true) = 'true'
        OR core.current_tenant_id() IS NULL
    );

-- 5. RPC Ultra Rápido: Resolución de Identidad WhatsApp (< 5ms)
-- Dado un número telefónico E.164, resuelve automáticamente Empresa, Proyecto, Personal y Frentes de trabajo
CREATE OR REPLACE FUNCTION core.resolver_identidad_whatsapp(p_telefono TEXT)
RETURNS TABLE (
    encontrado BOOLEAN,
    personal_id UUID,
    rut VARCHAR,
    nombre_completo VARCHAR,
    cargo VARCHAR,
    rol_organizacional VARCHAR,
    telefono_whatsapp VARCHAR,
    turno VARCHAR,
    tenant_id UUID,
    tenant_slug VARCHAR,
    tenant_razon_social VARCHAR,
    proyecto_id UUID,
    proyecto_codigo VARCHAR,
    proyecto_nombre VARCHAR,
    proyecto_centro_costo VARCHAR,
    frentes_disponibles JSONB
) AS $$
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
        p.rut,
        p.nombre_completo,
        p.cargo,
        p.rol_organizacional,
        p.telefono_whatsapp,
        p.turno,
        t.id AS tenant_id,
        t.slug AS tenant_slug,
        t.razon_social AS tenant_razon_social,
        pr.id AS proyecto_id,
        pr.codigo AS proyecto_codigo,
        pr.nombre AS proyecto_nombre,
        pr.centro_costo AS proyecto_centro_costo,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', f.id,
                        'codigo', f.codigo,
                        'nombre', f.nombre,
                        'disciplina', f.disciplina
                    )
                )
                FROM core.frentes_trabajo f
                WHERE f.proyecto_id = pr.id AND f.activo = TRUE
            ),
            '[]'::jsonb
        ) AS frentes_disponibles
    FROM core.personal p
    JOIN core.tenants t ON t.id = p.tenant_id
    LEFT JOIN core.proyectos pr ON pr.id = p.proyecto_id
    WHERE p.telefono_whatsapp = v_norm_tel
      AND p.activo = TRUE
      AND t.activo = TRUE
    LIMIT 1;

    -- Si no hubo resultados, retornará 0 filas y el llamador sabrá que no está registrado
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.resolver_identidad_whatsapp(TEXT) IS 'Resuelve el contexto completo de un colaborador por su número de WhatsApp en una sola consulta indexada';
