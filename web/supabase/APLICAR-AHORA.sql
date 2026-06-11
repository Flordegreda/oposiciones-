-- Oposiciones JEX — esquema base (idempotente)
-- Ejecutar en Supabase SQL Editor o vía POST /api/admin/apply-schema

-- Preguntas de cada banco
CREATE TABLE IF NOT EXISTS public.preguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_id UUID NOT NULL REFERENCES public.bancos(id) ON DELETE CASCADE,
  enunciado TEXT NOT NULL,
  opciones JSONB NOT NULL DEFAULT '[]'::jsonb,
  respuesta INTEGER NOT NULL DEFAULT 0,
  explicacion TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS preguntas_banco_id_idx ON public.preguntas(banco_id);
CREATE INDEX IF NOT EXISTS preguntas_banco_orden_idx ON public.preguntas(banco_id, orden);

-- RLS (service_role las omite; anon/authenticated necesitan política)
ALTER TABLE public.preguntas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'preguntas' AND policyname = 'preguntas_read_all'
  ) THEN
    CREATE POLICY preguntas_read_all ON public.preguntas FOR SELECT USING (true);
  END IF;
END $$;

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';
