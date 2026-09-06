-- ==============================================================================
-- MIGRACIÓN 035: RESOLUCIÓN DEFINITIVA DE TODAS LAS CLAVES FORÁNEAS (CASCADE & SET NULL)
-- Corrige piping.mto, referencias de personal y jerarquía interna de piping y calidad.
-- ==============================================================================

-- 1. piping.mto
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='mto') THEN
        ALTER TABLE piping.mto DROP CONSTRAINT IF EXISTS mto_tenant_id_fkey;
        ALTER TABLE piping.mto ADD CONSTRAINT mto_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES core.tenants(id) ON DELETE CASCADE;

        ALTER TABLE piping.mto DROP CONSTRAINT IF EXISTS mto_proyecto_id_fkey;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='mto' AND column_name='project_id') THEN
            ALTER TABLE piping.mto ADD CONSTRAINT mto_proyecto_id_fkey FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE;
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='mto' AND column_name='proyecto_id') THEN
            ALTER TABLE piping.mto ADD CONSTRAINT mto_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES core.projects(id) ON DELETE CASCADE;
        END IF;

        ALTER TABLE piping.mto DROP CONSTRAINT IF EXISTS mto_created_by_fkey;
        ALTER TABLE piping.mto ADD CONSTRAINT mto_created_by_fkey FOREIGN KEY (created_by) REFERENCES core.personnel(id) ON DELETE SET NULL;

        ALTER TABLE piping.mto DROP CONSTRAINT IF EXISTS mto_updated_by_fkey;
        ALTER TABLE piping.mto ADD CONSTRAINT mto_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES core.personnel(id) ON DELETE SET NULL;

        ALTER TABLE piping.mto DROP CONSTRAINT IF EXISTS mto_linea_id_fkey;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='mto' AND column_name='line_id') THEN
            ALTER TABLE piping.mto ADD CONSTRAINT mto_linea_id_fkey FOREIGN KEY (line_id) REFERENCES piping.lines(id) ON DELETE CASCADE;
        END IF;

        ALTER TABLE piping.mto DROP CONSTRAINT IF EXISTS mto_isometrico_id_fkey;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='mto' AND column_name='isometric_id') THEN
            ALTER TABLE piping.mto ADD CONSTRAINT mto_isometrico_id_fkey FOREIGN KEY (isometric_id) REFERENCES piping.isometrics(id) ON DELETE CASCADE;
        END IF;

        ALTER TABLE piping.mto DROP CONSTRAINT IF EXISTS mto_spool_id_fkey;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='piping' AND table_name='mto' AND column_name='spool_id') THEN
            ALTER TABLE piping.mto ADD CONSTRAINT mto_spool_id_fkey FOREIGN KEY (spool_id) REFERENCES piping.spools(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 2. Referencias a personal en piping y calidad (SET NULL para no bloquear borrado)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='joint_executions') THEN
        ALTER TABLE piping.joint_executions DROP CONSTRAINT IF EXISTS ejecuciones_junta_ejecutor_personal_id_fkey;
        ALTER TABLE piping.joint_executions ADD CONSTRAINT ejecuciones_junta_ejecutor_personal_id_fkey 
            FOREIGN KEY (ejecutor_personal_id) REFERENCES core.personnel(id) ON DELETE SET NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='quality' AND table_name='visual_inspections') THEN
        ALTER TABLE quality.visual_inspections DROP CONSTRAINT IF EXISTS inspecciones_visuales_inspector_personal_id_fkey;
        ALTER TABLE quality.visual_inspections ADD CONSTRAINT inspecciones_visuales_inspector_personal_id_fkey 
            FOREIGN KEY (inspector_personal_id) REFERENCES core.personnel(id) ON DELETE SET NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='quality' AND table_name='joint_repairs') THEN
        ALTER TABLE quality.joint_repairs DROP CONSTRAINT IF EXISTS reparaciones_junta_soldador_personal_id_fkey;
        ALTER TABLE quality.joint_repairs ADD CONSTRAINT reparaciones_junta_soldador_personal_id_fkey 
            FOREIGN KEY (soldador_personal_id) REFERENCES core.personnel(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Jerarquía interna de Piping (CASCADE entre padres e hijos)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='isometrics') THEN
        ALTER TABLE piping.isometrics DROP CONSTRAINT IF EXISTS isometricos_linea_id_fkey;
        ALTER TABLE piping.isometrics ADD CONSTRAINT isometricos_linea_id_fkey FOREIGN KEY (line_id) REFERENCES piping.lines(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='spools') THEN
        ALTER TABLE piping.spools DROP CONSTRAINT IF EXISTS spools_isometrico_id_fkey;
        ALTER TABLE piping.spools ADD CONSTRAINT spools_isometrico_id_fkey FOREIGN KEY (isometric_id) REFERENCES piping.isometrics(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='joints') THEN
        ALTER TABLE piping.joints DROP CONSTRAINT IF EXISTS juntas_isometrico_id_fkey;
        ALTER TABLE piping.joints ADD CONSTRAINT juntas_isometrico_id_fkey FOREIGN KEY (isometric_id) REFERENCES piping.isometrics(id) ON DELETE CASCADE;

        ALTER TABLE piping.joints DROP CONSTRAINT IF EXISTS juntas_spool_id_fkey;
        ALTER TABLE piping.joints ADD CONSTRAINT juntas_spool_id_fkey FOREIGN KEY (spool_id) REFERENCES piping.spools(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='valves') THEN
        ALTER TABLE piping.valves DROP CONSTRAINT IF EXISTS valvulas_linea_id_fkey;
        ALTER TABLE piping.valves ADD CONSTRAINT valvulas_linea_id_fkey FOREIGN KEY (line_id) REFERENCES piping.lines(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='supports') THEN
        ALTER TABLE piping.supports DROP CONSTRAINT IF EXISTS soportes_linea_id_fkey;
        ALTER TABLE piping.supports ADD CONSTRAINT soportes_linea_id_fkey FOREIGN KEY (line_id) REFERENCES piping.lines(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='pid_lines') THEN
        ALTER TABLE piping.pid_lines DROP CONSTRAINT IF EXISTS pid_lineas_pid_id_fkey;
        ALTER TABLE piping.pid_lines ADD CONSTRAINT pid_lineas_pid_id_fkey FOREIGN KEY (pid_id) REFERENCES piping.pid(id) ON DELETE CASCADE;

        ALTER TABLE piping.pid_lines DROP CONSTRAINT IF EXISTS pid_lineas_linea_id_fkey;
        ALTER TABLE piping.pid_lines ADD CONSTRAINT pid_lineas_linea_id_fkey FOREIGN KEY (line_id) REFERENCES piping.lines(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='piping' AND table_name='joint_executions') THEN
        ALTER TABLE piping.joint_executions DROP CONSTRAINT IF EXISTS ejecuciones_junta_junta_id_fkey;
        ALTER TABLE piping.joint_executions ADD CONSTRAINT ejecuciones_junta_junta_id_fkey FOREIGN KEY (joint_id) REFERENCES piping.joints(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='quality' AND table_name='visual_inspections') THEN
        ALTER TABLE quality.visual_inspections DROP CONSTRAINT IF EXISTS inspecciones_visuales_ejecucion_junta_id_fkey;
        ALTER TABLE quality.visual_inspections ADD CONSTRAINT inspecciones_visuales_ejecucion_junta_id_fkey FOREIGN KEY (ejecucion_junta_id) REFERENCES piping.joint_executions(id) ON DELETE CASCADE;

        ALTER TABLE quality.visual_inspections DROP CONSTRAINT IF EXISTS inspecciones_visuales_junta_id_fkey;
        ALTER TABLE quality.visual_inspections ADD CONSTRAINT inspecciones_visuales_junta_id_fkey FOREIGN KEY (joint_id) REFERENCES piping.joints(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='quality' AND table_name='ndt_inspections') THEN
        ALTER TABLE quality.ndt_inspections DROP CONSTRAINT IF EXISTS ensayos_nde_junta_id_fkey;
        ALTER TABLE quality.ndt_inspections ADD CONSTRAINT ensayos_nde_junta_id_fkey FOREIGN KEY (joint_id) REFERENCES piping.joints(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='quality' AND table_name='joint_repairs') THEN
        ALTER TABLE quality.joint_repairs DROP CONSTRAINT IF EXISTS reparaciones_junta_ensayo_nde_origen_id_fkey;
        ALTER TABLE quality.joint_repairs ADD CONSTRAINT reparaciones_junta_ensayo_nde_origen_id_fkey FOREIGN KEY (ensayo_nde_origen_id) REFERENCES quality.ndt_inspections(id) ON DELETE CASCADE;

        ALTER TABLE quality.joint_repairs DROP CONSTRAINT IF EXISTS reparaciones_junta_junta_id_fkey;
        ALTER TABLE quality.joint_repairs ADD CONSTRAINT reparaciones_junta_junta_id_fkey FOREIGN KEY (joint_id) REFERENCES piping.joints(id) ON DELETE CASCADE;
    END IF;
END $$;
