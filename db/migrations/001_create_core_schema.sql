-- =============================================================================
-- MIGRACIÓN 001: Creación del Esquema 'core' y Extensiones
-- =============================================================================

-- Extensiones requeridas para UUIDs y funciones criptográficas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Creación del Esquema Maestro
CREATE SCHEMA IF NOT EXISTS core;

-- Comentario descriptivo del esquema
COMMENT ON SCHEMA core IS 'Esquema Maestro Multi-Tenant para Backbone Organizacional, Dotación, Flota y Sesiones de Canal';

-- Tabla interna de control de migraciones en caso de no usar herramientas externas
CREATE TABLE IF NOT EXISTS core._migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tipos Enumerados Compartidos
DO $$ BEGIN
    CREATE TYPE core.tipo_medicion_equipo AS ENUM ('horometro', 'kilometraje', 'mixto', 'ninguno');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE core.canal_comunicacion AS ENUM ('whatsapp', 'telegram', 'web', 'api', 'sistema');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE core.estado_proyecto AS ENUM ('estudio', 'adjudicado', 'en_ejecucion', 'paralizado', 'cierre', 'completado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
