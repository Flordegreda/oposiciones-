/** Añade materias.orden sin romper instalaciones ya creadas. */
export const MATERIAS_ORDEN_SQL = `
ALTER TABLE public.materias ADD COLUMN IF NOT EXISTS orden INTEGER;
CREATE INDEX IF NOT EXISTS materias_orden_idx ON public.materias(orden);
NOTIFY pgrst, 'reload schema';
`;
