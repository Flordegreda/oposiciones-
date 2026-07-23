-- Cola ligera de falladas/dudosas (por dispositivo, sin login)
-- Ejecutar en Supabase SQL Editor o vía POST /api/admin/apply-falladas

CREATE TABLE IF NOT EXISTS public.cola_repaso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispositivo_id TEXT NOT NULL,
  pregunta_id UUID NOT NULL REFERENCES public.preguntas(id) ON DELETE CASCADE,
  banco_id UUID REFERENCES public.bancos(id) ON DELETE SET NULL,
  motivo TEXT NOT NULL DEFAULT 'fallada'
    CHECK (motivo IN ('fallada', 'dudosa')),
  veces INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dispositivo_id, pregunta_id)
);

CREATE INDEX IF NOT EXISTS cola_repaso_dispositivo_updated_idx
  ON public.cola_repaso (dispositivo_id, updated_at DESC);

ALTER TABLE public.cola_repaso ENABLE ROW LEVEL SECURITY;

-- Sin políticas públicas: solo service role (API del servidor).

NOTIFY pgrst, 'reload schema';
