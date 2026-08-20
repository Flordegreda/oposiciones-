/** Máximo de fichas por mazo antes de dividir automáticamente. */
export const FICHAS_MAX_POR_MAZO = 50;

export function needsMazoSplit(count: number): boolean {
  return count > FICHAS_MAX_POR_MAZO;
}

export function mazoCountForFichas(count: number): number {
  if (count <= FICHAS_MAX_POR_MAZO) return 1;
  return Math.ceil(count / FICHAS_MAX_POR_MAZO);
}

/** Reparte en trozos de como mucho `maxPerChunk`, repartiendo de forma equilibrada. */
export function splitIntoChunks<T>(items: T[], maxPerChunk = FICHAS_MAX_POR_MAZO): T[][] {
  if (items.length <= maxPerChunk) return [items];

  const numChunks = Math.ceil(items.length / maxPerChunk);
  const chunkSize = Math.ceil(items.length / numChunks);
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  return chunks;
}

export function mazoNombreParte(baseNombre: string, parte: number, total: number): string {
  const base = baseMazoNombre(baseNombre);
  if (total <= 1) return base;
  return `${base} (${parte}/${total})`;
}

/** Quita sufijo « (2/3) » para renombrar al dividir de nuevo. */
export function baseMazoNombre(nombre: string): string {
  return nombre.replace(/\s*\(\d+\/\d+\)\s*$/, "").trim() || nombre.trim();
}

export function describeMazoSplit(count: number): { numMazos: number; sizes: number[] } {
  const sizes = splitIntoChunks(Array.from({ length: count }, (_, i) => i)).map((c) => c.length);
  return { numMazos: sizes.length, sizes };
}

export function splitForAppend<T>(
  existingCount: number,
  newItems: T[],
  maxPerChunk = FICHAS_MAX_POR_MAZO,
): { appendToExisting: T[]; newMazos: T[][] } {
  const room = Math.max(0, maxPerChunk - existingCount);
  const appendToExisting = newItems.slice(0, room);
  const overflow = newItems.slice(room);
  const newMazos = splitIntoChunks(overflow, maxPerChunk);
  return { appendToExisting, newMazos };
}
