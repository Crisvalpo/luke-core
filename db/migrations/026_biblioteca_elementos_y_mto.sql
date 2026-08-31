-- ==============================================================================
-- MIGRACIÓN 026: BIBLIOTECA MAESTRA DE ELEMENTOS NORMALIZADOS Y MTO POR SPOOL
-- Soporte para MTO (Material Take-Off), trazabilidad de compras y catálogo estándar
-- ==============================================================================

-- 1. Biblioteca Maestra de Elementos Normalizados de Piping
CREATE TABLE IF NOT EXISTS piping.cat_elementos_normalizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(64) UNIQUE NOT NULL,            -- ej: 'ELB-90-LR-001', '52166'
  familia VARCHAR(64) NOT NULL,                  -- 'CODO', 'TEE', 'CAÑERIA', 'FLANGE', 'VALVULA', 'ACOPLE', etc.
  descripcion_canonica TEXT NOT NULL,
  sinonimos JSONB NOT NULL DEFAULT '[]'::jsonb,  -- '["codo", "elbow", "codo 90", "codo rl"]'
  norma_dimension VARCHAR(64) NULL,              -- 'ASME B16.9', 'ASME B16.5', 'ASME B36.10'
  material_base VARCHAR(128) NULL,               -- 'ASTM A234 WPB', 'ASTM A106 Gr.B', 'ASTM A536'
  rating_clase VARCHAR(32) NULL,                 -- '150#', '300#', 'SCH 40', 'SCH 80'
  unidad_medida VARCHAR(16) NOT NULL DEFAULT 'un',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cat_elementos_familia ON piping.cat_elementos_normalizados(familia);
CREATE INDEX IF NOT EXISTS idx_cat_elementos_sinonimos ON piping.cat_elementos_normalizados USING GIN (sinonimos);

-- 2. Tabla MTO (Material Take-Off) con Trazabilidad AWP, Línea, Isométrico y Spool
CREATE TABLE IF NOT EXISTS piping.mto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id),
  proyecto_id UUID NOT NULL REFERENCES core.proyectos(id),
  linea_id UUID NULL REFERENCES piping.lineas(id),
  isometrico_id UUID NULL REFERENCES piping.isometricos(id),
  spool_id UUID NULL REFERENCES piping.spools(id),
  elemento_id UUID NULL REFERENCES piping.cat_elementos_normalizados(id),
  
  codigo VARCHAR(64) NOT NULL,                   -- ID_MTO ej: '1.1'
  item_numero VARCHAR(32) NULL,
  
  -- Empaquetamiento AWP
  cwa VARCHAR(64) NULL,
  cwp VARCHAR(64) NULL,
  ewp VARCHAR(64) NULL,
  pwp VARCHAR(64) NULL,
  iwp VARCHAR(64) NULL,
  
  -- Referencias de ingeniería
  codigo_linea VARCHAR(255) NULL,
  codigo_iso VARCHAR(255) NULL,
  codigo_spool VARCHAR(255) NULL,
  clase VARCHAR(32) NULL,
  grupo_material VARCHAR(64) NULL,               -- 'ABRAZADERA', 'ACOPLE FLEXIBLE', 'CAÑERIA', etc.
  descripcion TEXT NOT NULL,
  diametro_nps VARCHAR(32) NULL,
  cantidad NUMERIC(12, 4) NOT NULL DEFAULT 1,
  unidad VARCHAR(16) NOT NULL DEFAULT 'un',
  peso_kg NUMERIC(12, 4) NULL,
  suministro VARCHAR(64) NULL,                   -- 'Contratista', 'Cliente'
  
  -- Control de Abastecimiento, Compras y Bodega
  proveedor VARCHAR(128) NULL,
  orden_compra VARCHAR(64) NULL,
  eta_obra DATE NULL,
  recepcionado BOOLEAN NOT NULL DEFAULT FALSE,
  solicitado NUMERIC(12, 4) NULL,
  despachado NUMERIC(12, 4) NULL,
  cantidad_real NUMERIC(12, 4) NULL,
  ubicacion_actual VARCHAR(128) NULL,            -- Bodega Principal, Patio Borde Río, Taller
  estado_material VARCHAR(64) NOT NULL DEFAULT 'SIN REVISAR', -- 'DISPONIBLE', 'SIN REVISAR', 'FALTANTE'
  prioridad_fab VARCHAR(32) NULL,
  observaciones TEXT NULL,
  
  -- Auditoría y Borrado Lógico
  estado_actual VARCHAR(64) NOT NULL DEFAULT 'EMITIDO',
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NULL REFERENCES core.personal(id),
  updated_by UUID NULL REFERENCES core.personal(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_mto_proy_codigo UNIQUE (proyecto_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_mto_proyecto ON piping.mto(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_mto_linea ON piping.mto(linea_id);
CREATE INDEX IF NOT EXISTS idx_mto_iso ON piping.mto(isometrico_id);
CREATE INDEX IF NOT EXISTS idx_mto_spool ON piping.mto(spool_id);
CREATE INDEX IF NOT EXISTS idx_mto_estado_mat ON piping.mto(estado_material);
