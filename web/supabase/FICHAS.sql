-- Mazos de fichas tipo Anki (pregunta / respuesta)
-- Ejecutar en Supabase SQL Editor o vía POST /api/admin/apply-fichas

CREATE TABLE IF NOT EXISTS public.mazos_fichas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id UUID NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mazos_fichas_materia_id_idx ON public.mazos_fichas(materia_id);

CREATE TABLE IF NOT EXISTS public.fichas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mazo_id UUID NOT NULL REFERENCES public.mazos_fichas(id) ON DELETE CASCADE,
  frente TEXT NOT NULL,
  dorso TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fichas_mazo_id_idx ON public.fichas(mazo_id);
CREATE INDEX IF NOT EXISTS fichas_mazo_orden_idx ON public.fichas(mazo_id, orden);

ALTER TABLE public.mazos_fichas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mazos_fichas' AND policyname = 'mazos_fichas_read_all'
  ) THEN
    CREATE POLICY mazos_fichas_read_all ON public.mazos_fichas FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fichas' AND policyname = 'fichas_read_all'
  ) THEN
    CREATE POLICY fichas_read_all ON public.fichas FOR SELECT USING (true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
