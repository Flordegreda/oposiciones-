-- Supuestos prácticos: caso compartido + preguntas agrupadas

CREATE TABLE IF NOT EXISTS public.supuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_id UUID NOT NULL REFERENCES public.bancos(id) ON DELETE CASCADE,
  titulo TEXT,
  texto TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.preguntas
  ADD COLUMN IF NOT EXISTS supuesto_id UUID REFERENCES public.supuestos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS supuestos_banco_orden_idx ON public.supuestos(banco_id, orden);
CREATE INDEX IF NOT EXISTS preguntas_supuesto_id_idx ON public.preguntas(supuesto_id);

ALTER TABLE public.supuestos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supuestos_all ON public.supuestos;
CREATE POLICY supuestos_all ON public.supuestos FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
