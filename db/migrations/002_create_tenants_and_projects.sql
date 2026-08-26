-- =============================================================================
-- MIGRACIÓN 002: Tablas de Tenants, Proyectos y Frentes de Trabajo
-- =============================================================================

-- 1. Tabla de Empresas / Tenants
CREATE TABLE IF NOT EXISTS core.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    razon_social VARCHAR(255) NOT NULL,
    rut VARCHAR(20) UNIQUE NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE core.tenants IS 'Empresas clientes que operan en la plataforma multi-tenant';
COMMENT ON COLUMN core.tenants.slug IS 'Identificador corto en minúsculas (ej: eim, tns)';
COMMENT ON COLUMN core.tenants.rut IS 'RUT normalizado sin puntos ni guion (ej: 76123456K)';

-- 2. Tabla de Proyectos / Obras / Faenas
CREATE TABLE IF NOT EXISTS core.proyectos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
    codigo VARCHAR(64) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    centro_costo VARCHAR(64),
    ubicacion VARCHAR(255),
    estado core.estado_proyecto NOT NULL DEFAULT 'en_ejecucion',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_proyecto_tenant_codigo UNIQUE (tenant_id, codigo)
);

COMMENT ON TABLE core.proyectos IS 'Obras, faenas y centros de costo contables por empresa';

-- 3. Tabla de Frentes de Trabajo (Zonas / Sectores / WBS / CWA / IWP)
CREATE TABLE IF NOT EXISTS core.frentes_trabajo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
    proyecto_id UUID NOT NULL REFERENCES core.proyectos(id) ON DELETE CASCADE,
    codigo VARCHAR(64) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    disciplina VARCHAR(64) DEFAULT 'GENERAL', -- PIPING, ESTRUCTURA, MECANICA, ELECTRICIDAD, CIVIL, GENERAL
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_frente_proyecto_codigo UNIQUE (proyecto_id, codigo)
);

COMMENT ON TABLE core.frentes_trabajo IS 'Subdivisiones geográficas y técnicas de cada faena (Chancado, Botadero, Edificio Central, etc.)';

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_proyectos_tenant_id ON core.proyectos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_centro_costo ON core.proyectos(centro_costo);
CREATE INDEX IF NOT EXISTS idx_frentes_tenant_proyecto ON core.frentes_trabajo(tenant_id, proyecto_id);
CREATE INDEX IF NOT EXISTS idx_frentes_disciplina ON core.frentes_trabajo(disciplina);
