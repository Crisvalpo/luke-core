-- ==============================================================================
-- MIGRACIÓN 014: FUNDAMENTOS, ESQUEMAS OBJETIVO E INTEGRIDAD TENANT-PROYECTO
-- Entrega 1 - Plan Canónico Multiproyecto LukeApp Piping
-- ==============================================================================

-- 1. CREACIÓN DE ESQUEMAS DEDICADOS
CREATE SCHEMA IF NOT EXISTS piping;
CREATE SCHEMA IF NOT EXISTS calidad;
CREATE SCHEMA IF NOT EXISTS documental;
CREATE SCHEMA IF NOT EXISTS logistica;
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS staging;

-- 2. FUNCIÓN TRIGGER UNIVERSAL PARA updated_at
CREATE OR REPLACE FUNCTION core.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. INTEGRIDAD TENANT-PROYECTO COMPUESTA EN core.proyectos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_proyectos_id_tenant' 
      AND conrelid = 'core.proyectos'::regclass
  ) THEN
    ALTER TABLE core.proyectos
      ADD CONSTRAINT uq_proyectos_id_tenant UNIQUE (id, tenant_id);
  END IF;
END $$;

-- 4. REFORZAR TABLA core.personal
ALTER TABLE core.personal
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_personal_tenant_usuario' 
      AND conrelid = 'core.personal'::regclass
  ) THEN
    ALTER TABLE core.personal
      ADD CONSTRAINT uq_personal_tenant_usuario UNIQUE (tenant_id, usuario_windows);
  END IF;
END $$;

-- 5. REFORZAR TABLA core.personal_proyectos
ALTER TABLE core.personal_proyectos
  ADD COLUMN IF NOT EXISTS rol_proyecto VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Trigger updated_at para core.personal y core.personal_proyectos
DROP TRIGGER IF EXISTS trg_personal_updated_at ON core.personal;
CREATE TRIGGER trg_personal_updated_at
  BEFORE UPDATE ON core.personal
  FOR EACH ROW
  EXECUTE FUNCTION core.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_personal_proyectos_updated_at ON core.personal_proyectos;
CREATE TRIGGER trg_personal_proyectos_updated_at
  BEFORE UPDATE ON core.personal_proyectos
  FOR EACH ROW
  EXECUTE FUNCTION core.trigger_set_updated_at();

-- 6. SEGURIDAD Y PRIVILEGIOS
-- Revocar privilegios directos de anon y authenticated sobre esquemas operacionales
REVOKE ALL ON SCHEMA piping FROM anon, authenticated;
REVOKE ALL ON SCHEMA calidad FROM anon, authenticated;
REVOKE ALL ON SCHEMA documental FROM anon, authenticated;
REVOKE ALL ON SCHEMA logistica FROM anon, authenticated;
REVOKE ALL ON SCHEMA raw FROM anon, authenticated;
REVOKE ALL ON SCHEMA staging FROM anon, authenticated;

COMMENT ON SCHEMA piping IS 'Maestros y operaciones de Piping canónico';
COMMENT ON SCHEMA calidad IS 'Inspecciones, ensayos NDE, liberaciones y calidad';
COMMENT ON SCHEMA documental IS 'Documentos, revisiones de ingeniería e impactos';
COMMENT ON SCHEMA logistica IS 'Movimientos de materiales, bultos y ubicaciones';
COMMENT ON SCHEMA raw IS 'Ingesta cruda de datos para pipelines de migración';
COMMENT ON SCHEMA staging IS 'Normalización y resolución relacional previa a carga canónica';
