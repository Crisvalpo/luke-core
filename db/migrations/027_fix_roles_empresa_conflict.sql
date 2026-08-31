-- =============================================================================
-- MIGRACIÓN 027: Corrección de restricción única para plantillas de roles
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_rol_empresa_tenant_template_codigo 
ON core.roles_empresa (tenant_id, codigo) 
WHERE proyecto_id IS NULL;

CREATE OR REPLACE FUNCTION core.clonar_roles_estandar(p_tenant_id UUID, p_tipo_industria TEXT DEFAULT 'industrial')
RETURNS INTEGER AS $$
DECLARE
    v_roles_creados INTEGER := 0;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM core.tenants WHERE id = p_tenant_id) THEN
        RAISE EXCEPTION 'Empresa con id % no existe', p_tenant_id;
    END IF;

    IF p_tipo_industria = 'industrial' OR p_tipo_industria = 'montaje' THEN
        INSERT INTO core.roles_empresa (tenant_id, codigo, nombre, descripcion, rol_seguridad_base, color, permisos, is_template)
        VALUES
            (p_tenant_id, 'ADMIN_GENERAL', 'Administrador General', 'Control total administrativo de la empresa y proyectos', 'admin', '#10b981', '{"modulos": {"all": {"acceso": true}}, "recursos": {"all": {"crear": true, "editar": true, "eliminar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'JEFE_PROYECTO', 'Gerencia / Jefe de Proyecto', 'Visibilidad completa de avances, curvas S y reportes financieros', 'supervisor', '#8b5cf6', '{"modulos": {"dashboard": {"ver": true}, "partes_diarios": {"ver": true}, "combustible": {"ver": true}, "reportes": {"ver": true, "exportar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'CLIENTE_ITO', 'Cliente / Inspector Técnico (ITO)', 'Visibilidad y aprobación de protocolos de calidad y entregables', 'supervisor', '#f59e0b', '{"modulos": {"calidad": {"ver": true, "aprobar": true, "rechazar": true}, "reportes": {"ver": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'PLANIFICADOR', 'Planificación & Control (P&C)', 'Control de programas, líneas base, curvas de avance y HH', 'supervisor', '#3b82f6', '{"modulos": {"planificacion": {"ver": true, "editar": true}, "reportes": {"exportar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'JEFE_OFICINA_TECNICA', 'Jefe Oficina Técnica', 'Gestión de cubicaciones, ingeniería, planos e ingesta de datos', 'admin', '#059669', '{"modulos": {"ingenieria": {"ver": true, "editar": true}, "ingesta_masiva": {"ejecutar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'CONTROL_DOCUMENTAL', 'Control Documental', 'Recepción y distribución de planos, transmittals y revisiones', 'supervisor', '#06b6d4', '{"modulos": {"documentos": {"ver": true, "subir": true, "versionar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'JEFE_TERRENO', 'Jefe de Terreno', 'Coordinación general de frentes de faena, maquinaria y cuadrillas', 'supervisor', '#f97316', '{"modulos": {"partes_diarios": {"aprobar": true}, "combustible": {"aprobar_vales": true}, "cuadrillas": {"gestionar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'SUPERVISOR_TERRENO', 'Supervisor de Terreno', 'Liderazgo de cuadrillas operativas y reporte diario de avance', 'supervisor', '#ea580c', '{"modulos": {"partes_diarios": {"crear": true}, "combustible": {"solicitar": true}, "cuadrillas": {"asignar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'INSPECTOR_CALIDAD', 'Inspector de Calidad QA/QC', 'Inspección visual, liberación de juntas y ensayos no destructivos', 'supervisor', '#22c55e', '{"modulos": {"calidad": {"inspeccionar": true, "liberar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'PREVENCIONISTA', 'Asesor en Prevención (HSE)', 'Control de incidentes, inducciones, pases de faena y EPP', 'supervisor', '#eab308', '{"modulos": {"seguridad": {"ver": true, "auditar": true}, "personal": {"ver_documentos": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'CAPATAZ', 'Capataz de Cuadrilla', 'Mando directo en terreno y asignación de tareas operativas', 'supervisor', '#64748b', '{"modulos": {"partes_diarios": {"crear": true}, "asistencia": {"marcar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'OPERADOR_MAQUINARIA', 'Operador de Maquinaria / Conductor', 'Operación de equipos, checklist diario y reporte por WhatsApp', 'worker', '#475569', '{"modulos": {"whatsapp_bot": {"check_diario": true, "carga_combustible": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'MAESTRO_MAYOR', 'Maestro Mayor / Especialista Piping', 'Ejecución especializada en terreno (trazado, corte, biselado)', 'worker', '#94a3b8', '{"modulos": {"mis_protocolos": {"ver": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'SOLDADOR_CALIFICADO', 'Soldador Calificado (6G / TIG)', 'Ejecución de soldadura con registro de cuño para trazabilidad', 'worker', '#cbd5e1', '{"modulos": {"mis_juntas": {"ver": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'BODEGUERO', 'Encargado de Bodega & Pañol', 'Control de stock, recepción de materiales y despacho de insumos', 'supervisor', '#14b8a6', '{"modulos": {"bodega": {"ver": true, "movimientos": true}, "combustible": {"despachar": true}}}'::jsonb, TRUE)
        ON CONFLICT (tenant_id, codigo) WHERE proyecto_id IS NULL DO NOTHING;
    ELSIF p_tipo_industria = 'transporte' OR p_tipo_industria = 'logistica' THEN
        INSERT INTO core.roles_empresa (tenant_id, codigo, nombre, descripcion, rol_seguridad_base, color, permisos, is_template)
        VALUES
            (p_tenant_id, 'ADMIN_GENERAL', 'Administrador General Flota', 'Control total de la flota y contratos', 'admin', '#10b981', '{"modulos": {"all": {"acceso": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'JEFE_OPERACIONES', 'Jefe de Operaciones Flota', 'Planificación de rutas y disponibilidad', 'supervisor', '#3b82f6', '{"modulos": {"rutas": {"ver": true}, "flota": {"gestionar": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'DESPACHADOR', 'Despachador / Controlador de Ruta', 'Monitoreo en ruta y asignación de viajes', 'supervisor', '#f97316', '{"modulos": {"despacho": {"crear": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'CHOFER_RAMPLA', 'Conductor de Rampla Pesada', 'Conducción y reporte de odómetro/petróleo por WhatsApp', 'worker', '#64748b', '{"modulos": {"whatsapp_bot": {"reporte_odometro": true, "carga_combustible": true}}}'::jsonb, TRUE),
            (p_tenant_id, 'MECANICO_TALLER', 'Mecánico de Mantenimiento', 'Pautas preventivas y correctivas de camiones', 'supervisor', '#a855f7', '{"modulos": {"mantenimiento": {"ejecutar": true}}}'::jsonb, TRUE)
        ON CONFLICT (tenant_id, codigo) WHERE proyecto_id IS NULL DO NOTHING;
    END IF;

    GET DIAGNOSTICS v_roles_creados = ROW_COUNT;
    RETURN v_roles_creados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
