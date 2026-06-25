-- Progreso de repaso: fallos/aciertos por pregunta (sync entre dispositivos)
-- Si existía un esquema antiguo incompatible, se recrea (sin datos útiles previos).

DROP TABLE IF EXISTS public.intentos CASCADE;

CREATE TABLE public.intentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_id UUID NOT NULL REFERENCES public.bancos(id) ON DELETE CASCADE,
  pregunta_id UUID NOT NULL REFERENCES public.preguntas(id) ON DELETE CASCADE,
  correcta BOOLEAN NOT NULL,
  dudosa BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX intentos_banco_id_idx ON public.intentos(banco_id);
CREATE INDEX intentos_pregunta_id_idx ON public.intentos(pregunta_id);
CREATE INDEX intentos_created_at_idx ON public.intentos(created_at DESC);

ALTER TABLE public.intentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intentos_all ON public.intentos;
CREATE POLICY intentos_all ON public.intentos FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
