-- Conteo rápido de preguntas por banco (1 consulta en lugar de paginar toda la tabla).
-- Ejecutar en Supabase SQL Editor. La app funciona sin esto (usa plan B), pero va mucho más rápido.

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
