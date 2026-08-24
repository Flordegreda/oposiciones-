-- Conteo rápido de fichas por mazo (1 consulta).
-- También se aplica con «Actualizar esquema fichas» en Material.
-- La app funciona sin esto (pagina mazo_id), pero va más rápido.

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
