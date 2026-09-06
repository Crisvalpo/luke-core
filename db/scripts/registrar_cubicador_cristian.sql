-- =============================================================================
-- REGISTRO EXACTO: CUBICADOR FAENA 501 (AZUREAD\CristianLukeCabello)
-- =============================================================================

DO $$
DECLARE
    v_tenant_id UUID;
    v_project_501_id UUID := '11111111-1111-1111-1111-111111111111'::UUID;
    v_personal_id UUID := 'a0bd0184-2094-4b35-b124-b73093bed86c'::UUID;
BEGIN
    -- 1. Obtener o crear Tenant EIM
    SELECT id INTO v_tenant_id FROM core.tenants WHERE slug = 'eim' LIMIT 1;
    IF v_tenant_id IS NULL THEN
        SELECT id INTO v_tenant_id FROM core.tenants LIMIT 1;
    END IF;
    
    IF v_tenant_id IS NULL THEN
        INSERT INTO core.tenants (slug, business_name, tax_id, is_active)
        VALUES ('eim', 'Echeverría Izquierdo Montajes Industriales S.A.', '76123456K', TRUE)
        RETURNING id INTO v_tenant_id;
    END IF;

    -- 2. Asegurar Proyecto 501 (Faena Minera 501 - Piping) con ID 11111111-1111-1111-1111-111111111111
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'projects') THEN
        INSERT INTO core.projects (id, tenant_id, code, name, cost_center, location, status, is_active)
        VALUES (
            v_project_501_id,
            v_tenant_id,
            '501',
            'Faena Minera 501 - Piping',
            'CC-501',
            'Faena Cordillera',
            'en_ejecucion',
            TRUE
        )
        ON CONFLICT (id) DO UPDATE 
            SET code = '501',
                name = 'Faena Minera 501 - Piping',
                cost_center = 'CC-501',
                is_active = TRUE;
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'proyectos') THEN
        INSERT INTO core.proyectos (id, tenant_id, codigo, nombre, centro_costo, ubicacion, estado, activo)
        VALUES (
            v_project_501_id,
            v_tenant_id,
            '501',
            'Faena Minera 501 - Piping',
            'CC-501',
            'Faena Cordillera',
            'en_ejecucion',
            TRUE
        )
        ON CONFLICT (id) DO UPDATE 
            SET codigo = '501',
                nombre = 'Faena Minera 501 - Piping',
                centro_costo = 'CC-501',
                activo = TRUE;
    END IF;

    -- 3. Insertar o Actualizar Personal con ID a0bd0184-2094-4b35-b124-b73093bed86c
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'personnel') THEN
        INSERT INTO core.personnel (
            id,
            tenant_id,
            project_id,
            national_id,
            full_name,
            job_title,
            org_role,
            phone_number,
            email,
            usuario_windows,
            puede_sincronizar_excel,
            shift,
            is_active
        )
        VALUES (
            v_personal_id,
            v_tenant_id,
            v_project_501_id,
            '15888999K',
            'Cristian Luke Cabello',
            'Cubicador & Control Piping',
            'supervisor',
            '+56935264052',
            'ccabello@eim.cl',
            'AzureAD\CristianLukeCabello',
            TRUE,
            '5x2',
            TRUE
        )
        ON CONFLICT (id) DO UPDATE 
            SET project_id = v_project_501_id,
                phone_number = '+56935264052',
                usuario_windows = 'AzureAD\CristianLukeCabello',
                job_title = 'Cubicador & Control Piping',
                org_role = 'supervisor',
                full_name = 'Cristian Luke Cabello',
                puede_sincronizar_excel = TRUE,
                is_active = TRUE;
    ELSE
        INSERT INTO core.personal (
            id,
            tenant_id,
            proyecto_id,
            rut,
            nombre_completo,
            cargo,
            rol_organizacional,
            telefono_whatsapp,
            email,
            usuario_windows,
            puede_sincronizar_excel,
            turno,
            activo
        )
        VALUES (
            v_personal_id,
            v_tenant_id,
            v_project_501_id,
            '15888999K',
            'Cristian Luke Cabello',
            'Cubicador & Control Piping',
            'supervisor',
            '+56935264052',
            'ccabello@eim.cl',
            'AzureAD\CristianLukeCabello',
            TRUE,
            '5x2',
            TRUE
        )
        ON CONFLICT (id) DO UPDATE 
            SET proyecto_id = v_project_501_id,
                telefono_whatsapp = '+56935264052',
                usuario_windows = 'AzureAD\CristianLukeCabello',
                cargo = 'Cubicador & Control Piping',
                rol_organizacional = 'supervisor',
                nombre_completo = 'Cristian Luke Cabello',
                puede_sincronizar_excel = TRUE,
                activo = TRUE;
    END IF;

    -- 4. Asignación Multi-Proyecto en core.personal_proyectos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'personal_proyectos') THEN
        INSERT INTO core.personal_proyectos (personal_id, proyecto_id, puede_sincronizar)
        VALUES (v_personal_id, v_project_501_id, TRUE)
        ON CONFLICT (personal_id, proyecto_id) DO UPDATE 
            SET puede_sincronizar = TRUE;
    END IF;

    -- 5. Tabla Legacy core.usuarios_excel (por compatibilidad hacia atrás con VBA antiguo)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'usuarios_excel') THEN
        INSERT INTO core.usuarios_excel (id, usuario_windows, nombre, telefono, activo)
        VALUES (v_personal_id, 'AzureAD\CristianLukeCabello', 'Cristian Luke Cabello (Cubicador)', '+56935264052', TRUE)
        ON CONFLICT (usuario_windows) DO UPDATE 
            SET telefono = '+56935264052',
                activo = TRUE,
                nombre = 'Cristian Luke Cabello (Cubicador)';
        
        -- Versión sin prefijo por si Environ("USERNAME") devuelve solo el nombre
        INSERT INTO core.usuarios_excel (usuario_windows, nombre, telefono, activo)
        VALUES ('CristianLukeCabello', 'Cristian Luke Cabello (Cubicador)', '+56935264052', TRUE)
        ON CONFLICT (usuario_windows) DO UPDATE 
            SET telefono = '+56935264052',
                activo = TRUE;
    END IF;

END $$;
