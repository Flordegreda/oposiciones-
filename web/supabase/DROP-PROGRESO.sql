-- Revertir sincronización de progreso por pregunta (progreso_preguntas)
-- NO toca resultados_tests ni otras tablas.
-- Ejecutar en Supabase SQL Editor si aplicaste PROGRESO.sql

DROP TRIGGER IF EXISTS update_progreso_preguntas_updated_at ON public.progreso_preguntas;

DROP POLICY IF EXISTS progreso_select_own ON public.progreso_preguntas;
DROP POLICY IF EXISTS progreso_insert_own ON public.progreso_preguntas;
DROP POLICY IF EXISTS progreso_update_own ON public.progreso_preguntas;
DROP POLICY IF EXISTS progreso_delete_own ON public.progreso_preguntas;

DROP TABLE IF EXISTS public.progreso_preguntas;

DROP FUNCTION IF EXISTS public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
