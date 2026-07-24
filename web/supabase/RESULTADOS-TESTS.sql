-- Resultados de tests (persistencia híbrida IndexedDB ↔ Supabase)
-- Ejecutar en SQL Editor o vía POST /api/admin/apply-resultados
--
-- Nota: usuario_id es el ID anónimo del dispositivo (localStorage) hasta
-- que exista auth.users; entonces se puede migrar / vincular.

CREATE TABLE IF NOT EXISTS public.resultados_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  banco TEXT NOT NULL,
  test TEXT NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_preguntas INT NOT NULL,
  aciertos INT NOT NULL,
  fallos INT NOT NULL,
  tiempo_total INT,
  respuestas JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resultados_usuario
  ON public.resultados_tests (usuario_id);

CREATE INDEX IF NOT EXISTS idx_resultados_banco
  ON public.resultados_tests (usuario_id, banco);

CREATE INDEX IF NOT EXISTS idx_resultados_usuario_banco_fecha
  ON public.resultados_tests (usuario_id, banco, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_resultados_fecha
  ON public.resultados_tests (fecha DESC);

CREATE INDEX IF NOT EXISTS idx_resultados_updated
  ON public.resultados_tests (usuario_id, updated_at DESC);

ALTER TABLE public.resultados_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resultados_tests_all ON public.resultados_tests;
-- Acceso vía service_role desde la API; política amplia para lectura anon si hace falta.
CREATE POLICY resultados_tests_all ON public.resultados_tests
  FOR ALL USING (true) WITH CHECK (true);

-- Vista materializada: % aciertos, totales y tiempo medio por banco
DROP MATERIALIZED VIEW IF EXISTS public.estadisticas_usuario;
CREATE MATERIALIZED VIEW public.estadisticas_usuario AS
SELECT
  usuario_id,
  banco,
  COUNT(*)::bigint AS total_tests,
  SUM(aciertos)::bigint AS total_aciertos,
  SUM(fallos)::bigint AS total_fallos,
  CASE
    WHEN SUM(total_preguntas) > 0
    THEN SUM(aciertos)::float / SUM(total_preguntas)::float
    ELSE 0
  END AS porcentaje_aciertos,
  AVG(tiempo_total)::float AS tiempo_promedio,
  MAX(fecha) AS ultimo_test
FROM public.resultados_tests
GROUP BY usuario_id, banco;

CREATE UNIQUE INDEX IF NOT EXISTS idx_estadisticas_usuario_pk
  ON public.estadisticas_usuario (usuario_id, banco);

-- Evolución diaria (vista materializada auxiliar)
DROP MATERIALIZED VIEW IF EXISTS public.estadisticas_usuario_diarias;
CREATE MATERIALIZED VIEW public.estadisticas_usuario_diarias AS
SELECT
  usuario_id,
  (fecha AT TIME ZONE 'UTC')::date AS dia,
  COUNT(*)::bigint AS total_tests,
  SUM(aciertos)::bigint AS total_aciertos,
  SUM(fallos)::bigint AS total_fallos,
  AVG(tiempo_total)::float AS tiempo_promedio
FROM public.resultados_tests
GROUP BY usuario_id, (fecha AT TIME ZONE 'UTC')::date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_estadisticas_usuario_diarias_pk
  ON public.estadisticas_usuario_diarias (usuario_id, dia);

CREATE OR REPLACE FUNCTION public.refresh_estadisticas_usuario()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.estadisticas_usuario;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.estadisticas_usuario_diarias;
EXCEPTION
  WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW public.estadisticas_usuario;
    REFRESH MATERIALIZED VIEW public.estadisticas_usuario_diarias;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_estadisticas_usuario() TO anon, authenticated, service_role;
GRANT SELECT ON public.estadisticas_usuario TO anon, authenticated, service_role;
GRANT SELECT ON public.estadisticas_usuario_diarias TO anon, authenticated, service_role;
GRANT ALL ON public.resultados_tests TO service_role, authenticator;

NOTIFY pgrst, 'reload schema';
