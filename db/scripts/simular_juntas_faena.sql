INSERT INTO piping.lista_juntas (id_proyecto, id_junta, tag, estado, vigente, fecha_sync, metadata)
VALUES
  ('501', 'J006', 'L-501-V006', 'SOLDADO', TRUE, NOW(), '{"cubicador": "Pedro Henriquez", "linea": "6-CW-102"}'::jsonb),
  ('501', 'J007', 'L-501-V007', 'ARMADO', TRUE, NOW(), '{"cubicador": "Pedro Henriquez", "linea": "6-CW-102"}'::jsonb),
  ('501', 'J008', 'L-501-V008', 'INSPECCIONADO', TRUE, NOW(), '{"cubicador": "Pedro Henriquez", "linea": "8-PW-201"}'::jsonb),
  ('501', 'J009', 'L-501-V009', 'APROBADO_NDT', TRUE, NOW(), '{"cubicador": "Pedro Henriquez", "linea": "8-PW-201"}'::jsonb),
  ('501', 'J010', 'L-501-V010', 'SOLDADO', TRUE, NOW(), '{"cubicador": "Pedro Henriquez", "linea": "4-FW-305"}'::jsonb),
  ('501', 'J011', 'L-501-V011', 'ACTIVO', TRUE, NOW(), '{"cubicador": "Pedro Henriquez", "linea": "4-FW-305"}'::jsonb),
  ('501', 'J012', 'L-501-V012', 'ARMADO', TRUE, NOW(), '{"cubicador": "Pedro Henriquez", "linea": "10-SL-401"}'::jsonb),
  ('501', 'J013', 'L-501-V013', 'SOLDADO', TRUE, NOW(), '{"cubicador": "Pedro Henriquez", "linea": "10-SL-401"}'::jsonb),
  ('501', 'J014', 'L-501-V014', 'INSPECCIONADO', TRUE, NOW(), '{"cubicador": "Pedro Henriquez", "linea": "12-DR-500"}'::jsonb),
  ('501', 'J015', 'L-501-V015', 'APROBADO_NDT', TRUE, NOW(), '{"cubicador": "Pedro Henriquez", "linea": "12-DR-500"}'::jsonb)
ON CONFLICT (id_proyecto, id_junta) DO UPDATE SET
  tag = EXCLUDED.tag,
  estado = EXCLUDED.estado,
  vigente = EXCLUDED.vigente,
  fecha_sync = NOW(),
  metadata = EXCLUDED.metadata;

INSERT INTO core.audit_sync (usuario_windows, proyecto_id, tabla, registros, metadata, fecha)
VALUES ('EISA\PHENRIQUEZ', '501', 'piping.lista_juntas', 10, '{"origen": "Simulacion Terreno Pedro Henriquez"}'::jsonb, NOW());
