-- Migración opcional: seguimiento de intentos / fallos para repaso

CREATE TABLE IF NOT EXISTS public.intentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_id UUID NOT NULL REFERENCES public.bancos(id) ON DELETE CASCADE,
  pregunta_id UUID NOT NULL REFERENCES public.preguntas(id) ON DELETE CASCADE,
  correcta BOOLEAN NOT NULL,
  dudosa BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS intentos_banco_id_idx ON public.intentos(banco_id);
CREATE INDEX IF NOT EXISTS intentos_pregunta_id_idx ON public.intentos(pregunta_id);

ALTER TABLE public.intentos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'intentos' AND policyname = 'intentos_all'
  ) THEN
    CREATE POLICY intentos_all ON public.intentos FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
