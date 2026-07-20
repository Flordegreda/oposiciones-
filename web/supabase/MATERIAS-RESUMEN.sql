-- Resúmenes / fichas por materia (Markdown)
ALTER TABLE public.materias ADD COLUMN IF NOT EXISTS resumen_md TEXT;

NOTIFY pgrst, 'reload schema';
