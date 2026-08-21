-- Orden de carpetas del temario (01 ABOGACIA, 03 ADMINISTRACION LOCAL, …)
ALTER TABLE public.materias ADD COLUMN IF NOT EXISTS orden INTEGER;
CREATE INDEX IF NOT EXISTS materias_orden_idx ON public.materias(orden);
NOTIFY pgrst, 'reload schema';
