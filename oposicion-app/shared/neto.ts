export function slugMateria(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
}

export function nombreConvencion(
  carpeta: number,
  nombreMateria: string,
  tipo: 'T' | 'P' | 'F' | null,
  indice: number | null,
  ext: string,
): string {
  const nn = String(carpeta).padStart(2, '0')
  const mat = slugMateria(nombreMateria)
  const suf = tipo ? `_${tipo}${indice ?? ''}` : ''
  const e = ext.startsWith('.') ? ext : ext ? `.${ext}` : ''
  return `${nn}_${mat}${suf}${e}`
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function formatPct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${n.toFixed(1).replace('.', ',')}%`
}

/** Misma fórmula que en la web: preguntas, bancos/tests y mazos. */
export function formatSumarioMaterial(s: {
  nT: number
  pregT: number
  nP: number
  pregP: number
  nF: number
  nFichas: number
}): string {
  const nf = (n: number) => n.toLocaleString('es-ES')
  const parts: string[] = []
  if (s.pregT > 0 || s.nT > 0) {
    parts.push(
      `${nf(s.pregT)} preg. teórico (${s.nT} banco${s.nT !== 1 ? 's' : ''})`,
    )
  }
  if (s.pregP > 0 || s.nP > 0) {
    parts.push(
      `${nf(s.pregP)} preg. práctico (${s.nP} banco${s.nP !== 1 ? 's' : ''})`,
    )
  }
  if (s.nFichas > 0 || s.nF > 0) {
    parts.push(`${nf(s.nFichas)} fichas (${s.nF} mazo${s.nF !== 1 ? 's' : ''})`)
  }
  return parts.length ? parts.join(' · ') : 'Sin material en el inventario'
}
