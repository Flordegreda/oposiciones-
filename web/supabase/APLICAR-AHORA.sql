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

-- Conteo rápido por banco (Material / temario)
CREATE OR REPLACE FUNCTION public.preguntas_counts_by_banco()
RETURNS TABLE(banco_id uuid, cnt bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT banco_id, count(*)::bigint FROM preguntas GROUP BY banco_id;
$$;

GRANT EXECUTE ON FUNCTION public.preguntas_counts_by_banco() TO anon, authenticated, service_role;

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';
