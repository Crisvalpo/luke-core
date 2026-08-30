-- ==============================================================================
-- MIGRACIÓN 012: TABLA DE SOLICITUDES DE ACCESO DESDE EXCEL VÍA WHATSAPP
-- ==============================================================================

CREATE TABLE IF NOT EXISTS core.solicitudes_acceso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_windows VARCHAR(128) NOT NULL,
    telefono VARCHAR(32) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    equipo VARCHAR(128),
    tenant_id UUID REFERENCES core.tenants(id) ON DELETE SET NULL,
    proyecto_id UUID REFERENCES core.proyectos(id) ON DELETE SET NULL,
    estado VARCHAR(32) NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE, APROBADA, RECHAZADA
    aprobado_por VARCHAR(128),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_acceso_estado ON core.solicitudes_acceso (estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_acceso_usuario ON core.solicitudes_acceso (usuario_windows);
CREATE INDEX IF NOT EXISTS idx_solicitudes_acceso_created ON core.solicitudes_acceso (created_at DESC);
