-- Revertir sincronización de progreso por pregunta (progreso_preguntas)
-- NO toca resultados_tests ni otras tablas.
-- Ejecutar en Supabase SQL Editor si aplicaste PROGRESO.sql

DROP TABLE IF EXISTS public.progreso_preguntas CASCADE;

DROP FUNCTION IF EXISTS public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
