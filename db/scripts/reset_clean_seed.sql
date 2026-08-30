-- RESET Y SEED DE PRUEBAS LIMPIAS
TRUNCATE TABLE piping.lista_juntas CASCADE;
TRUNCATE TABLE core.solicitudes_acceso CASCADE;
TRUNCATE TABLE core.auth_otps CASCADE;
TRUNCATE TABLE core.audit_sync CASCADE;
TRUNCATE TABLE core.personal_proyectos CASCADE;
DELETE FROM core.personal;
DELETE FROM core.proyectos;
DELETE FROM core.tenants;

-- 1. Crear Empresa EISA
INSERT INTO core.tenants (id, slug, razon_social, rut, config, activo)
VALUES (
  'ee7f5fde-ed44-41ca-bf99-d2be31e5be61',
  'eisa',
  'EISA Montajes Industriales',
  '76123456-7',
  '{"admin_whatsapp": "+56935264052"}'::jsonb,
  TRUE
);

-- 2. Crear Proyectos 501 y 413
INSERT INTO core.proyectos (id, tenant_id, codigo, nombre, centro_costo, ubicacion, activo)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'ee7f5fde-ed44-41ca-bf99-d2be31e5be61', '501', 'Faena Minera 501 - Piping', 'CC-501', 'Antofagasta', TRUE),
  ('22222222-2222-2222-2222-222222222222', 'ee7f5fde-ed44-41ca-bf99-d2be31e5be61', '413', 'Proyecto Andina 413', 'CC-413', 'Los Andes', TRUE);

-- 3. Crear Administrador Principal (Recibe solicitudes)
INSERT INTO core.personal (
  id, tenant_id, rut, nombre_completo, cargo, rol_organizacional, telefono_whatsapp, email, activo
)
VALUES (
  '803156e1-f14d-4a05-8e1b-f81a2ace5274',
  'ee7f5fde-ed44-41ca-bf99-d2be31e5be61',
  '15717681-1',
  'Cristian Luke (Admin)',
  'Administrador General',
  'super_admin',
  '+56935264052',
  'cristianluke@gmail.com',
  TRUE
);
