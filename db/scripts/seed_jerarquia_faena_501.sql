-- ==============================================================================
-- SEED DE DATOS REALES DE FAENA PIPING — PROYECTO 501
-- Jerarquía Canónica: P&ID -> Líneas -> Isométricos -> Spools -> Juntas
-- ==============================================================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_proy_id UUID;
  
  v_union_bw UUID;
  v_union_sw UUID;
  v_union_so UUID;
  v_union_vic UUID;
  v_union_thd UUID;
  
  v_fluido_cw UUID;
  v_fluido_pw UUID;
  v_fluido_fw UUID;
  v_fluido_sl UUID;
  v_fluido_dr UUID;
  
  v_clase_c1 UUID;
  v_clase_c2 UUID;
  v_clase_c3 UUID;
  
  v_pid_101 UUID;
  v_pid_102 UUID;
  v_pid_103 UUID;
  
  v_linea_cw UUID;
  v_linea_pw UUID;
  v_linea_fw UUID;
  v_linea_sl UUID;
  v_linea_dr UUID;
  
  v_iso_102 UUID;
  v_iso_201 UUID;
  v_iso_305 UUID;
  v_iso_401 UUID;
  v_iso_500 UUID;
  
  v_sp_102_1 UUID;
  v_sp_102_2 UUID;
  v_sp_201_1 UUID;
  v_sp_201_2 UUID;
  v_sp_305_1 UUID;
  v_sp_401_1 UUID;
  v_sp_500_1 UUID;
BEGIN
  -- 1. Obtener Tenant y Proyecto 501
  SELECT id INTO v_tenant_id FROM core.tenants WHERE slug = 'eisa' LIMIT 1;
  SELECT id INTO v_proy_id FROM core.proyectos WHERE codigo = '501' AND tenant_id = v_tenant_id LIMIT 1;

  IF v_proy_id IS NULL THEN
    RAISE EXCEPTION 'Proyecto 501 no encontrado para tenant eisa';
  END IF;

  -- 2. Configuración del Proyecto
  INSERT INTO piping.proyecto_configuracion (tenant_id, proyecto_id, usa_pwht, controla_revisiones, permite_carga_masiva)
  VALUES (v_tenant_id, v_proy_id, TRUE, TRUE, TRUE)
  ON CONFLICT (proyecto_id) DO NOTHING;

  -- 3. Catálogos Corporativos (Nivel 1)
  INSERT INTO piping.cat_tipos_union (tenant_id, codigo, nombre, descripcion)
  VALUES
    (v_tenant_id, 'BW', 'Butt Weld (Biselada)', 'Soldadura a tope en tuberías'),
    (v_tenant_id, 'SW', 'Socket Weld (Enchufe)', 'Soldadura de encastre en diámetros menores'),
    (v_tenant_id, 'SO', 'Slip-On', 'Brida deslizable con doble soldadura'),
    (v_tenant_id, 'VIC', 'Victaulic / Ranurada', 'Unión mecánica por acople ranurado'),
    (v_tenant_id, 'THD', 'Threaded (Roscada)', 'Unión roscada NPT')
  ON CONFLICT (tenant_id, codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

  SELECT id INTO v_union_bw FROM piping.cat_tipos_union WHERE tenant_id = v_tenant_id AND codigo = 'BW' LIMIT 1;
  SELECT id INTO v_union_sw FROM piping.cat_tipos_union WHERE tenant_id = v_tenant_id AND codigo = 'SW' LIMIT 1;
  SELECT id INTO v_union_so FROM piping.cat_tipos_union WHERE tenant_id = v_tenant_id AND codigo = 'SO' LIMIT 1;
  SELECT id INTO v_union_vic FROM piping.cat_tipos_union WHERE tenant_id = v_tenant_id AND codigo = 'VIC' LIMIT 1;
  SELECT id INTO v_union_thd FROM piping.cat_tipos_union WHERE tenant_id = v_tenant_id AND codigo = 'THD' LIMIT 1;

  -- Diámetros
  INSERT INTO piping.cat_diametros (tenant_id, nps_codigo, diametro_pulgadas, diametro_mm, diametro_wdi)
  VALUES
    (v_tenant_id, '1/2"', 0.5, 15.0, 0.5),
    (v_tenant_id, '1"', 1.0, 25.0, 1.0),
    (v_tenant_id, '2"', 2.0, 50.0, 2.0),
    (v_tenant_id, '3"', 3.0, 80.0, 3.0),
    (v_tenant_id, '4"', 4.0, 100.0, 4.0),
    (v_tenant_id, '6"', 6.0, 150.0, 6.0),
    (v_tenant_id, '8"', 8.0, 200.0, 8.0),
    (v_tenant_id, '10"', 10.0, 250.0, 10.0),
    (v_tenant_id, '12"', 12.0, 300.0, 12.0)
  ON CONFLICT (tenant_id, nps_codigo) DO NOTHING;

  -- 4. Catálogos del Proyecto 501
  INSERT INTO piping.cat_fluidos_proyecto (tenant_id, proyecto_id, codigo, nombre, servicio)
  VALUES
    (v_tenant_id, v_proy_id, 'CW', 'Agua de Enfriamiento (Cooling Water)', 'Servicios Auxiliares'),
    (v_tenant_id, v_proy_id, 'PW', 'Agua de Proceso (Process Water)', 'Molienda y Flotación'),
    (v_tenant_id, v_proy_id, 'FW', 'Agua Contra Incendio (Fire Water)', 'Red de Emergencia'),
    (v_tenant_id, v_proy_id, 'SL', 'Pulpa de Concentrado (Slurry)', 'Espesamiento'),
    (v_tenant_id, v_proy_id, 'DR', 'Drenaje Industrial (Drainage)', 'Recuperación')
  ON CONFLICT (proyecto_id, codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

  SELECT id INTO v_fluido_cw FROM piping.cat_fluidos_proyecto WHERE proyecto_id = v_proy_id AND codigo = 'CW' LIMIT 1;
  SELECT id INTO v_fluido_pw FROM piping.cat_fluidos_proyecto WHERE proyecto_id = v_proy_id AND codigo = 'PW' LIMIT 1;
  SELECT id INTO v_fluido_fw FROM piping.cat_fluidos_proyecto WHERE proyecto_id = v_proy_id AND codigo = 'FW' LIMIT 1;
  SELECT id INTO v_fluido_sl FROM piping.cat_fluidos_proyecto WHERE proyecto_id = v_proy_id AND codigo = 'SL' LIMIT 1;
  SELECT id INTO v_fluido_dr FROM piping.cat_fluidos_proyecto WHERE proyecto_id = v_proy_id AND codigo = 'DR' LIMIT 1;

  INSERT INTO piping.cat_clases_proyecto (tenant_id, proyecto_id, codigo, rating, material_base, schedule)
  VALUES
    (v_tenant_id, v_proy_id, 'C1', '150#', 'Acero Carbono A106 Gr.B', 'STD'),
    (v_tenant_id, v_proy_id, 'C2', '300#', 'Acero Carbono A106 Gr.B', 'XS / Sch 80'),
    (v_tenant_id, v_proy_id, 'C3', '150#', 'Acero Inoxidable 316L', 'Sch 10S')
  ON CONFLICT (proyecto_id, codigo) DO UPDATE SET material_base = EXCLUDED.material_base;

  SELECT id INTO v_clase_c1 FROM piping.cat_clases_proyecto WHERE proyecto_id = v_proy_id AND codigo = 'C1' LIMIT 1;
  SELECT id INTO v_clase_c2 FROM piping.cat_clases_proyecto WHERE proyecto_id = v_proy_id AND codigo = 'C2' LIMIT 1;
  SELECT id INTO v_clase_c3 FROM piping.cat_clases_proyecto WHERE proyecto_id = v_proy_id AND codigo = 'C3' LIMIT 1;

  -- 5. P&IDs de Faena
  INSERT INTO piping.pid (tenant_id, proyecto_id, codigo, titulo, revision_vigente, estado_documental)
  VALUES
    (v_tenant_id, v_proy_id, '03351-PID-001', 'Diagrama de Flujo Molienda y Clasificación', 'B', 'VIGENTE'),
    (v_tenant_id, v_proy_id, '03351-PID-002', 'Diagrama de Distribución de Agua de Proceso', 'C', 'VIGENTE'),
    (v_tenant_id, v_proy_id, '03351-PID-003', 'Diagrama Sistema de Espesamiento y Relaves', 'A', 'VIGENTE')
  ON CONFLICT (proyecto_id, codigo) DO UPDATE SET titulo = EXCLUDED.titulo;

  SELECT id INTO v_pid_101 FROM piping.pid WHERE proyecto_id = v_proy_id AND codigo = '03351-PID-001' LIMIT 1;
  SELECT id INTO v_pid_102 FROM piping.pid WHERE proyecto_id = v_proy_id AND codigo = '03351-PID-002' LIMIT 1;
  SELECT id INTO v_pid_103 FROM piping.pid WHERE proyecto_id = v_proy_id AND codigo = '03351-PID-003' LIMIT 1;

  -- 6. Líneas de Piping
  INSERT INTO piping.lineas (tenant_id, proyecto_id, codigo, fluido_proyecto_id, clase_proyecto_id, nps_codigo, diametro_numerico, origen, destino, presion_diseno, temperatura_diseno)
  VALUES
    (v_tenant_id, v_proy_id, '03351-CW-6"-C1-102', v_fluido_cw, v_clase_c1, '6"', 6.0, 'Torre Enfriamiento', 'Molino SAG', 10.5, 45.0),
    (v_tenant_id, v_proy_id, '03351-PW-8"-C1-201', v_fluido_pw, v_clase_c1, '8"', 8.0, 'Estanque Agua Proceso', 'Celdas Flotacion', 8.0, 25.0),
    (v_tenant_id, v_proy_id, '03351-FW-4"-C2-305', v_fluido_fw, v_clase_c2, '4"', 4.0, 'Bomba Red Incendio', 'Anillo Perimetral', 16.0, 20.0),
    (v_tenant_id, v_proy_id, '03351-SL-10"-C2-401', v_fluido_sl, v_clase_c2, '10"', 10.0, 'Cajón Distribuidor', 'Espesador Concentrado', 12.0, 35.0),
    (v_tenant_id, v_proy_id, '03351-DR-12"-C1-500', v_fluido_dr, v_clase_c1, '12"', 12.0, 'Sumidero Nave Molienda', 'Piscina Emergencia', 3.0, 20.0)
  ON CONFLICT (proyecto_id, codigo) DO UPDATE SET origen = EXCLUDED.origen;

  SELECT id INTO v_linea_cw FROM piping.lineas WHERE proyecto_id = v_proy_id AND codigo = '03351-CW-6"-C1-102' LIMIT 1;
  SELECT id INTO v_linea_pw FROM piping.lineas WHERE proyecto_id = v_proy_id AND codigo = '03351-PW-8"-C1-201' LIMIT 1;
  SELECT id INTO v_linea_fw FROM piping.lineas WHERE proyecto_id = v_proy_id AND codigo = '03351-FW-4"-C2-305' LIMIT 1;
  SELECT id INTO v_linea_sl FROM piping.lineas WHERE proyecto_id = v_proy_id AND codigo = '03351-SL-10"-C2-401' LIMIT 1;
  SELECT id INTO v_linea_dr FROM piping.lineas WHERE proyecto_id = v_proy_id AND codigo = '03351-DR-12"-C1-500' LIMIT 1;

  -- Asociación P&ID <-> Líneas
  INSERT INTO piping.pid_lineas (tenant_id, proyecto_id, pid_id, linea_id)
  VALUES
    (v_tenant_id, v_proy_id, v_pid_101, v_linea_cw),
    (v_tenant_id, v_proy_id, v_pid_102, v_linea_pw),
    (v_tenant_id, v_proy_id, v_pid_102, v_linea_fw),
    (v_tenant_id, v_proy_id, v_pid_103, v_linea_sl),
    (v_tenant_id, v_proy_id, v_pid_103, v_linea_dr)
  ON CONFLICT (proyecto_id, pid_id, linea_id) DO NOTHING;

  -- 7. Isométricos de Construcción
  INSERT INTO piping.isometricos (tenant_id, proyecto_id, linea_id, codigo, hoja, revision_vigente, estado_documental, observacion)
  VALUES
    (v_tenant_id, v_proy_id, v_linea_cw, '03351-ISO-CW-102', '1', '0', 'VIGENTE', 'Aprobado para construcción'),
    (v_tenant_id, v_proy_id, v_linea_pw, '03351-ISO-PW-201', '1', '1', 'VIGENTE', 'Revisión por cambio de ruteo'),
    (v_tenant_id, v_proy_id, v_linea_fw, '03351-ISO-FW-305', '1', '0', 'VIGENTE', 'Línea de red húmeda'),
    (v_tenant_id, v_proy_id, v_linea_sl, '03351-ISO-SL-401', '1', '0', 'VIGENTE', 'Alimentación Espesador'),
    (v_tenant_id, v_proy_id, v_linea_dr, '03351-ISO-DR-500', '1', 'A', 'VIGENTE', 'Drenaje gravitacional')
  ON CONFLICT (proyecto_id, codigo, hoja) DO UPDATE SET observacion = EXCLUDED.observacion;

  SELECT id INTO v_iso_102 FROM piping.isometricos WHERE proyecto_id = v_proy_id AND codigo = '03351-ISO-CW-102' LIMIT 1;
  SELECT id INTO v_iso_201 FROM piping.isometricos WHERE proyecto_id = v_proy_id AND codigo = '03351-ISO-PW-201' LIMIT 1;
  SELECT id INTO v_iso_305 FROM piping.isometricos WHERE proyecto_id = v_proy_id AND codigo = '03351-ISO-FW-305' LIMIT 1;
  SELECT id INTO v_iso_401 FROM piping.isometricos WHERE proyecto_id = v_proy_id AND codigo = '03351-ISO-SL-401' LIMIT 1;
  SELECT id INTO v_iso_500 FROM piping.isometricos WHERE proyecto_id = v_proy_id AND codigo = '03351-ISO-DR-500' LIMIT 1;

  -- 8. Spools de Prefabricación
  INSERT INTO piping.spools (tenant_id, proyecto_id, isometrico_id, codigo, tag, estado_actual, ubicacion_actual)
  VALUES
    (v_tenant_id, v_proy_id, v_iso_102, 'SP-CW-102-01', 'SPOOL-CW-01', 'MONTADO', 'Nave Molienda Eje 4'),
    (v_tenant_id, v_proy_id, v_iso_102, 'SP-CW-102-02', 'SPOOL-CW-02', 'POSICIONADO', 'Nave Molienda Eje 5'),
    (v_tenant_id, v_proy_id, v_iso_201, 'SP-PW-201-01', 'SPOOL-PW-01', 'EN_PINTURA', 'Patio de Granallado'),
    (v_tenant_id, v_proy_id, v_iso_201, 'SP-PW-201-02', 'SPOOL-PW-02', 'EN_FABRICACION', 'Taller Maestranza'),
    (v_tenant_id, v_proy_id, v_iso_305, 'SP-FW-305-01', 'SPOOL-FW-01', 'MONTADO', 'Sector Subestación'),
    (v_tenant_id, v_proy_id, v_iso_401, 'SP-SL-401-01', 'SPOOL-SL-01', 'POR_MONTAR', 'Patio de Acopio Faena'),
    (v_tenant_id, v_proy_id, v_iso_500, 'SP-DR-500-01', 'SPOOL-DR-01', 'MONTADO', 'Nivel 0 Sumidero')
  ON CONFLICT (proyecto_id, isometrico_id, codigo) DO UPDATE SET estado_actual = EXCLUDED.estado_actual;

  SELECT id INTO v_sp_102_1 FROM piping.spools WHERE proyecto_id = v_proy_id AND codigo = 'SP-CW-102-01' LIMIT 1;
  SELECT id INTO v_sp_102_2 FROM piping.spools WHERE proyecto_id = v_proy_id AND codigo = 'SP-CW-102-02' LIMIT 1;
  SELECT id INTO v_sp_201_1 FROM piping.spools WHERE proyecto_id = v_proy_id AND codigo = 'SP-PW-201-01' LIMIT 1;
  SELECT id INTO v_sp_201_2 FROM piping.spools WHERE proyecto_id = v_proy_id AND codigo = 'SP-PW-201-02' LIMIT 1;
  SELECT id INTO v_sp_305_1 FROM piping.spools WHERE proyecto_id = v_proy_id AND codigo = 'SP-FW-305-01' LIMIT 1;
  SELECT id INTO v_sp_401_1 FROM piping.spools WHERE proyecto_id = v_proy_id AND codigo = 'SP-SL-401-01' LIMIT 1;
  SELECT id INTO v_sp_500_1 FROM piping.spools WHERE proyecto_id = v_proy_id AND codigo = 'SP-DR-500-01' LIMIT 1;

  -- 9. Juntas Canónicas (Vinculadas estrictamente a Isométricos y Spools)
  INSERT INTO piping.juntas (tenant_id, proyecto_id, isometrico_id, spool_id, codigo, numero_junta, tipo_union_id, nps_codigo, diametro_wdi, estado_actual, vigente)
  VALUES
    (v_tenant_id, v_proy_id, v_iso_102, v_sp_102_1, 'J001', '1', v_union_bw, '6"', 6.0, 'SOLDADO', TRUE),
    (v_tenant_id, v_proy_id, v_iso_102, v_sp_102_1, 'J002', '2', v_union_bw, '6"', 6.0, 'SOLDADO', TRUE),
    (v_tenant_id, v_proy_id, v_iso_102, v_sp_102_2, 'J003', '3', v_union_so, '6"', 6.0, 'ARMADO', TRUE),
    (v_tenant_id, v_proy_id, v_iso_102, v_sp_102_2, 'J004', '4', v_union_bw, '6"', 6.0, 'ACTIVO', TRUE),
    (v_tenant_id, v_proy_id, v_iso_102, NULL,       'J005', '5', v_union_bw, '6"', 6.0, 'ACTIVO', TRUE),
    
    (v_tenant_id, v_proy_id, v_iso_201, v_sp_201_1, 'J006', '1', v_union_bw, '8"', 8.0, 'SOLDADO', TRUE),
    (v_tenant_id, v_proy_id, v_iso_201, v_sp_201_1, 'J007', '2', v_union_bw, '8"', 8.0, 'ARMADO', TRUE),
    (v_tenant_id, v_proy_id, v_iso_201, v_sp_201_2, 'J008', '3', v_union_bw, '8"', 8.0, 'INSPECCIONADO', TRUE),
    (v_tenant_id, v_proy_id, v_iso_201, v_sp_201_2, 'J009', '4', v_union_bw, '8"', 8.0, 'APROBADO_NDT', TRUE),
    
    (v_tenant_id, v_proy_id, v_iso_305, v_sp_305_1, 'J010', '1', v_union_vic, '4"', 4.0, 'SOLDADO', TRUE),
    (v_tenant_id, v_proy_id, v_iso_305, v_sp_305_1, 'J011', '2', v_union_thd, '4"', 4.0, 'ACTIVO', TRUE),
    
    (v_tenant_id, v_proy_id, v_iso_401, v_sp_401_1, 'J012', '1', v_union_bw, '10"', 10.0, 'ARMADO', TRUE),
    (v_tenant_id, v_proy_id, v_iso_401, v_sp_401_1, 'J013', '2', v_union_bw, '10"', 10.0, 'SOLDADO', TRUE),
    
    (v_tenant_id, v_proy_id, v_iso_500, v_sp_500_1, 'J014', '1', v_union_bw, '12"', 12.0, 'INSPECCIONADO', TRUE),
    (v_tenant_id, v_proy_id, v_iso_500, v_sp_500_1, 'J015', '2', v_union_bw, '12"', 12.0, 'APROBADO_NDT', TRUE)
  ON CONFLICT (proyecto_id, codigo) DO UPDATE SET
    estado_actual = EXCLUDED.estado_actual,
    spool_id = EXCLUDED.spool_id,
    isometrico_id = EXCLUDED.isometrico_id;

  -- 10. Sincronizar en la tabla de compatibilidad plana piping.lista_juntas
  INSERT INTO piping.lista_juntas (id_proyecto, id_junta, tag, estado, vigente, fecha_sync)
  SELECT 
    '501', 
    j.codigo, 
    COALESCE(i.codigo || '-' || j.codigo, 'TAG-' || j.codigo), 
    j.estado_actual, 
    j.vigente, 
    NOW()
  FROM piping.juntas j
  LEFT JOIN piping.isometricos i ON i.id = j.isometrico_id
  WHERE j.proyecto_id = v_proy_id
  ON CONFLICT (id_proyecto, id_junta) DO UPDATE SET
    estado = EXCLUDED.estado,
    tag = EXCLUDED.tag,
    vigente = EXCLUDED.vigente,
    fecha_sync = NOW();

END $$;
