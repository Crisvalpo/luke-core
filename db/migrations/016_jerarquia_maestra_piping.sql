-- ==============================================================================
-- MIGRACIÓN 016: JERARQUÍA MAESTRA DE INGENIERÍA PIPING
-- Entrega 3 - Plan Canónico Multiproyecto LukeApp Piping
-- ==============================================================================

-- 1. P&ID (DIAGRAMAS DE TUBERÍA E INSTRUMENTACIÓN)
CREATE TABLE IF NOT EXISTS piping.pid (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  codigo VARCHAR(255) NOT NULL,
  titulo TEXT NULL,
  revision_vigente VARCHAR(32) NULL,
  estado_documental VARCHAR(50) NULL DEFAULT 'VIGENTE',
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  legacy_id TEXT NULL,
  source_row_key TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NULL,
  updated_by UUID NULL,
  CONSTRAINT uq_pid_proy_codigo UNIQUE (proyecto_id, codigo),
  CONSTRAINT fk_pid_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 2. LÍNEAS DE PIPING
CREATE TABLE IF NOT EXISTS piping.lineas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  codigo VARCHAR(255) NOT NULL,
  fluido_proyecto_id UUID NULL REFERENCES piping.cat_fluidos_proyecto(id) ON DELETE RESTRICT,
  clase_proyecto_id UUID NULL REFERENCES piping.cat_clases_proyecto(id) ON DELETE RESTRICT,
  nps_codigo VARCHAR(32) NULL,
  diametro_numerico NUMERIC(12,4) NULL,
  unidad_diametro VARCHAR(20) NULL DEFAULT 'PULG',
  origen TEXT NULL,
  destino TEXT NULL,
  presion_diseno NUMERIC(12,4) NULL,
  temperatura_diseno NUMERIC(12,4) NULL,
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  legacy_id TEXT NULL,
  source_row_key TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NULL,
  updated_by UUID NULL,
  CONSTRAINT uq_lineas_proy_codigo UNIQUE (proyecto_id, codigo),
  CONSTRAINT fk_lineas_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 3. RELACIÓN N:M P&ID <-> LÍNEAS
CREATE TABLE IF NOT EXISTS piping.pid_lineas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  pid_id UUID NOT NULL REFERENCES piping.pid(id) ON DELETE RESTRICT,
  linea_id UUID NOT NULL REFERENCES piping.lineas(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pid_lineas UNIQUE (proyecto_id, pid_id, linea_id),
  CONSTRAINT fk_pid_lineas_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 4. ISOMÉTRICOS
CREATE TABLE IF NOT EXISTS piping.isometricos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  linea_id UUID NOT NULL REFERENCES piping.lineas(id) ON DELETE RESTRICT,
  codigo VARCHAR(255) NOT NULL,
  hoja VARCHAR(32) NOT NULL DEFAULT '1',
  revision_vigente VARCHAR(32) NULL,
  estado_documental VARCHAR(50) NULL DEFAULT 'VIGENTE',
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  observacion TEXT NULL,
  legacy_id TEXT NULL,
  source_row_key TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NULL,
  updated_by UUID NULL,
  CONSTRAINT uq_isometricos_proy_hoja UNIQUE (proyecto_id, codigo, hoja),
  CONSTRAINT fk_isometricos_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 5. SPOOLS
CREATE TABLE IF NOT EXISTS piping.spools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  isometrico_id UUID NOT NULL REFERENCES piping.isometricos(id) ON DELETE RESTRICT,
  codigo VARCHAR(255) NOT NULL,
  tag VARCHAR(128) NULL,
  estado_actual VARCHAR(50) NULL DEFAULT 'EN_FABRICACION',
  ubicacion_actual VARCHAR(255) NULL,
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  legacy_id TEXT NULL,
  source_row_key TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NULL,
  updated_by UUID NULL,
  CONSTRAINT uq_spools_proy_iso_codigo UNIQUE (proyecto_id, isometrico_id, codigo),
  CONSTRAINT fk_spools_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 6. JUNTAS CANÓNICAS
CREATE TABLE IF NOT EXISTS piping.juntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  isometrico_id UUID NOT NULL REFERENCES piping.isometricos(id) ON DELETE RESTRICT,
  spool_id UUID NULL REFERENCES piping.spools(id) ON DELETE RESTRICT,
  codigo VARCHAR(255) NOT NULL,
  numero_junta VARCHAR(64) NULL,
  tipo_union_id UUID NULL REFERENCES piping.cat_tipos_union(id) ON DELETE RESTRICT,
  nps_codigo VARCHAR(32) NULL,
  diametro_wdi NUMERIC(12,4) NULL,
  revision_origen VARCHAR(32) NULL,
  estado_actual VARCHAR(50) NULL DEFAULT 'ACTIVO',
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  inactivado_at TIMESTAMPTZ NULL,
  inactivado_por UUID NULL,
  motivo_inactivacion TEXT NULL,
  legacy_id TEXT NULL,
  source_row_key TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NULL,
  updated_by UUID NULL,
  CONSTRAINT uq_juntas_proy_codigo UNIQUE (proyecto_id, codigo),
  CONSTRAINT fk_juntas_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 7. LISTAS COMPLEMENTARIAS DE INGENIERÍA

-- 7.1 Válvulas
CREATE TABLE IF NOT EXISTS piping.valvulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  linea_id UUID NOT NULL REFERENCES piping.lineas(id) ON DELETE RESTRICT,
  codigo VARCHAR(255) NOT NULL,
  tag VARCHAR(128) NULL,
  tipo VARCHAR(64) NULL,
  rating VARCHAR(64) NULL,
  diametro VARCHAR(32) NULL,
  estado_actual VARCHAR(50) NULL DEFAULT 'POR_MONTAR',
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  legacy_id TEXT NULL,
  source_row_key TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_valvulas_proy_codigo UNIQUE (proyecto_id, codigo),
  CONSTRAINT fk_valvulas_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 7.2 Soportes de Piping
CREATE TABLE IF NOT EXISTS piping.soportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  linea_id UUID NOT NULL REFERENCES piping.lineas(id) ON DELETE RESTRICT,
  codigo VARCHAR(255) NOT NULL,
  tag VARCHAR(128) NULL,
  tipo_soporte_id UUID NULL REFERENCES piping.cat_tipos_soporte(id) ON DELETE RESTRICT,
  estado_actual VARCHAR(50) NULL DEFAULT 'POR_FABRICAR',
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  legacy_id TEXT NULL,
  source_row_key TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_soportes_proy_codigo UNIQUE (proyecto_id, codigo),
  CONSTRAINT fk_soportes_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 7.3 Tie-Ins
CREATE TABLE IF NOT EXISTS piping.tie_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  linea_id UUID NOT NULL REFERENCES piping.lineas(id) ON DELETE RESTRICT,
  codigo VARCHAR(255) NOT NULL,
  tag VARCHAR(128) NULL,
  tipo_union_id UUID NULL REFERENCES piping.cat_tipos_union(id) ON DELETE RESTRICT,
  estado_actual VARCHAR(50) NULL DEFAULT 'PENDIENTE',
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  legacy_id TEXT NULL,
  source_row_key TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tie_ins_proy_codigo UNIQUE (proyecto_id, codigo),
  CONSTRAINT fk_tie_ins_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 7.4 MTO (Material Take-Off)
CREATE TABLE IF NOT EXISTS piping.mto_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  isometrico_id UUID NOT NULL REFERENCES piping.isometricos(id) ON DELETE RESTRICT,
  codigo_item VARCHAR(255) NOT NULL,
  descripcion TEXT NOT NULL,
  cantidad_diseno NUMERIC(14,4) NOT NULL DEFAULT 1,
  unidad VARCHAR(32) NOT NULL DEFAULT 'C/U',
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  legacy_id TEXT NULL,
  source_row_key TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_mto_items_proy_iso UNIQUE (proyecto_id, isometrico_id, codigo_item),
  CONSTRAINT fk_mto_items_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 7.5 Elementos BIM (Inventario 3D / CWP)
CREATE TABLE IF NOT EXISTS piping.elementos_bim (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  bim_guid VARCHAR(128) NOT NULL,
  tag VARCHAR(128) NULL,
  categoria VARCHAR(64) NULL,
  descripcion TEXT NULL,
  modelo_origen VARCHAR(255) NULL,
  cwp VARCHAR(64) NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_elementos_bim_guid UNIQUE (proyecto_id, bim_guid),
  CONSTRAINT fk_elementos_bim_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- TRIGGERS DE UPDATED_AT
DROP TRIGGER IF EXISTS trg_pid_updated_at ON piping.pid;
CREATE TRIGGER trg_pid_updated_at BEFORE UPDATE ON piping.pid FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_lineas_updated_at ON piping.lineas;
CREATE TRIGGER trg_lineas_updated_at BEFORE UPDATE ON piping.lineas FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_isometricos_updated_at ON piping.isometricos;
CREATE TRIGGER trg_isometricos_updated_at BEFORE UPDATE ON piping.isometricos FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_spools_updated_at ON piping.spools;
CREATE TRIGGER trg_spools_updated_at BEFORE UPDATE ON piping.spools FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_juntas_updated_at ON piping.juntas;
CREATE TRIGGER trg_juntas_updated_at BEFORE UPDATE ON piping.juntas FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_valvulas_updated_at ON piping.valvulas;
CREATE TRIGGER trg_valvulas_updated_at BEFORE UPDATE ON piping.valvulas FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_soportes_updated_at ON piping.soportes;
CREATE TRIGGER trg_soportes_updated_at BEFORE UPDATE ON piping.soportes FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_tie_ins_updated_at ON piping.tie_ins;
CREATE TRIGGER trg_tie_ins_updated_at BEFORE UPDATE ON piping.tie_ins FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_mto_items_updated_at ON piping.mto_items;
CREATE TRIGGER trg_mto_items_updated_at BEFORE UPDATE ON piping.mto_items FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_elementos_bim_updated_at ON piping.elementos_bim;
CREATE TRIGGER trg_elementos_bim_updated_at BEFORE UPDATE ON piping.elementos_bim FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();
