-- ==============================================================================
-- MIGRACIÓN 010: RELACIÓN USUARIOS EXCEL Y PROYECTOS AUTORIZADOS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS core.usuarios_excel_proyectos (
    usuario_id UUID NOT NULL REFERENCES core.usuarios_excel(id) ON DELETE CASCADE,
    proyecto_id TEXT NOT NULL,
    puede_publicar BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (usuario_id, proyecto_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_excel_proyectos_lookup 
ON core.usuarios_excel_proyectos (usuario_id, proyecto_id);
