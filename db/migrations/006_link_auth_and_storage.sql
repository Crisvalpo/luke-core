-- =============================================================================
-- MIGRACIÓN 006: Vinculación con Supabase Auth (auth.users) y Storage Buckets
-- =============================================================================

-- 1. Agregar columna auth_user_id a core.personal (compatible con PostgreSQL puro y Supabase)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE core.personal 
            ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    ELSE
        -- Si no está presente el esquema auth de Supabase en local, creamos la columna como UUID simple
        ALTER TABLE core.personal 
            ADD COLUMN IF NOT EXISTS auth_user_id UUID;
    END IF;
END $$;

COMMENT ON COLUMN core.personal.auth_user_id IS 'ID de usuario en Supabase Auth (auth.users) para acceso web/dashboard';

-- Índice para búsquedas rápidas por usuario autenticado
CREATE INDEX IF NOT EXISTS idx_personal_auth_user_id ON core.personal(auth_user_id);

-- 2. Función Helper: Obtener el perfil de personal a partir del token JWT / auth.uid() de Supabase
CREATE OR REPLACE FUNCTION core.get_current_user_profile()
RETURNS TABLE (
    personal_id UUID,
    auth_user_id UUID,
    rut VARCHAR,
    nombre_completo VARCHAR,
    cargo VARCHAR,
    rol_organizacional VARCHAR,
    telefono_whatsapp VARCHAR,
    tenant_id UUID,
    tenant_slug VARCHAR,
    tenant_razon_social VARCHAR,
    proyecto_id UUID,
    proyecto_codigo VARCHAR,
    proyecto_nombre VARCHAR
) AS $$
DECLARE
    v_auth_uid UUID;
BEGIN
    -- Intentar obtener el auth.uid() desde la sesión Supabase
    BEGIN
        v_auth_uid := NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    EXCEPTION WHEN OTHERS THEN
        v_auth_uid := NULL;
    END;

    IF v_auth_uid IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        p.id AS personal_id,
        p.auth_user_id,
        p.rut,
        p.nombre_completo,
        p.cargo,
        p.rol_organizacional,
        p.telefono_whatsapp,
        t.id AS tenant_id,
        t.slug AS tenant_slug,
        t.razon_social AS tenant_razon_social,
        pr.id AS proyecto_id,
        pr.codigo AS proyecto_codigo,
        pr.nombre AS proyecto_nombre
    FROM core.personal p
    JOIN core.tenants t ON t.id = p.tenant_id
    LEFT JOIN core.proyectos pr ON pr.id = p.proyecto_id
    WHERE p.auth_user_id = v_auth_uid
      AND p.activo = TRUE
      AND t.activo = TRUE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.get_current_user_profile() IS 'Resuelve el perfil y tenant de un usuario web a partir del JWT de Supabase Auth';

-- 3. Crear Buckets de Almacenamiento en Supabase Storage (si el esquema storage existe)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        -- Bucket para logos de tenants (público)
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('core-logos', 'core-logos', TRUE)
        ON CONFLICT (id) DO UPDATE SET public = TRUE;

        -- Bucket para documentos de faena / contratos (privado)
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('core-documentos', 'core-documentos', FALSE)
        ON CONFLICT (id) DO NOTHING;

        -- Bucket para respaldo de archivos Excel importados (privado)
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('core-ingestas', 'core-ingestas', FALSE)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
