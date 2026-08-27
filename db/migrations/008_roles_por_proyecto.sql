-- =============================================================================
-- MIGRACIÓN 008: Roles Funcionales a Nivel de Proyecto
-- Los roles pasan de ser globales por tenant a ser específicos por proyecto.
-- Las plantillas (proyecto_id IS NULL) se clonan automáticamente al crear un proyecto.
-- =============================================================================

-- 1. Agregar columna proyecto_id a roles_empresa (nullable = plantilla de tenant)
ALTER TABLE core.roles_empresa
    ADD COLUMN IF NOT EXISTS proyecto_id UUID REFERENCES core.proyectos(id) ON DELETE CASCADE;

COMMENT ON COLUMN core.roles_empresa.proyecto_id IS 'Proyecto al que pertenece el rol. NULL = plantilla de tenant que se clona a cada proyecto nuevo.';

-- 2. Índice compuesto para búsquedas rápidas por proyecto
CREATE INDEX IF NOT EXISTS idx_roles_empresa_proyecto ON core.roles_empresa(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_roles_empresa_tenant_proyecto ON core.roles_empresa(tenant_id, proyecto_id);

-- 3. Actualizar constraint de unicidad: código debe ser único dentro del PROYECTO (no solo del tenant)
-- Primero eliminar el constraint anterior
ALTER TABLE core.roles_empresa DROP CONSTRAINT IF EXISTS uq_rol_empresa_tenant_codigo;

-- Nuevo constraint: código único por tenant+proyecto (NULL proyecto = plantillas)
ALTER TABLE core.roles_empresa
    ADD CONSTRAINT uq_rol_empresa_tenant_proyecto_codigo UNIQUE (tenant_id, proyecto_id, codigo);

-- 4. Función RPC: Clonar plantillas de rol del tenant a un proyecto nuevo
CREATE OR REPLACE FUNCTION core.clonar_roles_a_proyecto(p_tenant_id UUID, p_proyecto_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_roles_creados INTEGER := 0;
BEGIN
    -- Validar existencia de proyecto y que pertenezca al tenant
    IF NOT EXISTS (
        SELECT 1 FROM core.proyectos
        WHERE id = p_proyecto_id AND tenant_id = p_tenant_id
    ) THEN
        RAISE EXCEPTION 'Proyecto % no pertenece al tenant %', p_proyecto_id, p_tenant_id;
    END IF;

    -- Clonar roles plantilla (proyecto_id IS NULL) al proyecto
    INSERT INTO core.roles_empresa (
        tenant_id, proyecto_id, codigo, nombre, descripcion,
        color, rol_seguridad_base, permisos, is_template, activo
    )
    SELECT
        tenant_id, p_proyecto_id, codigo, nombre, descripcion,
        color, rol_seguridad_base, permisos, FALSE, TRUE
    FROM core.roles_empresa
    WHERE tenant_id = p_tenant_id
      AND proyecto_id IS NULL
      AND is_template = TRUE
      AND activo = TRUE
    ON CONFLICT (tenant_id, proyecto_id, codigo) DO NOTHING;

    GET DIAGNOSTICS v_roles_creados = ROW_COUNT;
    RETURN v_roles_creados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.clonar_roles_a_proyecto(UUID, UUID) IS 'Clona las plantillas de rol del tenant a un proyecto específico, permitiendo personalización posterior por proyecto.';

-- 5. Marcar los roles existentes (sin proyecto) como plantillas
UPDATE core.roles_empresa
SET is_template = TRUE
WHERE proyecto_id IS NULL;
