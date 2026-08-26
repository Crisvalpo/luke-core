-- =============================================================================
-- SEMILLA MAESTRA 001: Datos Iniciales para Echeverría Izquierdo (EIM) y TNS
-- =============================================================================

DO $$
DECLARE
    v_eim_id UUID;
    v_tns_id UUID;
    v_andina_id UUID;
    v_qb2_id UUID;
    v_tns_norte_id UUID;
    v_tns_centro_id UUID;
BEGIN
    -- -------------------------------------------------------------------------
    -- 1. TENANTS (Empresas)
    -- -------------------------------------------------------------------------
    INSERT INTO core.tenants (slug, razon_social, rut, config, activo)
    VALUES 
    (
        'eim', 
        'Echeverría Izquierdo Montajes Industriales S.A.', 
        '76123456K', 
        '{"pais": "CL", "color_primario": "#003366", "logo_url": "https://lukeapp.cl/assets/eim_logo.png"}'::jsonb, 
        TRUE
    )
    ON CONFLICT (slug) DO UPDATE 
        SET razon_social = EXCLUDED.razon_social,
            config = EXCLUDED.config
    RETURNING id INTO v_eim_id;

    INSERT INTO core.tenants (slug, razon_social, rut, config, activo)
    VALUES 
    (
        'tns', 
        'TNS Transportes & Soluciones SpA', 
        '778889991', 
        '{"pais": "CL", "color_primario": "#FF6600", "logo_url": "https://lukeapp.cl/assets/tns_logo.png"}'::jsonb, 
        TRUE
    )
    ON CONFLICT (slug) DO UPDATE 
        SET razon_social = EXCLUDED.razon_social,
            config = EXCLUDED.config
    RETURNING id INTO v_tns_id;

    -- Si v_eim_id o v_tns_id vinieron nulos por el ON CONFLICT existente sin retorno:
    IF v_eim_id IS NULL THEN
        SELECT id INTO v_eim_id FROM core.tenants WHERE slug = 'eim';
    END IF;
    IF v_tns_id IS NULL THEN
        SELECT id INTO v_tns_id FROM core.tenants WHERE slug = 'tns';
    END IF;

    -- -------------------------------------------------------------------------
    -- 2. PROYECTOS (Obras / Faenas)
    -- -------------------------------------------------------------------------
    -- EIM Proyectos
    INSERT INTO core.proyectos (tenant_id, codigo, nombre, centro_costo, ubicacion, estado, metadata)
    VALUES 
    (
        v_eim_id,
        'ANDINA-PIP',
        'Piping & Montaje Codelco Andina',
        'CC-2026-ANDINA',
        'Los Andes, Región de Valparaíso',
        'en_ejecucion',
        '{"cliente": "Codelco", "division": "Andina", "cota_msnm": 3500}'::jsonb
    )
    ON CONFLICT (tenant_id, codigo) DO UPDATE 
        SET nombre = EXCLUDED.nombre,
            centro_costo = EXCLUDED.centro_costo
    RETURNING id INTO v_andina_id;

    INSERT INTO core.proyectos (tenant_id, codigo, nombre, centro_costo, ubicacion, estado, metadata)
    VALUES 
    (
        v_eim_id,
        'QB2-CONC',
        'Concentradora Quebrada Blanca Fase 2',
        'CC-2026-QB2',
        'Pica, Región de Tarapacá',
        'en_ejecucion',
        '{"cliente": "Teck", "cota_msnm": 4400}'::jsonb
    )
    ON CONFLICT (tenant_id, codigo) DO UPDATE 
        SET nombre = EXCLUDED.nombre,
            centro_costo = EXCLUDED.centro_costo
    RETURNING id INTO v_qb2_id;

    IF v_andina_id IS NULL THEN
        SELECT id INTO v_andina_id FROM core.proyectos WHERE tenant_id = v_eim_id AND codigo = 'ANDINA-PIP';
    END IF;
    IF v_qb2_id IS NULL THEN
        SELECT id INTO v_qb2_id FROM core.proyectos WHERE tenant_id = v_eim_id AND codigo = 'QB2-CONC';
    END IF;

    -- TNS Proyectos
    INSERT INTO core.proyectos (tenant_id, codigo, nombre, centro_costo, ubicacion, estado, metadata)
    VALUES 
    (
        v_tns_id,
        'TNS-NORTE',
        'Operación Minera Norte',
        'CC-TNS-01',
        'Antofagasta',
        'en_ejecucion',
        '{"tipo_operacion": "transporte_concentrado"}'::jsonb
    )
    ON CONFLICT (tenant_id, codigo) DO UPDATE 
        SET nombre = EXCLUDED.nombre
    RETURNING id INTO v_tns_norte_id;

    INSERT INTO core.proyectos (tenant_id, codigo, nombre, centro_costo, ubicacion, estado, metadata)
    VALUES 
    (
        v_tns_id,
        'TNS-CENTRO',
        'Distribución Logística Central',
        'CC-TNS-02',
        'Santiago / San Antonio',
        'en_ejecucion',
        '{"tipo_operacion": "cargas_especiales"}'::jsonb
    )
    ON CONFLICT (tenant_id, codigo) DO UPDATE 
        SET nombre = EXCLUDED.nombre
    RETURNING id INTO v_tns_centro_id;

    IF v_tns_norte_id IS NULL THEN
        SELECT id INTO v_tns_norte_id FROM core.proyectos WHERE tenant_id = v_tns_id AND codigo = 'TNS-NORTE';
    END IF;

    -- -------------------------------------------------------------------------
    -- 3. FRENTES DE TRABAJO
    -- -------------------------------------------------------------------------
    -- Frentes Andina
    INSERT INTO core.frentes_trabajo (tenant_id, proyecto_id, codigo, nombre, disciplina)
    VALUES 
        (v_eim_id, v_andina_id, 'FR-01', 'Chancado Primario Subterráneo', 'PIPING'),
        (v_eim_id, v_andina_id, 'FR-02', 'Molienda SAG y Bolas', 'MECANICA'),
        (v_eim_id, v_andina_id, 'FR-03', 'Edificio Compresores y Servicios', 'ESTRUCTURA')
    ON CONFLICT (proyecto_id, codigo) DO UPDATE 
        SET nombre = EXCLUDED.nombre, disciplina = EXCLUDED.disciplina;

    -- Frentes QB2
    INSERT INTO core.frentes_trabajo (tenant_id, proyecto_id, codigo, nombre, disciplina)
    VALUES 
        (v_eim_id, v_qb2_id, 'FR-QB-01', 'Espesadores de Relaves', 'CIVIL'),
        (v_eim_id, v_qb2_id, 'FR-QB-02', 'Planta de Filtros', 'PIPING')
    ON CONFLICT (proyecto_id, codigo) DO UPDATE 
        SET nombre = EXCLUDED.nombre, disciplina = EXCLUDED.disciplina;

    -- Frentes TNS
    INSERT INTO core.frentes_trabajo (tenant_id, proyecto_id, codigo, nombre, disciplina)
    VALUES 
        (v_tns_id, v_tns_norte_id, 'TNS-FR-01', 'Patio de Carga y Maniobras', 'GENERAL')
    ON CONFLICT (proyecto_id, codigo) DO UPDATE 
        SET nombre = EXCLUDED.nombre, disciplina = EXCLUDED.disciplina;

    -- -------------------------------------------------------------------------
    -- 4. PERSONAL / DOTACIÓN (Con teléfonos WhatsApp normalizados E.164)
    -- -------------------------------------------------------------------------
    -- Personal EIM
    INSERT INTO core.personal (tenant_id, proyecto_id, rut, nombre_completo, cargo, rol_organizacional, telefono_whatsapp, email, turno, activo)
    VALUES 
        (v_eim_id, v_andina_id, '15888999K', 'Cristian Cabello', 'Jefe de Terreno & Líder Digital', 'admin', '+56977778888', 'ccabello@eim.cl', '5x2', TRUE),
        (v_eim_id, v_andina_id, '161112223', 'Rodrigo Pérez', 'Supervisor de Piping', 'supervisor', '+56911112222', 'rperez@eim.cl', '7x7', TRUE),
        (v_eim_id, v_andina_id, '173334445', 'Jaime Morales', 'Capataz de Montaje', 'capataz', '+56933334444', 'jmorales@eim.cl', '7x7', TRUE),
        (v_eim_id, v_andina_id, '185556667', 'Mario Soto', 'Soldador Calificado 6G', 'soldador', '+56955556666', 'msoto@eim.cl', '7x7', TRUE),
        (v_eim_id, v_andina_id, '197778889', 'Carlos Valenzuela', 'Rigger Alto Tonelaje', 'rigger', '+56999990000', 'cvalenzuela@eim.cl', '7x7', TRUE),
        (v_eim_id, v_qb2_id, '134445556', 'Gonzalo Barraza', 'Administrador de Obra QB2', 'administrador_obra', '+56944445555', 'gbarraza@eim.cl', '5x2', TRUE)
    ON CONFLICT (tenant_id, rut) DO UPDATE 
        SET nombre_completo = EXCLUDED.nombre_completo,
            telefono_whatsapp = EXCLUDED.telefono_whatsapp,
            cargo = EXCLUDED.cargo,
            rol_organizacional = EXCLUDED.rol_organizacional;

    -- Personal TNS
    INSERT INTO core.personal (tenant_id, proyecto_id, rut, nombre_completo, cargo, rol_organizacional, telefono_whatsapp, email, turno, activo)
    VALUES 
        (v_tns_id, v_tns_norte_id, '142223334', 'Juan Tapia', 'Jefe de Operaciones Flota', 'admin', '+56988881111', 'jtapia@tns.cl', '5x2', TRUE),
        (v_tns_id, v_tns_norte_id, '154445556', 'Luis Araya', 'Conductor Rampla Pesada', 'chofer', '+56988882222', 'laraya@tns.cl', '14x14', TRUE)
    ON CONFLICT (tenant_id, rut) DO UPDATE 
        SET nombre_completo = EXCLUDED.nombre_completo,
            telefono_whatsapp = EXCLUDED.telefono_whatsapp;

    -- -------------------------------------------------------------------------
    -- 5. EQUIPOS Y FLOTA
    -- -------------------------------------------------------------------------
    -- Flota EIM Andina
    INSERT INTO core.equipos (tenant_id, proyecto_id, codigo_interno, patente, descripcion, categoria, tipo_medicion, ultimo_contador)
    VALUES 
        (v_eim_id, v_andina_id, 'GR-101', 'GGAA10', 'Grúa RT Grove 80 Ton', 'grua', 'horometro', 3450.50),
        (v_eim_id, v_andina_id, 'CA-201', 'CJBB20', 'Camión Aljibe Mercedes Benz 15m3', 'camion_aljibe', 'horometro', 1220.00),
        (v_eim_id, v_andina_id, 'CP-301', 'CPCC30', 'Camión Pluma 12 Ton Fassi', 'camion_pluma', 'horometro', 2100.80),
        (v_eim_id, v_andina_id, 'CT-401', 'HKDD40', 'Camioneta Faenera 4x4 Toyota Hilux', 'camioneta', 'kilometraje', 45800.00),
        (v_eim_id, v_andina_id, 'COMP-501', NULL, 'Compresor Atlas Copco 375 CFM', 'compresor', 'horometro', 1840.20)
    ON CONFLICT (tenant_id, codigo_interno) DO UPDATE 
        SET descripcion = EXCLUDED.descripcion,
            ultimo_contador = EXCLUDED.ultimo_contador;

    -- Flota TNS
    INSERT INTO core.equipos (tenant_id, proyecto_id, codigo_interno, patente, descripcion, categoria, tipo_medicion, ultimo_contador)
    VALUES 
        (v_tns_id, v_tns_norte_id, 'TR-01', 'TTEE01', 'Tracto Camión Volvo FH 540', 'camion_tolva', 'kilometraje', 189500.00),
        (v_tns_id, v_tns_norte_id, 'RA-01', 'RPFF01', 'Rampla Plana 3 Ejes Randon', 'rampla', 'kilometraje', 120400.00)
    ON CONFLICT (tenant_id, codigo_interno) DO UPDATE 
        SET descripcion = EXCLUDED.descripcion,
            ultimo_contador = EXCLUDED.ultimo_contador;

    -- -------------------------------------------------------------------------
    -- 6. PROVEEDORES
    -- -------------------------------------------------------------------------
    INSERT INTO core.proveedores (tenant_id, rut, razon_social, giro, contacto_nombre, telefono, email)
    VALUES 
        (v_eim_id, '771112223', 'Indura S.A.', 'Gases Industriales y Soldaduras', 'Pedro Valdés', '+56222223333', 'contacto@indura.cl'),
        (v_eim_id, '782223334', 'Copec Combustibles S.A.', 'Distribución de Combustibles y Lubricantes', 'Mesa Empresas', '+56224445555', 'faenas@copec.cl'),
        (v_eim_id, '793334445', 'Arriendos Trex SpA', 'Arriendo de Grúas y Maquinaria Pesada', 'Marcos Toledo', '+56966667777', 'arriendos@trex.cl'),
        (v_tns_id, '764445556', 'Shell Petrobras Distribución', 'Combustibles en Ruta y Estaciones', 'Atención Flotas', '+56228889999', 'flotas@shell.cl')
    ON CONFLICT (tenant_id, rut) DO UPDATE 
        SET razon_social = EXCLUDED.razon_social,
            giro = EXCLUDED.giro;

END $$;
