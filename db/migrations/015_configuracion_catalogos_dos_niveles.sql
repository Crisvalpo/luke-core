-- ==============================================================================
-- MIGRACIÓN 015: CONFIGURACIÓN POR PROYECTO Y CATÁLOGOS EN DOS NIVELES
-- Entrega 2 - Plan Canónico Multiproyecto LukeApp Piping
-- ==============================================================================

-- 1. CONFIGURACIÓN ESPECÍFICA DE PIPING POR PROYECTO
CREATE TABLE IF NOT EXISTS piping.proyecto_configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  
  usa_pwht BOOLEAN NOT NULL DEFAULT FALSE,
  usa_sublineas BOOLEAN NOT NULL DEFAULT FALSE,
  controla_revisiones BOOLEAN NOT NULL DEFAULT TRUE,
  bloquea_documento_obsoleto BOOLEAN NOT NULL DEFAULT TRUE,
  requiere_foto_ejecucion BOOLEAN NOT NULL DEFAULT FALSE,
  requiere_foto_inspeccion BOOLEAN NOT NULL DEFAULT FALSE,
  permite_carga_masiva BOOLEAN NOT NULL DEFAULT TRUE,
  
  configuracion JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_piping_proy_cfg UNIQUE (proyecto_id),
  CONSTRAINT fk_piping_proy_cfg_proyectos FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

DROP TRIGGER IF EXISTS trg_piping_proy_cfg_updated_at ON piping.proyecto_configuracion;
CREATE TRIGGER trg_piping_proy_cfg_updated_at
  BEFORE UPDATE ON piping.proyecto_configuracion
  FOR EACH ROW EXECUTE FUNCTION core.trigger_set_updated_at();

-- 2. CATÁLOGOS CORPORATIVOS (NIVEL 1 - DEFINICIÓN TÉCNICA ESTÁNDAR)

-- 2.1 Tipos de Unión
CREATE TABLE IF NOT EXISTS piping.cat_tipos_union (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE RESTRICT,
  codigo VARCHAR(64) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cat_tipos_union UNIQUE (tenant_id, codigo)
);

-- 2.2 Diámetros Nominales (NPS / WDI)
CREATE TABLE IF NOT EXISTS piping.cat_diametros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE RESTRICT,
  nps_codigo VARCHAR(32) NOT NULL,
  diametro_pulgadas NUMERIC(12,4) NOT NULL,
  diametro_mm NUMERIC(12,4) NOT NULL,
  diametro_wdi NUMERIC(12,4) NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cat_diametros UNIQUE (tenant_id, nps_codigo)
);

-- 2.3 Tipos de Soporte
CREATE TABLE IF NOT EXISTS piping.cat_tipos_soporte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE RESTRICT,
  codigo VARCHAR(64) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cat_tipos_soporte UNIQUE (tenant_id, codigo)
);

-- 2.4 Tipos de Prueba (Hidrostática, Neumática, etc.)
CREATE TABLE IF NOT EXISTS piping.cat_tipos_prueba (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE RESTRICT,
  codigo VARCHAR(64) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cat_tipos_prueba UNIQUE (tenant_id, codigo)
);

-- 2.5 Métodos NDE (Calidad)
CREATE TABLE IF NOT EXISTS calidad.cat_metodos_nde (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE RESTRICT,
  codigo VARCHAR(64) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cat_metodos_nde UNIQUE (tenant_id, codigo)
);

-- 3. PUENTES DE APLICABILIDAD POR PROYECTO (NIVEL 2)

-- 3.1 Aplicabilidad de Tipos de Unión por Proyecto
CREATE TABLE IF NOT EXISTS piping.proyecto_tipos_union (
  proyecto_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  tipo_union_id UUID NOT NULL REFERENCES piping.cat_tipos_union(id) ON DELETE RESTRICT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  requiere_nde BOOLEAN NOT NULL DEFAULT FALSE,
  porcentaje_nde_defecto NUMERIC(5,2) NULL,
  configuracion JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (proyecto_id, tipo_union_id),
  CONSTRAINT fk_proy_tipos_union_proy FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 3.2 Aplicabilidad de Diámetros por Proyecto
CREATE TABLE IF NOT EXISTS piping.proyecto_diametros (
  proyecto_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  diametro_id UUID NOT NULL REFERENCES piping.cat_diametros(id) ON DELETE RESTRICT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  configuracion JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (proyecto_id, diametro_id),
  CONSTRAINT fk_proy_diametros_proy FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 3.3 Aplicabilidad de Métodos NDE por Proyecto
CREATE TABLE IF NOT EXISTS calidad.proyecto_metodos_nde (
  proyecto_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  metodo_nde_id UUID NOT NULL REFERENCES calidad.cat_metodos_nde(id) ON DELETE RESTRICT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  configuracion JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (proyecto_id, metodo_nde_id),
  CONSTRAINT fk_proy_metodos_nde_proy FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 4. CATÁLOGOS ESPECÍFICOS POR PROYECTO

-- 4.1 Fluidos por Proyecto
CREATE TABLE IF NOT EXISTS piping.cat_fluidos_proyecto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  codigo VARCHAR(64) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  servicio VARCHAR(255) NULL,
  descripcion TEXT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cat_fluidos_proy UNIQUE (proyecto_id, codigo),
  CONSTRAINT fk_cat_fluidos_proy FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 4.2 Clases de Cañería por Proyecto (Piping Classes)
CREATE TABLE IF NOT EXISTS piping.cat_clases_proyecto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  codigo VARCHAR(64) NOT NULL,
  rating VARCHAR(64) NULL,
  material_base VARCHAR(255) NULL,
  espesor_std VARCHAR(64) NULL,
  schedule VARCHAR(64) NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cat_clases_proy UNIQUE (proyecto_id, codigo),
  CONSTRAINT fk_cat_clases_proy FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);

-- 4.3 Esquemas de Pintura / Revestimiento por Proyecto
CREATE TABLE IF NOT EXISTS piping.cat_esquemas_pintura_proyecto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  codigo VARCHAR(64) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  sistema VARCHAR(255) NULL,
  colores VARCHAR(255) NULL,
  espesor_seco_mils NUMERIC(10,2) NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cat_pintura_proy UNIQUE (proyecto_id, codigo),
  CONSTRAINT fk_cat_pintura_proy FOREIGN KEY (proyecto_id, tenant_id)
    REFERENCES core.proyectos (id, tenant_id) ON DELETE RESTRICT
);
