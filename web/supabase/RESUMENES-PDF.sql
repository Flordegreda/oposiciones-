-- Resúmenes PDF por materia (tablet/PC)
-- Ejecutar en Supabase SQL Editor o vía POST /api/admin/apply-resumenes

CREATE TABLE IF NOT EXISTS public.materia_resumenes (
  materia_id UUID PRIMARY KEY REFERENCES public.materias(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.materia_resumenes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'materia_resumenes' AND policyname = 'materia_resumenes_read_all'
  ) THEN
    CREATE POLICY materia_resumenes_read_all ON public.materia_resumenes FOR SELECT USING (true);
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'materia-resumenes',
  'materia-resumenes',
  true,
  52428800,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'materia_resumenes_public_read'
  ) THEN
    CREATE POLICY materia_resumenes_public_read ON storage.objects
      FOR SELECT
      USING (bucket_id = 'materia-resumenes');
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
