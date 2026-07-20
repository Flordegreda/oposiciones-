-- Esquema base (antes de APLICAR-AHORA.sql y resto de migraciones)

CREATE TABLE IF NOT EXISTS public.lineas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.materias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  resumen_md TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bancos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'teorico',
  materia_id UUID NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  linea_id UUID REFERENCES public.lineas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bancos_materia_id_idx ON public.bancos(materia_id);
CREATE INDEX IF NOT EXISTS bancos_linea_id_idx ON public.bancos(linea_id);

ALTER TABLE public.lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lineas' AND policyname = 'lineas_all') THEN
    CREATE POLICY lineas_all ON public.lineas FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'materias' AND policyname = 'materias_all') THEN
    CREATE POLICY materias_all ON public.materias FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bancos' AND policyname = 'bancos_all') THEN
    CREATE POLICY bancos_all ON public.bancos FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role, authenticator;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role, authenticator;

INSERT INTO public.lineas (slug, nombre)
VALUES ('jex', 'Jurídica JEX')
ON CONFLICT (slug) DO NOTHING;
