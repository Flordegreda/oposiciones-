-- Resúmenes PDF (varios por materia, tablet/PC)
-- Ejecutar en Supabase SQL Editor o vía POST /api/admin/apply-resumenes

CREATE TABLE IF NOT EXISTS public.materia_resumenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id UUID NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS materia_resumenes_materia_id_idx ON public.materia_resumenes(materia_id);

-- Migración desde esquema v1 (un PDF por materia, PK = materia_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'materia_resumenes' AND column_name = 'materia_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'materia_resumenes' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.materia_resumenes ADD COLUMN id UUID DEFAULT gen_random_uuid();
    UPDATE public.materia_resumenes SET id = gen_random_uuid() WHERE id IS NULL;
    ALTER TABLE public.materia_resumenes ADD COLUMN IF NOT EXISTS titulo TEXT;
    UPDATE public.materia_resumenes SET titulo = COALESCE(filename, 'Resumen') WHERE titulo IS NULL;
    ALTER TABLE public.materia_resumenes ALTER COLUMN titulo SET NOT NULL;
    ALTER TABLE public.materia_resumenes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.materia_resumenes DROP CONSTRAINT IF EXISTS materia_resumenes_pkey;
    ALTER TABLE public.materia_resumenes ALTER COLUMN id SET NOT NULL;
    ALTER TABLE public.materia_resumenes ADD PRIMARY KEY (id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'materia_resumenes' AND column_name = 'id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'materia_resumenes' AND column_name = 'titulo'
  ) THEN
    ALTER TABLE public.materia_resumenes ADD COLUMN titulo TEXT;
    UPDATE public.materia_resumenes SET titulo = filename WHERE titulo IS NULL;
    ALTER TABLE public.materia_resumenes ALTER COLUMN titulo SET NOT NULL;
  END IF;
END $$;

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
