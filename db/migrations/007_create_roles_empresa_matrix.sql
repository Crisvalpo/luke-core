-- =============================================================================
-- MIGRACIÓN 007: Matriz de Roles Funcionales Dinámicos por Empresa
-- Inspirado en el sistema de roles estándar de LukeAPPv3
-- =============================================================================

-- 1. Tabla de Roles Funcionales y Operacionales por Empresa
CREATE TABLE IF NOT EXISTS core.roles_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
    codigo VARCHAR(64) NOT NULL,            -- Ej: JEFE_PROYECTO, JEFE_OFICINA_TECNICA, QA_QC, CAPATAZ, CHOFER
    nombre VARCHAR(128) NOT NULL,           -- Ej: "Inspector de Calidad QA/QC"
    descripcion TEXT,
    color VARCHAR(16) DEFAULT '#10b981',    -- Color HEX para badges en UI
    rol_seguridad_base VARCHAR(32) NOT NULL DEFAULT 'worker' 
        CHECK (rol_seguridad_base IN ('admin', 'supervisor', 'worker')),
    permisos JSONB NOT NULL DEFAULT '{
        "modulos": {},
        "recursos": {}
    }'::jsonb,
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_rol_empresa_tenant_codigo UNIQUE (tenant_id, codigo)
);

COMMENT ON TABLE core.roles_empresa IS 'Roles operacionales y funcionales específicos por empresa con matriz de permisos granular en JSONB';

-- Índices de Roles
CREATE INDEX IF NOT EXISTS idx_roles_empresa_tenant ON core.roles_empresa(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_empresa_seguridad ON core.roles_empresa(rol_seguridad_base);
CREATE INDEX IF NOT EXISTS idx_roles_empresa_permisos ON core.roles_empresa USING gin(permisos);

-- 2. Trigger de updated_at para roles_empresa
DROP TRIGGER IF EXISTS set_roles_empresa_updated_at ON core.roles_empresa;
CREATE TRIGGER set_roles_empresa_updated_at BEFORE UPDATE ON core.roles_empresa
    FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();

-- 3. Habilitar RLS en core.roles_empresa
ALTER TABLE core.roles_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_roles_empresa_tenant_isolation ON core.roles_empresa;
CREATE POLICY rls_roles_empresa_tenant_isolation ON core.roles_empresa
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

-- 4. Vincular core.personal con su Rol Funcional
ALTER TABLE core.personal 
    ADD COLUMN IF NOT EXISTS rol_funcional_id UUID REFERENCES core.roles_empresa(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_personal_rol_funcional ON core.personal(rol_funcional_id);

-- 5. Función RPC: Clonar Plantillas Estándar de Roles a una Empresa
CREATE OR REPLACE FUNCTION core.clonar_roles_estandar(p_tenant_id UUID, p_tipo_industria TEXT DEFAULT 'industrial')
RETURNS INTEGER AS $$
DECLARE
    v_roles_creados INTEGER := 0;
BEGIN
    -- Validar existencia de la empresa
    IF NOT EXISTS (SELECT 1 FROM core.tenants WHERE id = p_tenant_id) THEN
        RAISE EXCEPTION 'Empresa con id % no existe', p_tenant_id;
    END IF;

    -- Roles Estándar para Montaje / Minería / Construcción Industrial
    IF p_tipo_industria = 'industrial' OR p_tipo_industria = 'montaje' THEN
        INSERT INTO core.roles_empresa (tenant_id, codigo, nombre, descripcion, rol_seguridad_base, color, permisos, is_template)
        VALUES
            -- Nivel Estratégico
            (
                p_tenant_id, 'ADMIN_GENERAL', 'Administrador General', 
                'Control total administrativo de la empresa y proyectos',
                'admin', '#10b981', 
                '{"modulos": {"all": {"acceso": true}}, "recursos": {"all": {"crear": true, "editar": true, "eliminar": true}}}'::jsonb, 
                TRUE
            ),
            (
                p_tenant_id, 'JEFE_PROYECTO', 'Gerencia / Jefe de Proyecto', 
                'Visibilidad completa de avances, curvas S y reportes financieros',
                'supervisor', '#8b5cf6', 
                '{"modulos": {"dashboard": {"ver": true}, "partes_diarios": {"ver": true}, "combustible": {"ver": true}, "reportes": {"ver": true, "exportar": true}}}'::jsonb, 
                TRUE
            ),
            (
                p_tenant_id, 'CLIENTE_ITO', 'Cliente / Inspector Técnico (ITO)', 
                'Visibilidad y aprobación de protocolos de calidad y entregables',
                'supervisor', '#f59e0b', 
                '{"modulos": {"calidad": {"ver": true, "aprobar": true, "rechazar": true}, "reportes": {"ver": true}}}'::jsonb, 
                TRUE
            ),
            (
                p_tenant_id, 'PLANIFICADOR', 'Planificación & Control (P&C)', 
                'Control de programas, líneas base, curvas de avance y HH',
                'supervisor', '#3b82f6', 
                '{"modulos": {"planificacion": {"ver": true, "editar": true}, "reportes": {"exportar": true}}}'::jsonb, 
                TRUE
            ),
            -- Nivel Oficina Técnica
            (
                p_tenant_id, 'JEFE_OFICINA_TECNICA', 'Jefe Oficina Técnica', 
                'Gestión de cubicaciones, ingeniería, planos e ingesta de datos',
                'admin', '#059669', 
                '{"modulos": {"ingenieria": {"ver": true, "editar": true}, "ingesta_masiva": {"ejecutar": true}}}'::jsonb, 
                TRUE
            ),
            (
                p_tenant_id, 'CONTROL_DOCUMENTAL', 'Control Documental', 
                'Recepción y distribución de planos, transmittals y revisiones',
                'supervisor', '#06b6d4', 
                '{"modulos": {"documentos": {"ver": true, "subir": true, "versionar": true}}}'::jsonb, 
                TRUE
            ),
            -- Nivel Terreno & Calidad
            (
                p_tenant_id, 'JEFE_TERRENO', 'Jefe de Terreno', 
                'Coordinación general de frentes de faena, maquinaria y cuadrillas',
                'supervisor', '#f97316', 
                '{"modulos": {"partes_diarios": {"aprobar": true}, "combustible": {"aprobar_vales": true}, "cuadrillas": {"gestionar": true}}}'::jsonb, 
                TRUE
            ),
            (
                p_tenant_id, 'SUPERVISOR_TERRENO', 'Supervisor de Terreno', 
                'Liderazgo de cuadrillas operativas y reporte diario de avance',
                'supervisor', '#ea580c', 
                '{"modulos": {"partes_diarios": {"crear": true}, "combustible": {"solicitar": true}, "cuadrillas": {"asignar": true}}}'::jsonb, 
                TRUE
            ),
            (
                p_tenant_id, 'INSPECTOR_CALIDAD', 'Inspector de Calidad QA/QC', 
                'Inspección visual, liberación de juntas y ensayos no destructivos',
                'supervisor', '#22c55e', 
                '{"modulos": {"calidad": {"inspeccionar": true, "liberar": true}}}'::jsonb, 
                TRUE
            ),
            (
                p_tenant_id, 'BODEGUERO_PANOLERO', 'Bodeguero / Pañolero', 
                'Recepción de insumos, despacho de herramientas y vales de combustible',
                'supervisor', '#64748b', 
                '{"modulos": {"bodega": {"despachar": true, "recepcionar": true}, "combustible": {"despachar": true}}}'::jsonb, 
                TRUE
            ),
            -- Nivel Cuadrilla & Operarios
            (
                p_tenant_id, 'CAPATAZ', 'Capataz de Cuadrilla', 
                'Dirección de trabajadores en frente y reporte simple de jornada',
                'worker', '#d97706', 
                '{"modulos": {"whatsapp_bot": {"reporte_rapido": true}, "asistencia": {"marcar": true}}}'::jsonb, 
                TRUE
            ),
            (
                p_tenant_id, 'SOLDADOR', 'Soldador Calificado 6G', 
                'Ejecución de uniones soldadas y trazabilidad por QR',
                'worker', '#94a3b8', 
                '{"modulos": {"whatsapp_bot": {"consulta_planos": true}}}'::jsonb, 
                TRUE
            ),
            (
                p_tenant_id, 'OPERADOR_MAQUINARIA', 'Operador de Maquinaria Pesada', 
                'Operación de activos y reporte de horómetros diarios',
                'worker', '#6b7280', 
                '{"modulos": {"whatsapp_bot": {"reporte_horometro": true, "solicitar_combustible": true}}}'::jsonb, 
                TRUE
            )
        ON CONFLICT (tenant_id, codigo) DO NOTHING;

    -- Roles Estándar para Transporte y Logística (TNS)
    ELSIF p_tipo_industria = 'transporte' OR p_tipo_industria = 'logistica' THEN
        INSERT INTO core.roles_empresa (tenant_id, codigo, nombre, descripcion, rol_seguridad_base, color, permisos, is_template)
        VALUES
            (p_tenant_id, 'ADMIN_GENERAL', 'Administrador General Flota', 'Control total de la flota y contratos', 'admin', '#10b981', '{"modulos": {"all": {"acceso": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'JEFE_OPERACIONES', 'Jefe de Operaciones Flota', 'Planificación de rutas y disponibilidad', 'supervisor', '#3b82f6', '{"modulos": {"rutas": {"ver": true}, "flota": {"gestionar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'DESPACHADOR', 'Despachador / Controlador de Ruta', 'Monitoreo en ruta y asignación de viajes', 'supervisor', '#f97316', '{"modulos": {"despacho": {"crear": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'CHOFER_RAMPLA', 'Conductor de Rampla Pesada', 'Conducción y reporte de odómetro/petróleo por WhatsApp', 'worker', '#64748b', '{"modulos": {"whatsapp_bot": {"reporte_odometro": true, "carga_combustible": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'MECANICO_TALLER', 'Mecánico de Mantenimiento', 'Pautas preventivas y correctivas de camiones', 'supervisor', '#a855f7', '{"modulos": {"mantenimiento": {"ejecutar": true}}}'::jsonb, TRUE)
        ON CONFLICT (tenant_id, codigo) DO NOTHING;
    END IF;

    GET DIAGNOSTICS v_roles_creados = ROW_COUNT;
    RETURN v_roles_creados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.clonar_roles_estandar(UUID, TEXT) IS 'Clona automáticamente el catálogo de roles y permisos estándar para una nueva empresa';
