-- =============================================================================
-- MIGRATION 037: BUK MIRROR SERVICE TABLES (READ-ONLY HR MIRROR)
-- Standardized in English as required by buk-mirror-service specification.
-- =============================================================================

-- 1. Table: mirror_project_mappings (Buk Cost Center/Area -> Dynamics Project ID)
CREATE TABLE IF NOT EXISTS core.mirror_project_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'default',
    cost_center VARCHAR(64) NOT NULL,
    area VARCHAR(128),
    project_id VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mirror_mappings_lookup 
ON core.mirror_project_mappings (tenant_id, cost_center, (COALESCE(area, '__ANY__')));

CREATE INDEX IF NOT EXISTS idx_mirror_mappings_project_id 
ON core.mirror_project_mappings (project_id);

-- 2. Table: mirror_workers (Read-only operational identity cache)
CREATE TABLE IF NOT EXISTS core.mirror_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'default',
    rut VARCHAR(20) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    job_title VARCHAR(128),
    area VARCHAR(128),
    cost_center VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    project_id VARCHAR(64) NOT NULL DEFAULT 'UNASSIGNED',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_mirror_workers_tenant_rut UNIQUE (tenant_id, rut)
);

CREATE INDEX IF NOT EXISTS idx_mirror_workers_project_id 
ON core.mirror_workers (tenant_id, project_id);

CREATE INDEX IF NOT EXISTS idx_mirror_workers_status 
ON core.mirror_workers (status);

CREATE INDEX IF NOT EXISTS idx_mirror_workers_rut 
ON core.mirror_workers (rut);

-- 3. Table: mirror_attendance (Daily check-ins / marks)
CREATE TABLE IF NOT EXISTS core.mirror_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'default',
    rut VARCHAR(20) NOT NULL,
    buk_attendance_id VARCHAR(128) UNIQUE NOT NULL,
    check_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status VARCHAR(32) DEFAULT 'PRESENT',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mirror_attendance_date_rut 
ON core.mirror_attendance (check_date, rut);

CREATE INDEX IF NOT EXISTS idx_mirror_attendance_rut 
ON core.mirror_attendance (rut);
