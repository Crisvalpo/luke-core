-- =============================================================================
-- MIGRACIÓN 009: Autenticación Excel vía OTP WhatsApp (Baileys) y Sync Piping
-- =============================================================================

-- 1. Tabla de Usuarios Autorizados para Excel / VBA
CREATE TABLE IF NOT EXISTS core.usuarios_excel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_windows VARCHAR(64) UNIQUE NOT NULL, -- Ej: CCABELLO (Environ("USERNAME"))
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(32) NOT NULL,              -- Formato E.164 (Ej: +56912345678)
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE core.usuarios_excel IS 'Cubicadores y operadores de faena autorizados para publicar datos desde Excel';

-- 2. Tabla de OTPs Temporales (Validez 5 minutos)
CREATE TABLE IF NOT EXISTS core.auth_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES core.usuarios_excel(id) ON DELETE CASCADE,
    otp_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    ip_origen VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_otps_usuario ON core.auth_otps(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auth_otps_expires ON core.auth_otps(expires_at);

-- 3. Tabla de Auditoría de Sincronización
CREATE TABLE IF NOT EXISTS core.audit_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_windows VARCHAR(64) NOT NULL,
    proyecto_id VARCHAR(64) NOT NULL,
    tabla VARCHAR(64) NOT NULL,
    registros INTEGER NOT NULL DEFAULT 0,
    detalles JSONB NOT NULL DEFAULT '{}'::jsonb,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_sync_usuario ON core.audit_sync(usuario_windows);
CREATE INDEX IF NOT EXISTS idx_audit_sync_proyecto ON core.audit_sync(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_audit_sync_fecha ON core.audit_sync(fecha DESC);

-- 4. Asegurar Estructura y Constraints de core.lista_juntas
CREATE TABLE IF NOT EXISTS core.lista_juntas (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_proyecto TEXT NOT NULL,
    id_junta TEXT NOT NULL,
    tag TEXT,
    estado TEXT DEFAULT 'ACTIVO',
    vigente BOOLEAN DEFAULT TRUE,
    fecha_sync TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_lista_juntas UNIQUE (id_proyecto, id_junta)
);

CREATE INDEX IF NOT EXISTS idx_lista_juntas_proyecto ON core.lista_juntas(id_proyecto);
CREATE INDEX IF NOT EXISTS idx_lista_juntas_tag ON core.lista_juntas(tag);

-- 5. Usuario Inicial (Cristian Luke Cabello)
INSERT INTO core.usuarios_excel (usuario_windows, nombre, telefono, activo)
VALUES ('CCABELLO', 'Cristian Luke Cabello', '+56976694689', TRUE)
ON CONFLICT (usuario_windows) DO UPDATE 
SET nombre = EXCLUDED.nombre, telefono = EXCLUDED.telefono, activo = TRUE;
