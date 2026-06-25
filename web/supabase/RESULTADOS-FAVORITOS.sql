-- Historial de tests/simulacros + favoritos en la nube

CREATE TABLE IF NOT EXISTS public.resultados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('banco', 'simulacro', 'repaso', 'fallos', 'favoritos')),
  titulo TEXT NOT NULL,
  banco_id UUID REFERENCES public.bancos(id) ON DELETE SET NULL,
  total INT NOT NULL,
  respondidas INT NOT NULL,
  correctas INT NOT NULL,
  incorrectas INT NOT NULL,
  sin_responder INT NOT NULL,
  nota NUMERIC(8, 2) NOT NULL,
  porcentaje INT NOT NULL,
  tiempo_segundos INT,
  exam_mode BOOLEAN NOT NULL DEFAULT false,
  detalle JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resultados_created_at_idx ON public.resultados(created_at DESC);
CREATE INDEX IF NOT EXISTS resultados_tipo_idx ON public.resultados(tipo);

CREATE TABLE IF NOT EXISTS public.favoritos (
  banco_id UUID NOT NULL REFERENCES public.bancos(id) ON DELETE CASCADE,
  pregunta_id UUID NOT NULL REFERENCES public.preguntas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (banco_id, pregunta_id)
);

ALTER TABLE public.resultados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resultados_all ON public.resultados;
CREATE POLICY resultados_all ON public.resultados FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS favoritos_all ON public.favoritos;
CREATE POLICY favoritos_all ON public.favoritos FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
