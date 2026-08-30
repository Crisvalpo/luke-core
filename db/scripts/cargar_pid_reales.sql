-- ==============================================================================
-- CARGA REAL DE P&ID — PROYECTO 501
-- Nivel 1 de la Jerarquía Canónica: P&ID (Con Upsert Idempotente)
-- ==============================================================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_proy_id UUID;
  v_pid_id UUID;
  v_doc_id UUID;
BEGIN
  -- 1. Obtener Tenant y Proyecto Activo
  SELECT id INTO v_tenant_id FROM core.tenants WHERE slug = 'eisa' LIMIT 1;
  SELECT id INTO v_proy_id FROM core.proyectos WHERE codigo = '501' AND tenant_id = v_tenant_id LIMIT 1;

  IF v_proy_id IS NULL THEN
    RAISE EXCEPTION 'Proyecto 501 no encontrado';
  END IF;

  -- 2. Insertar/Actualizar P&IDs Reales (Idempotente)

  -- P&ID 1
  INSERT INTO piping.pid (tenant_id, proyecto_id, codigo, titulo, revision_vigente, estado_documental, metadata)
  VALUES (
    v_tenant_id, v_proy_id, 
    '4600022667-001-03350-201CA-00001', 
    'SIMBOLOGÍA Y NOMENCLATURA MECÁNICA PIPING', 
    '0', 
    'Emitido para Construcción',
    '{"archivo_pdf": "LOG_PID_MS::Archivos/PDF/PID/c2d441ff.ARCHIVO_PDF_REVISION.185700.pdf", "fecha_emision": "2026-03-05", "responsable": "Michael Vergara"}'::jsonb
  ) 
  ON CONFLICT (proyecto_id, codigo) DO UPDATE SET 
    titulo = EXCLUDED.titulo,
    revision_vigente = EXCLUDED.revision_vigente,
    estado_documental = EXCLUDED.estado_documental,
    metadata = EXCLUDED.metadata
  RETURNING id INTO v_pid_id;

  INSERT INTO documental.documentos (tenant_id, proyecto_id, tipo_documento, codigo, titulo, entidad_tipo, entidad_id)
  VALUES (v_tenant_id, v_proy_id, 'PID', '4600022667-001-03350-201CA-00001', 'SIMBOLOGÍA Y NOMENCLATURA MECÁNICA PIPING', 'PID', v_pid_id)
  ON CONFLICT (proyecto_id, tipo_documento, codigo) DO UPDATE SET titulo = EXCLUDED.titulo
  RETURNING id INTO v_doc_id;

  INSERT INTO documental.revisiones (tenant_id, proyecto_id, documento_id, revision, estado, archivo_nombre, fecha_evento)
  VALUES (v_tenant_id, v_proy_id, v_doc_id, '0', 'VIGENTE', 'c2d441ff.ARCHIVO_PDF_REVISION.185700.pdf', '2026-03-05'::timestamptz)
  ON CONFLICT (documento_id, revision) DO NOTHING;

  -- P&ID 2
  INSERT INTO piping.pid (tenant_id, proyecto_id, codigo, titulo, revision_vigente, estado_documental, metadata)
  VALUES (
    v_tenant_id, v_proy_id, 
    '4600022667-001-03350-201CA-00002', 
    'ESPESADOR DE CONCENTRADO COLECTIVO', 
    '1', 
    'Emitido para Construcción',
    '{"archivo_pdf": "LOG_PID_MS::Archivos/PDF/PID/995333f2.ARCHIVO_PDF_REVISION.185815.pdf", "fecha_emision": "2026-03-05", "responsable": "Michael Vergara"}'::jsonb
  ) 
  ON CONFLICT (proyecto_id, codigo) DO UPDATE SET 
    titulo = EXCLUDED.titulo,
    revision_vigente = EXCLUDED.revision_vigente,
    estado_documental = EXCLUDED.estado_documental,
    metadata = EXCLUDED.metadata
  RETURNING id INTO v_pid_id;

  INSERT INTO documental.documentos (tenant_id, proyecto_id, tipo_documento, codigo, titulo, entidad_tipo, entidad_id)
  VALUES (v_tenant_id, v_proy_id, 'PID', '4600022667-001-03350-201CA-00002', 'ESPESADOR DE CONCENTRADO COLECTIVO', 'PID', v_pid_id)
  ON CONFLICT (proyecto_id, tipo_documento, codigo) DO UPDATE SET titulo = EXCLUDED.titulo
  RETURNING id INTO v_doc_id;

  INSERT INTO documental.revisiones (tenant_id, proyecto_id, documento_id, revision, estado, archivo_nombre, fecha_evento)
  VALUES (v_tenant_id, v_proy_id, v_doc_id, '1', 'VIGENTE', '995333f2.ARCHIVO_PDF_REVISION.185815.pdf', '2026-03-05'::timestamptz)
  ON CONFLICT (documento_id, revision) DO NOTHING;

  -- P&ID 3
  INSERT INTO piping.pid (tenant_id, proyecto_id, codigo, titulo, revision_vigente, estado_documental, metadata)
  VALUES (
    v_tenant_id, v_proy_id, 
    '4600022667-001-03350-201CA-00003', 
    'BOMBAS UNDERFLOW ESPESADOR', 
    '1', 
    'Emitido para Construcción',
    '{"archivo_pdf": "LOG_PID_MS::Archivos/PDF/PID/79f73205.ARCHIVO_PDF_REVISION.123951.pdf", "fecha_emision": "2026-03-05", "responsable": "Michael Vergara"}'::jsonb
  ) 
  ON CONFLICT (proyecto_id, codigo) DO UPDATE SET 
    titulo = EXCLUDED.titulo,
    revision_vigente = EXCLUDED.revision_vigente,
    estado_documental = EXCLUDED.estado_documental,
    metadata = EXCLUDED.metadata
  RETURNING id INTO v_pid_id;

  INSERT INTO documental.documentos (tenant_id, proyecto_id, tipo_documento, codigo, titulo, entidad_tipo, entidad_id)
  VALUES (v_tenant_id, v_proy_id, 'PID', '4600022667-001-03350-201CA-00003', 'BOMBAS UNDERFLOW ESPESADOR', 'PID', v_pid_id)
  ON CONFLICT (proyecto_id, tipo_documento, codigo) DO UPDATE SET titulo = EXCLUDED.titulo
  RETURNING id INTO v_doc_id;

  INSERT INTO documental.revisiones (tenant_id, proyecto_id, documento_id, revision, estado, archivo_nombre, fecha_evento)
  VALUES (v_tenant_id, v_proy_id, v_doc_id, '1', 'VIGENTE', '79f73205.ARCHIVO_PDF_REVISION.123951.pdf', '2026-03-05'::timestamptz)
  ON CONFLICT (documento_id, revision) DO NOTHING;

  -- P&ID 4
  INSERT INTO piping.pid (tenant_id, proyecto_id, codigo, titulo, revision_vigente, estado_documental, metadata)
  VALUES (
    v_tenant_id, v_proy_id, 
    '4600022667-001-03350-201CA-00004', 
    'TIE-IN, CAJONES DE TRASPASO Y RETORNOS', 
    '1', 
    'Emitido para Construcción',
    '{"archivo_pdf": "LOG_PID_MS::Archivos/PDF/PID/c11f5b9a.ARCHIVO_PDF_REVISION.123920.pdf", "fecha_emision": "2026-03-05", "responsable": "Michael Vergara"}'::jsonb
  ) 
  ON CONFLICT (proyecto_id, codigo) DO UPDATE SET 
    titulo = EXCLUDED.titulo,
    revision_vigente = EXCLUDED.revision_vigente,
    estado_documental = EXCLUDED.estado_documental,
    metadata = EXCLUDED.metadata
  RETURNING id INTO v_pid_id;

  INSERT INTO documental.documentos (tenant_id, proyecto_id, tipo_documento, codigo, titulo, entidad_tipo, entidad_id)
  VALUES (v_tenant_id, v_proy_id, 'PID', '4600022667-001-03350-201CA-00004', 'TIE-IN, CAJONES DE TRASPASO Y RETORNOS', 'PID', v_pid_id)
  ON CONFLICT (proyecto_id, tipo_documento, codigo) DO UPDATE SET titulo = EXCLUDED.titulo
  RETURNING id INTO v_doc_id;

  INSERT INTO documental.revisiones (tenant_id, proyecto_id, documento_id, revision, estado, archivo_nombre, fecha_evento)
  VALUES (v_tenant_id, v_proy_id, v_doc_id, '1', 'VIGENTE', 'c11f5b9a.ARCHIVO_PDF_REVISION.123920.pdf', '2026-03-05'::timestamptz)
  ON CONFLICT (documento_id, revision) DO NOTHING;

  -- P&ID 5
  INSERT INTO piping.pid (tenant_id, proyecto_id, codigo, titulo, revision_vigente, estado_documental, metadata)
  VALUES (
    v_tenant_id, v_proy_id, 
    '4600022667-001-03350-201CA-00005', 
    'AIRE DE INSTRUMENTACIÓN', 
    '0', 
    'Emitido para Construcción',
    '{"archivo_pdf": "LOG_PID_MS::Archivos/PDF/PID/0c7397c3.ARCHIVO_PDF_REVISION.123831.pdf", "fecha_emision": "2026-03-05", "responsable": "Michael Vergara"}'::jsonb
  ) 
  ON CONFLICT (proyecto_id, codigo) DO UPDATE SET 
    titulo = EXCLUDED.titulo,
    revision_vigente = EXCLUDED.revision_vigente,
    estado_documental = EXCLUDED.estado_documental,
    metadata = EXCLUDED.metadata
  RETURNING id INTO v_pid_id;

  INSERT INTO documental.documentos (tenant_id, proyecto_id, tipo_documento, codigo, titulo, entidad_tipo, entidad_id)
  VALUES (v_tenant_id, v_proy_id, 'PID', '4600022667-001-03350-201CA-00005', 'AIRE DE INSTRUMENTACIÓN', 'PID', v_pid_id)
  ON CONFLICT (proyecto_id, tipo_documento, codigo) DO UPDATE SET titulo = EXCLUDED.titulo
  RETURNING id INTO v_doc_id;

  INSERT INTO documental.revisiones (tenant_id, proyecto_id, documento_id, revision, estado, archivo_nombre, fecha_evento)
  VALUES (v_tenant_id, v_proy_id, v_doc_id, '0', 'VIGENTE', '0c7397c3.ARCHIVO_PDF_REVISION.123831.pdf', '2026-03-05'::timestamptz)
  ON CONFLICT (documento_id, revision) DO NOTHING;

  -- P&ID 6
  INSERT INTO piping.pid (tenant_id, proyecto_id, codigo, titulo, revision_vigente, estado_documental, metadata)
  VALUES (
    v_tenant_id, v_proy_id, 
    '4600022667-001-03350-201CA-00006', 
    'SISTEMA DE PROTECIÓN CONTRA INCENDIO', 
    '0', 
    'Emitido para Construcción',
    '{"archivo_pdf": "LOG_PID_MS::Archivos/PDF/PID/600e68f4.ARCHIVO_PDF_REVISION.190518.pdf", "fecha_emision": "2026-03-05", "responsable": "Michael Vergara"}'::jsonb
  ) 
  ON CONFLICT (proyecto_id, codigo) DO UPDATE SET 
    titulo = EXCLUDED.titulo,
    revision_vigente = EXCLUDED.revision_vigente,
    estado_documental = EXCLUDED.estado_documental,
    metadata = EXCLUDED.metadata
  RETURNING id INTO v_pid_id;

  INSERT INTO documental.documentos (tenant_id, proyecto_id, tipo_documento, codigo, titulo, entidad_tipo, entidad_id)
  VALUES (v_tenant_id, v_proy_id, 'PID', '4600022667-001-03350-201CA-00006', 'SISTEMA DE PROTECIÓN CONTRA INCENDIO', 'PID', v_pid_id)
  ON CONFLICT (proyecto_id, tipo_documento, codigo) DO UPDATE SET titulo = EXCLUDED.titulo
  RETURNING id INTO v_doc_id;

  INSERT INTO documental.revisiones (tenant_id, proyecto_id, documento_id, revision, estado, archivo_nombre, fecha_evento)
  VALUES (v_tenant_id, v_proy_id, v_doc_id, '0', 'VIGENTE', '600e68f4.ARCHIVO_PDF_REVISION.190518.pdf', '2026-03-05'::timestamptz)
  ON CONFLICT (documento_id, revision) DO NOTHING;

END $$;
