-- =============================================================================
-- MIGRACIÓN 003: Tablas de Personal, Equipos (Flota) y Proveedores
-- =============================================================================

-- 4. Tabla de Personal / Dotación
CREATE TABLE IF NOT EXISTS core.personal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
    proyecto_id UUID REFERENCES core.proyectos(id) ON DELETE SET NULL,
    rut VARCHAR(20) NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    cargo VARCHAR(128) NOT NULL,
    rol_organizacional VARCHAR(64) NOT NULL DEFAULT 'operario', -- admin, administrador_obra, jefe_terreno, supervisor, capataz, operador, soldador, rigger, chofer, mecanico, pañolero, operario
    telefono_whatsapp VARCHAR(32), -- Formato E.164 (ej: +56912345678)
    email VARCHAR(255),
    turno VARCHAR(32), -- 7x7, 14x14, 5x2, 4x3, noche, dia
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_personal_tenant_rut UNIQUE (tenant_id, rut)
);

COMMENT ON TABLE core.personal IS 'Dotación de colaboradores, trabajadores de faena y personal administrativo';
COMMENT ON COLUMN core.personal.rut IS 'RUT normalizado en mayúsculas sin puntos ni guion';
COMMENT ON COLUMN core.personal.telefono_whatsapp IS 'Teléfono normalizado E.164 para resolución instantánea de identidad en bots';

-- 5. Tabla de Equipos / Maquinarias / Flota de Activos
CREATE TABLE IF NOT EXISTS core.equipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
    proyecto_id UUID REFERENCES core.proyectos(id) ON DELETE SET NULL,
    codigo_interno VARCHAR(64) NOT NULL,
    patente VARCHAR(16),
    descripcion VARCHAR(255) NOT NULL,
    categoria VARCHAR(64) NOT NULL DEFAULT 'general', -- camion_tolva, grua, camion_aljibe, camion_pluma, retroexcavadora, camioneta, compresor, generador, alzaprimas, rampla
    tipo_medicion core.tipo_medicion_equipo NOT NULL DEFAULT 'horometro',
    ultimo_contador NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_equipos_tenant_codigo UNIQUE (tenant_id, codigo_interno)
);

COMMENT ON TABLE core.equipos IS 'Flota de maquinaria pesada, vehículos y equipos menores en faenas';

-- 6. Tabla de Proveedores / Contratistas / Terceros
CREATE TABLE IF NOT EXISTS core.proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
    rut VARCHAR(20) NOT NULL,
    razon_social VARCHAR(255) NOT NULL,
    giro VARCHAR(255),
    contacto_nombre VARCHAR(255),
    telefono VARCHAR(32),
    email VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_proveedores_tenant_rut UNIQUE (tenant_id, rut)
);

COMMENT ON TABLE core.proveedores IS 'Proveedores de insumos, combustible, arriendo de maquinaria y subcontratistas';

-- Índices Críticos de Alta Velocidad (Búsquedas en tiempo real para Bots y APIs)
CREATE INDEX IF NOT EXISTS idx_personal_tenant_id ON core.personal(tenant_id);
CREATE INDEX IF NOT EXISTS idx_personal_proyecto_id ON core.personal(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_personal_whatsapp ON core.personal(telefono_whatsapp);
CREATE INDEX IF NOT EXISTS idx_personal_rut ON core.personal(rut);
CREATE INDEX IF NOT EXISTS idx_personal_rol ON core.personal(rol_organizacional);

CREATE INDEX IF NOT EXISTS idx_equipos_tenant_id ON core.equipos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_equipos_proyecto_id ON core.equipos(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_equipos_patente ON core.equipos(patente);
CREATE INDEX IF NOT EXISTS idx_equipos_categoria ON core.equipos(categoria);

CREATE INDEX IF NOT EXISTS idx_proveedores_tenant_id ON core.proveedores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_rut ON core.proveedores(rut);
