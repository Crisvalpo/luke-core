-- ==============================================================================
-- MIGRACIÓN 034: REPARACIÓN DE CLAVES FORÁNEAS A BORRADO EN CASCADA (ON DELETE CASCADE)
-- Convierte todas las restricciones de piping, quality, documents y staging a CASCADE.
-- ==============================================================================

-- 1. piping.project_configs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_piping_proy_cfg_proyectos') THEN
        ALTER TABLE piping.project_configs DROP CONSTRAINT fk_piping_proy_cfg_proyectos;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='project_configs' AND column_name='project_id') THEN
            ALTER TABLE piping.project_configs ADD CONSTRAINT fk_piping_proy_cfg_proyectos 
                FOREIGN KEY (project_id, tenant_id) REFERENCES core.projects (id, tenant_id) ON DELETE CASCADE;
        ELSE
            ALTER TABLE piping.project_configs ADD CONSTRAINT fk_piping_proy_cfg_proyectos 
                FOREIGN KEY (proyecto_id, tenant_id) REFERENCES core.projects (id, tenant_id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 2. Jerarquía Maestra de Piping
DO $$
DECLARE
    t_name TEXT;
    c_name TEXT;
    p_col TEXT;
BEGIN
    FOR t_name, c_name IN VALUES 
        ('lines', 'fk_lineas_proyectos'),
        ('isometrics', 'fk_isometricos_proyectos'),
        ('spools', 'fk_spools_proyectos'),
        ('joints', 'fk_juntas_proyectos'),
        ('valves', 'fk_valvulas_proyectos'),
        ('supports', 'fk_soportes_proyectos'),
        ('pid', 'fk_pid_proyectos'),
        ('pid_lines', 'fk_pid_lineas_proyectos'),
        ('tie_ins', 'fk_tie_ins_proyectos'),
        ('mto_items', 'fk_mto_items_proyectos'),
        ('spool_events', 'fk_eventos_spool_proyectos'),
        ('bim_elements', 'fk_elementos_bim_proyectos'),
        ('joint_executions', 'fk_ejecuciones_proyectos'),
        ('project_diameters', 'fk_proy_diametros_proy'),
        ('project_fluids', 'fk_cat_fluidos_proy'),
        ('project_joint_types', 'fk_proy_tipos_union_proy'),
        ('project_painting_specs', 'fk_cat_pintura_proy'),
        ('project_pipe_classes', 'fk_cat_clases_proy')
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name=t_name) THEN
            EXECUTE format('ALTER TABLE piping.%I DROP CONSTRAINT IF EXISTS %I;', t_name, c_name);
            
            SELECT column_name INTO p_col 
            FROM information_schema.columns 
            WHERE table_schema='piping' AND table_name=t_name AND column_name IN ('project_id', 'proyecto_id') 
            LIMIT 1;

            IF p_col IS NOT NULL THEN
                EXECUTE format('ALTER TABLE piping.%I ADD CONSTRAINT %I FOREIGN KEY (%I, tenant_id) REFERENCES core.projects (id, tenant_id) ON DELETE CASCADE;', t_name, c_name, p_col);
            END IF;
        END IF;
    END LOOP;
END $$;

-- 3. Catálogos Base de Piping (Tenant Level)
DO $$
DECLARE
    t_name TEXT;
    c_name TEXT;
BEGIN
    FOR t_name, c_name IN VALUES 
        ('catalog_diameters', 'cat_diametros_tenant_id_fkey'),
        ('catalog_joint_types', 'cat_tipos_union_tenant_id_fkey'),
        ('catalog_support_types', 'cat_tipos_soporte_tenant_id_fkey'),
        ('catalog_test_types', 'cat_tipos_prueba_tenant_id_fkey')
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name=t_name) THEN
            EXECUTE format('ALTER TABLE piping.%I DROP CONSTRAINT IF EXISTS %I;', t_name, c_name);
            EXECUTE format('ALTER TABLE piping.%I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES core.tenants (id) ON DELETE CASCADE;', t_name, c_name);
        END IF;
    END LOOP;
END $$;

-- 4. Esquema Calidad (Quality)
DO $$
DECLARE
    t_name TEXT;
    c_name TEXT;
    p_col TEXT;
BEGIN
    FOR t_name, c_name IN VALUES 
        ('joint_repairs', 'fk_reparaciones_proyectos'),
        ('ndt_inspections', 'fk_ensayos_nde_proyectos'),
        ('visual_inspections', 'fk_inspecciones_proyectos')
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='quality' AND table_name=t_name) THEN
            EXECUTE format('ALTER TABLE quality.%I DROP CONSTRAINT IF EXISTS %I;', t_name, c_name);
            
            SELECT column_name INTO p_col 
            FROM information_schema.columns 
            WHERE table_schema='quality' AND table_name=t_name AND column_name IN ('project_id', 'proyecto_id') 
            LIMIT 1;

            IF p_col IS NOT NULL THEN
                EXECUTE format('ALTER TABLE quality.%I ADD CONSTRAINT %I FOREIGN KEY (%I, tenant_id) REFERENCES core.projects (id, tenant_id) ON DELETE CASCADE;', t_name, c_name, p_col);
            END IF;
        END IF;
    END LOOP;
END $$;

-- 5. Esquema Documental (Documents) y Staging
DO $$
DECLARE
    t_name TEXT;
    c_name TEXT;
    p_col TEXT;
BEGIN
    FOR t_name, c_name IN VALUES 
        ('revisions', 'fk_revisiones_proyectos')
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='documents' AND table_name=t_name) THEN
            EXECUTE format('ALTER TABLE documents.%I DROP CONSTRAINT IF EXISTS %I;', t_name, c_name);
            
            SELECT column_name INTO p_col 
            FROM information_schema.columns 
            WHERE table_schema='documents' AND table_name=t_name AND column_name IN ('project_id', 'proyecto_id') 
            LIMIT 1;

            IF p_col IS NOT NULL THEN
                EXECUTE format('ALTER TABLE documents.%I ADD CONSTRAINT %I FOREIGN KEY (%I, tenant_id) REFERENCES core.projects (id, tenant_id) ON DELETE CASCADE;', t_name, c_name, p_col);
            END IF;
        END IF;
    END LOOP;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='staging' AND table_name='migracion_reportes') THEN
        ALTER TABLE staging.migracion_reportes DROP CONSTRAINT IF EXISTS fk_migracion_rep_proy;
        SELECT column_name INTO p_col 
        FROM information_schema.columns 
        WHERE table_schema='staging' AND table_name='migracion_reportes' AND column_name IN ('project_id', 'proyecto_id') 
        LIMIT 1;
        IF p_col IS NOT NULL THEN
            EXECUTE format('ALTER TABLE staging.migracion_reportes ADD CONSTRAINT fk_migracion_rep_proy FOREIGN KEY (%I, tenant_id) REFERENCES core.projects (id, tenant_id) ON DELETE CASCADE;', p_col);
        END IF;
    END IF;
END $$;

-- 6. Métodos NDE en Calidad y Documentos adicionales
DO $$
DECLARE
    p_col TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='calidad' AND table_name='cat_metodos_nde') THEN
        ALTER TABLE calidad.cat_metodos_nde DROP CONSTRAINT IF EXISTS cat_metodos_nde_tenant_id_fkey;
        ALTER TABLE calidad.cat_metodos_nde ADD CONSTRAINT cat_metodos_nde_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES core.tenants (id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='calidad' AND table_name='proyecto_metodos_nde') THEN
        ALTER TABLE calidad.proyecto_metodos_nde DROP CONSTRAINT IF EXISTS fk_proy_metodos_nde_proy;
        SELECT column_name INTO p_col 
        FROM information_schema.columns 
        WHERE table_schema='calidad' AND table_name='proyecto_metodos_nde' AND column_name IN ('project_id', 'proyecto_id') 
        LIMIT 1;
        IF p_col IS NOT NULL THEN
            EXECUTE format('ALTER TABLE calidad.proyecto_metodos_nde ADD CONSTRAINT fk_proy_metodos_nde_proy FOREIGN KEY (%I, tenant_id) REFERENCES core.projects (id, tenant_id) ON DELETE CASCADE;', p_col);
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='documents' AND table_name='documents') THEN
        ALTER TABLE documents.documents DROP CONSTRAINT IF EXISTS fk_documentos_proyectos;
        SELECT column_name INTO p_col 
        FROM information_schema.columns 
        WHERE table_schema='documents' AND table_name='documents' AND column_name IN ('project_id', 'proyecto_id') 
        LIMIT 1;
        IF p_col IS NOT NULL THEN
            EXECUTE format('ALTER TABLE documents.documents ADD CONSTRAINT fk_documentos_proyectos FOREIGN KEY (%I, tenant_id) REFERENCES core.projects (id, tenant_id) ON DELETE CASCADE;', p_col);
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='documents' AND table_name='revision_impacts') THEN
        ALTER TABLE documents.revision_impacts DROP CONSTRAINT IF EXISTS fk_impactos_proyectos;
        SELECT column_name INTO p_col 
        FROM information_schema.columns 
        WHERE table_schema='documents' AND table_name='revision_impacts' AND column_name IN ('project_id', 'proyecto_id') 
        LIMIT 1;
        IF p_col IS NOT NULL THEN
            EXECUTE format('ALTER TABLE documents.revision_impacts ADD CONSTRAINT fk_impactos_proyectos FOREIGN KEY (%I, tenant_id) REFERENCES core.projects (id, tenant_id) ON DELETE CASCADE;', p_col);
        END IF;
    END IF;
END $$;

