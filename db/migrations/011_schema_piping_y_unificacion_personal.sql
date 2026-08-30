-- ==============================================================================
-- MIGRACIÓN 011: ESQUEMA PIPING Y UNIFICACIÓN DE CUBICADORES EN CORE.PERSONAL
-- ==============================================================================

-- 1. Crear el esquema dedicado para la disciplina de Piping
CREATE SCHEMA IF NOT EXISTS piping;

-- 2. Crear tabla piping.lista_juntas
CREATE TABLE IF NOT EXISTS piping.lista_juntas (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_proyecto TEXT NOT NULL,
    id_junta TEXT NOT NULL,
    tag TEXT,
    estado TEXT DEFAULT 'ACTIVO',
    vigente BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    fecha_sync TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_piping_juntas_proyecto_junta UNIQUE (id_proyecto, id_junta)
);

CREATE INDEX IF NOT EXISTS idx_piping_juntas_proyecto ON piping.lista_juntas (id_proyecto);
CREATE INDEX IF NOT EXISTS idx_piping_juntas_tag ON piping.lista_juntas (tag);
CREATE INDEX IF NOT EXISTS idx_piping_juntas_estado ON piping.lista_juntas (estado);

-- 3. Migrar registros existentes si la tabla core.lista_juntas existía
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'core' AND table_name = 'lista_juntas'
    ) THEN
        INSERT INTO piping.lista_juntas (uuid, id_proyecto, id_junta, tag, estado, vigente, fecha_sync, created_at, updated_at)
        SELECT uuid, id_proyecto, id_junta, tag, estado, vigente, fecha_sync, created_at, updated_at
        FROM core.lista_juntas
        ON CONFLICT (id_proyecto, id_junta) DO UPDATE SET
            tag = EXCLUDED.tag,
            estado = EXCLUDED.estado,
            vigente = EXCLUDED.vigente,
            fecha_sync = EXCLUDED.fecha_sync,
            updated_at = EXCLUDED.updated_at;
    END IF;
END $$;

-- 4. Extender core.personal para soportar usuarios de Windows / Cubicadores Excel
ALTER TABLE core.personal ADD COLUMN IF NOT EXISTS usuario_windows VARCHAR(128);
ALTER TABLE core.personal ADD COLUMN IF NOT EXISTS puede_sincronizar_excel BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_personal_usuario_windows ON core.personal (usuario_windows);

-- 5. Crear tabla relacional core.personal_proyectos (Asignación Multi-Proyecto)
CREATE TABLE IF NOT EXISTS core.personal_proyectos (
    personal_id UUID NOT NULL REFERENCES core.personal(id) ON DELETE CASCADE,
    proyecto_id UUID NOT NULL REFERENCES core.proyectos(id) ON DELETE CASCADE,
    puede_sincronizar BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (personal_id, proyecto_id)
);

CREATE INDEX IF NOT EXISTS idx_personal_proyectos_lookup ON core.personal_proyectos (personal_id, proyecto_id);

-- 6. Otorgar permisos en PostgreSQL al esquema piping
GRANT USAGE ON SCHEMA piping TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA piping TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA piping TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA piping TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA piping GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA piping GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA piping GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;
