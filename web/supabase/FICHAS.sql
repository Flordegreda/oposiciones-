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

-- RLS: lectura + escritura (service_role las omite; anon necesita política explícita)
DROP POLICY IF EXISTS mazos_fichas_read_all ON public.mazos_fichas;
DROP POLICY IF EXISTS fichas_read_all ON public.fichas;
DROP POLICY IF EXISTS mazos_fichas_all ON public.mazos_fichas;
DROP POLICY IF EXISTS fichas_all ON public.fichas;

CREATE POLICY mazos_fichas_all ON public.mazos_fichas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY fichas_all ON public.fichas FOR ALL USING (true) WITH CHECK (true);

-- 1 consulta en lugar de un COUNT por mazo. La app tiene plan B si falta.
CREATE OR REPLACE FUNCTION public.fichas_counts_by_mazo()
RETURNS TABLE(mazo_id uuid, cnt bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mazo_id, count(*)::bigint FROM fichas GROUP BY mazo_id;
$$;

GRANT EXECUTE ON FUNCTION public.fichas_counts_by_mazo() TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
