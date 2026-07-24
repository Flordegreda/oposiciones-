-- Eliminar tablas y vistas de estadísticas / resultados de tests
-- NO toca preguntas, bancos, fichas ni progreso_preguntas (usa DROP-PROGRESO.sql aparte).

DROP MATERIALIZED VIEW IF EXISTS public.estadisticas_usuario_diarias;
DROP MATERIALIZED VIEW IF EXISTS public.estadisticas_usuario;

DROP FUNCTION IF EXISTS public.refresh_estadisticas_usuario();

DROP TABLE IF EXISTS public.resultados_tests CASCADE;

NOTIFY pgrst, 'reload schema';
