-- Migration: 038_create_crews_and_dictionaries.sql
-- Description: Tablas para Diccionarios de Especialidades y Roles Operativos por Empresa,
-- Cuadrillas, Integrantes y Asignación Granular a Tareas para cálculo de HH.

-- 1. Diccionario de Especialidades por Empresa (Tenant)
CREATE TABLE IF NOT EXISTS core.company_specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_company_specialty UNIQUE(tenant_id, code)
);

-- 2. Diccionario de Roles / Cargos Operativos por Empresa (Tenant)
CREATE TABLE IF NOT EXISTS core.company_operational_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    can_lead_crew BOOLEAN NOT NULL DEFAULT false, -- Capataz, Maestros = true
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_company_role UNIQUE(tenant_id, code)
);

-- 3. Cuadrillas por Obra / Proyecto
CREATE TABLE IF NOT EXISTS core.crews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
    specialty_id UUID REFERENCES core.company_specialties(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL, -- ej: "Cuadrilla Estructura 01 - Alfa"
    leader_rut VARCHAR(20) NOT NULL, -- RUT del Capataz o Maestro Líder
    leader_name VARCHAR(150),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Miembros / Dotación de la Cuadrilla
CREATE TABLE IF NOT EXISTS core.crew_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES core.crews(id) ON DELETE CASCADE,
    worker_rut VARCHAR(20) NOT NULL,
    worker_name VARCHAR(150),
    role_id UUID REFERENCES core.company_operational_roles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_crew_worker UNIQUE(crew_id, worker_rut)
);

-- 5. Asignación Granular a Tareas y Registro de HH Reales
CREATE TABLE IF NOT EXISTS core.crew_task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
    crew_id UUID NOT NULL REFERENCES core.crews(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
    assignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    task_code VARCHAR(50) NOT NULL, -- Código de partida / tarea (ej: "P-04-SOLD", "E-01-MONTAJE")
    task_name VARCHAR(200) NOT NULL,
    worker_rut VARCHAR(20) NOT NULL,
    worker_name VARCHAR(150),
    hours_allocated NUMERIC(4,2) NOT NULL DEFAULT 8.00,
    hours_real NUMERIC(4,2) NOT NULL DEFAULT 8.00,
    unit_progress NUMERIC(10,2) DEFAULT 0, -- Avance físico unitario (m, kg, pulg-diam, etc.)
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_crews_project ON core.crews(project_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_crew ON core.crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_task_assign_date ON core.crew_task_assignments(assignment_date, project_id);
CREATE INDEX IF NOT EXISTS idx_crew_task_assign_task ON core.crew_task_assignments(task_code);

-- Función para inicializar especialidades y cargos por defecto para un Tenant
CREATE OR REPLACE FUNCTION core.seed_tenant_default_dictionaries(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    -- 17 Especialidades Estándar
    INSERT INTO core.company_specialties (tenant_id, code, name) VALUES
        (p_tenant_id, '01', 'ESTRUCTURA'),
        (p_tenant_id, '02', 'MECANICA'),
        (p_tenant_id, '03', 'ELECTRICA'),
        (p_tenant_id, '04', 'MOV. DE TIERRA'),
        (p_tenant_id, '05', 'PIPING'),
        (p_tenant_id, '06', 'INSTRUMENTACION'),
        (p_tenant_id, '07', 'PRECOM'),
        (p_tenant_id, '08', 'OBRAS CIVILES'),
        (p_tenant_id, '09', 'ANDAMIOS'),
        (p_tenant_id, '10', 'ENFIERRADURA'),
        (p_tenant_id, '11', 'PINTURA'),
        (p_tenant_id, '12', 'RECUBRIMIENTO'),
        (p_tenant_id, '13', 'SOLDADURA'),
        (p_tenant_id, '14', 'OTROS'),
        (p_tenant_id, '15', 'ELE&INS'),
        (p_tenant_id, '16', 'EST-MEC'),
        (p_tenant_id, '17', 'AISLACIÓN')
    ON CONFLICT (tenant_id, code) DO NOTHING;

    -- 5 Roles / Cargos Operativos Estándar
    INSERT INTO core.company_operational_roles (tenant_id, code, name, can_lead_crew) VALUES
        (p_tenant_id, '01', 'CAPATAZ', true),
        (p_tenant_id, '02', 'JEFE DE AREA', false),
        (p_tenant_id, '03', 'MAESTROS', true),
        (p_tenant_id, '04', 'SUPERVISOR', false),
        (p_tenant_id, '05', 'OTROS', false)
    ON CONFLICT (tenant_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar semilla para todos los tenants ya existentes
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN SELECT id FROM core.tenants LOOP
        PERFORM core.seed_tenant_default_dictionaries(t.id);
    END LOOP;
END;
$$;
