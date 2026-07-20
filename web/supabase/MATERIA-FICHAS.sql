-- Fichas por tema (una fila = un tema dentro de una materia)
CREATE TABLE IF NOT EXISTS public.materia_fichas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id UUID NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  tema_numero INTEGER NOT NULL CHECK (tema_numero > 0),
  titulo TEXT NOT NULL DEFAULT '',
  resumen_md TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (materia_id, tema_numero)
);

CREATE INDEX IF NOT EXISTS materia_fichas_materia_idx
  ON public.materia_fichas (materia_id, tema_numero);

ALTER TABLE public.materia_fichas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "materia_fichas_select_all" ON public.materia_fichas;
CREATE POLICY "materia_fichas_select_all" ON public.materia_fichas
  FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';
