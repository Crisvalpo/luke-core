-- ==============================================================================
-- MIGRACIÓN 036: PERMITIR LINE_ID NULLABLE EN PIPING.VALVES Y PIPING.SUPPORTS
-- Permite la ingesta y sincronización desde Excel sin exigir que la línea esté creada
-- ==============================================================================

ALTER TABLE piping.valves ALTER COLUMN line_id DROP NOT NULL;
ALTER TABLE piping.supports ALTER COLUMN line_id DROP NOT NULL;
