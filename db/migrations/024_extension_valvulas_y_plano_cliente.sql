-- ==============================================================================
-- MIGRACIÓN 024: EXTENSIÓN DE VÁLVULAS Y ESTANDARIZACIÓN A PLANO_CLIENTE
-- Soporte para itemizado MTO, tags piping/instrumentación y neutralidad de cliente
-- ==============================================================================

-- 1. Estandarizar columnas de planos de cliente en lineas e isometricos
ALTER TABLE piping.lineas
  ADD COLUMN IF NOT EXISTS plano_cliente VARCHAR(255) NULL;

UPDATE piping.lineas SET plano_cliente = plano_codelco WHERE plano_cliente IS NULL AND plano_codelco IS NOT NULL;

ALTER TABLE piping.isometricos
  ADD COLUMN IF NOT EXISTS plano_cliente VARCHAR(255) NULL;

UPDATE piping.isometricos SET plano_cliente = plano_codelco WHERE plano_cliente IS NULL AND plano_codelco IS NOT NULL;

-- 2. Extensión de atributos operacionales en piping.valvulas
ALTER TABLE piping.valvulas
  ADD COLUMN IF NOT EXISTS id_mto VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS codigo_linea VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS clase VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS descripcion TEXT NULL,
  ADD COLUMN IF NOT EXISTS tag_piping VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS correlativo_maqueta VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS numero_aconex VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS diagrama VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS tag_instrumentacion VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS diametro_nps VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS cantidad NUMERIC(10, 2) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_by UUID NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID NULL;

-- Constraint de unicidad para sincronización atómica
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_valvulas_proy_codigo'
    ) THEN
        ALTER TABLE piping.valvulas ADD CONSTRAINT uq_valvulas_proy_codigo UNIQUE (proyecto_id, codigo);
    END IF;
END $$;
