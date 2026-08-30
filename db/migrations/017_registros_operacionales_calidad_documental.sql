-- ==============================================================================
-- MIGRACIÓN 017: REGISTROS OPERACIONALES, CALIDAD Y GESTIÓN DOCUMENTAL
-- Entregas 5 y 6 - Plan Canónico Multiproyecto LukeApp Piping
-- ==============================================================================

-- 1. REGISTROS OPERACIONALES DE PIPING

-- 1.1 Ejecuciones de Juntas (Armado, Soldadura, etc.)
CREATE TABLE IF NOT EXISTS piping.ejecuciones_junta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  junta_id UUID NOT NULL REFERENCES piping.juntas(id) ON DELETE RESTRICT,
  revision_ejecucion VARCHAR(32) NULL,
  proceso VARCHAR(64) NULL,
  ejecutor_personal_id UUID NULL REFERENCES core.personal(id) ON DELETE RESTRICT,
  estampa_snapshot VARCHAR(64) NULL,
  rol_ejecutor_snapshot VARCHAR(64) NULL,
  fecha_ejecucion TIMESTAMPTZ NOT NULL,
  estado VARCHAR(50) NOT NULL,
  observacion TEXT NULL,
  evidencia_url TEXT NULL,
  registrado_por UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_ejecuciones_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 1.2 Eventos Históricos de Spool (Trazabilidad de Fabricación y Montaje)
CREATE TABLE IF NOT EXISTS piping.eventos_spool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  spool_id UUID NOT NULL REFERENCES piping.spools(id) ON DELETE RESTRICT,
  tipo_evento VARCHAR(50) NOT NULL,
  estado_anterior VARCHAR(50) NULL,
  estado_nuevo VARCHAR(50) NOT NULL,
  ubicacion VARCHAR(255) NULL,
  sector VARCHAR(255) NULL,
  metros_montados NUMERIC(14,4) NULL,
  observacion TEXT NULL,
  evidencia_url TEXT NULL,
  registrado_por UUID NOT NULL,
  fecha_evento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_eventos_spool_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 2. REGISTROS DE CALIDAD Y CONTROL DE ENSAYOS

-- 2.1 Inspecciones Visuales de Soldadura / Juntas
CREATE TABLE IF NOT EXISTS calidad.inspecciones_visuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  junta_id UUID NOT NULL REFERENCES piping.juntas(id) ON DELETE RESTRICT,
  ejecucion_junta_id UUID NULL REFERENCES piping.ejecuciones_junta(id) ON DELETE RESTRICT,
  inspector_personal_id UUID NOT NULL REFERENCES core.personal(id) ON DELETE RESTRICT,
  fecha_inspeccion TIMESTAMPTZ NOT NULL,
  resultado VARCHAR(30) NOT NULL,
  defecto_detectado TEXT NULL,
  observacion TEXT NULL,
  evidencia_url TEXT NULL,
  proxima_etapa VARCHAR(50) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_inspecciones_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 2.2 Ensayos No Destructivos (NDE: RT, UT, PT, MT, etc.)
CREATE TABLE IF NOT EXISTS calidad.ensayos_nde (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  junta_id UUID NOT NULL REFERENCES piping.juntas(id) ON DELETE RESTRICT,
  metodo_nde_id UUID NOT NULL REFERENCES calidad.cat_metodos_nde(id) ON DELETE RESTRICT,
  numero_informe VARCHAR(128) NOT NULL,
  fecha_ensayo TIMESTAMPTZ NOT NULL,
  resultado VARCHAR(30) NOT NULL,
  porcentaje_inspeccionado NUMERIC(5,2) NULL,
  inspector_nombre VARCHAR(255) NULL,
  evidencia_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_ensayos_nde_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 2.3 Reparaciones de Juntas
CREATE TABLE IF NOT EXISTS calidad.reparaciones_junta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  junta_id UUID NOT NULL REFERENCES piping.juntas(id) ON DELETE RESTRICT,
  ensayo_nde_origen_id UUID NULL REFERENCES calidad.ensayos_nde(id) ON DELETE RESTRICT,
  numero_reparacion INTEGER NOT NULL DEFAULT 1,
  tipo_defecto VARCHAR(128) NOT NULL,
  longitud_reparada_mm NUMERIC(10,2) NULL,
  soldador_personal_id UUID NULL REFERENCES core.personal(id) ON DELETE RESTRICT,
  fecha_reparacion TIMESTAMPTZ NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'REPARADA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_reparaciones_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 3. GESTIÓN DOCUMENTAL Y REVISIONES DE INGENIERÍA

-- 3.1 Documentos de Ingeniería
CREATE TABLE IF NOT EXISTS documental.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  tipo_documento VARCHAR(50) NOT NULL,
  codigo VARCHAR(255) NOT NULL,
  titulo TEXT NULL,
  entidad_tipo VARCHAR(50) NULL,
  entidad_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_documentos_proy UNIQUE (proyecto_id, tipo_documento, codigo),
  CONSTRAINT fk_documentos_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 3.2 Revisiones Documentales (Inmutables)
CREATE TABLE IF NOT EXISTS documental.revisiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  documento_id UUID NOT NULL REFERENCES documental.documentos(id) ON DELETE RESTRICT,
  revision VARCHAR(32) NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'VIGENTE',
  origen_documento VARCHAR(50) NULL,
  id_externo TEXT NULL,
  url_externa TEXT NULL,
  archivo_nombre TEXT NULL,
  fecha_evento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subido_por UUID NULL,
  CONSTRAINT uq_revisiones_doc UNIQUE (documento_id, revision),
  CONSTRAINT fk_revisiones_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 3.3 Cerrojo de Impactos por Nueva Revisión
CREATE TABLE IF NOT EXISTS documental.impactos_revision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  revision_id UUID NOT NULL REFERENCES documental.revisiones(id) ON DELETE RESTRICT,
  entidad_tipo VARCHAR(50) NOT NULL,
  entidad_id UUID NOT NULL,
  tipo_impacto VARCHAR(50) NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE_REVISION',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_impactos_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);
