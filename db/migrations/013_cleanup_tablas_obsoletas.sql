-- ==============================================================================
-- MIGRACIÓN 013: LIMPIEZA DE TABLAS OBSOLETAS
-- ==============================================================================

-- 1. Eliminar core.usuarios_excel_proyectos (reemplazada por core.personal_proyectos)
DROP TABLE IF EXISTS core.usuarios_excel_proyectos CASCADE;

-- 2. Eliminar core.usuarios_excel (reemplazada por core.personal)
DROP TABLE IF EXISTS core.usuarios_excel CASCADE;

-- 3. Eliminar core.lista_juntas (reemplazada por piping.lista_juntas)
DROP TABLE IF EXISTS core.lista_juntas CASCADE;

-- 4. Eliminar core.excel_test si existe
DROP TABLE IF EXISTS core.excel_test CASCADE;
