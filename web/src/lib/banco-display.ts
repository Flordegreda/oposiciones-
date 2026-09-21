/** Helpers de presentación de bancos. Sin BD ni server-only: usables en cliente y servidor. */

export function materiaNombre(
  m: { nombre: string } | { nombre: string }[] | null | undefined,
): string {
  if (!m) return "Sin materia";
  if (Array.isArray(m)) return m[0]?.nombre ?? "Sin materia";
  return m.nombre;
}

export function sortBancosByNombre<T extends { nombre: string }>(bancos: T[]): T[] {
  return [...bancos].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base", numeric: true }),
  );
}
