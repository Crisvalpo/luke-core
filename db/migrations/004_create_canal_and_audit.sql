-- =============================================================================
-- MIGRACIÓN 004: Sesiones de Canal (WhatsApp/Bots), Audit Logs y Triggers
-- =============================================================================

-- 7. Tabla de Sesiones de Canal (Memoria conversacional y contexto de interacción)
CREATE TABLE IF NOT EXISTS core.sesiones_canal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
    canal core.canal_comunicacion NOT NULL DEFAULT 'whatsapp',
    identificador_remoto VARCHAR(64) NOT NULL, -- Ej: Número WhatsApp E.164 (+56912345678), ChatID Telegram, etc.
    personal_id UUID REFERENCES core.personal(id) ON DELETE SET NULL,
    proyecto_id UUID REFERENCES core.proyectos(id) ON DELETE SET NULL,
    frente_trabajo_id UUID REFERENCES core.frentes_trabajo(id) ON DELETE SET NULL,
    estado_conversacion VARCHAR(64) NOT NULL DEFAULT 'inicio',
    flujo_activo VARCHAR(64), -- combustible, parte_diario, recepcion_material, etc.
    contexto_ia JSONB NOT NULL DEFAULT '{}'::jsonb, -- Historial de variables temporales, memoria de intents
    ultimo_mensaje_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sesion_canal_remoto UNIQUE (tenant_id, canal, identificador_remoto)
);

COMMENT ON TABLE core.sesiones_canal IS 'Estado de sesión e interacción de usuarios en WhatsApp, Telegram o interfaces web';

-- 8. Tabla de Logs de Auditoría Global
CREATE TABLE IF NOT EXISTS core.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES core.tenants(id) ON DELETE CASCADE,
    tabla VARCHAR(64) NOT NULL,
    registro_id UUID,
    accion VARCHAR(16) NOT NULL, -- INSERT, UPDATE, DELETE, LOGIN, IDENTIFY
    payload_anterior JSONB,
    payload_nuevo JSONB,
    ejecutado_por VARCHAR(128) DEFAULT 'sistema',
    ip_origen VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE core.audit_logs IS 'Trazabilidad histórica inmutable de cambios en datos y operaciones críticas';

-- Índices de Sesiones y Auditoría
CREATE INDEX IF NOT EXISTS idx_sesiones_remoto ON core.sesiones_canal(canal, identificador_remoto);
CREATE INDEX IF NOT EXISTS idx_sesiones_personal ON core.sesiones_canal(personal_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_tabla ON core.audit_logs(tenant_id, tabla);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON core.audit_logs(created_at DESC);

-- Función Reutilizable para Actualizar Automáticamente 'updated_at'
CREATE OR REPLACE FUNCTION core.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asignación de Triggers de updated_at
DROP TRIGGER IF EXISTS set_tenants_updated_at ON core.tenants;
CREATE TRIGGER set_tenants_updated_at BEFORE UPDATE ON core.tenants
    FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_proyectos_updated_at ON core.proyectos;
CREATE TRIGGER set_proyectos_updated_at BEFORE UPDATE ON core.proyectos
    FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_frentes_updated_at ON core.frentes_trabajo;
CREATE TRIGGER set_frentes_updated_at BEFORE UPDATE ON core.frentes_trabajo
    FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_personal_updated_at ON core.personal;
CREATE TRIGGER set_personal_updated_at BEFORE UPDATE ON core.personal
    FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_equipos_updated_at ON core.equipos;
CREATE TRIGGER set_equipos_updated_at BEFORE UPDATE ON core.equipos
    FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_proveedores_updated_at ON core.proveedores;
CREATE TRIGGER set_proveedores_updated_at BEFORE UPDATE ON core.proveedores
    FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_sesiones_canal_updated_at ON core.sesiones_canal;
CREATE TRIGGER set_sesiones_canal_updated_at BEFORE UPDATE ON core.sesiones_canal
    FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();
