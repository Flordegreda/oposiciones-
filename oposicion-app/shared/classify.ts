import type { CategoriaArchivo } from './types'

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
}

export function classifyFilename(filename: string): CategoriaArchivo {
  const ext = filename.includes('.')
    ? filename.slice(filename.lastIndexOf('.')).toLowerCase()
    : ''
  const n = norm(filename)

  if (n.includes('TEMA') || n.includes('LEY')) return 'tema-ley'
  if (n.includes('ESQUEMA') || n.includes('RESUMEN')) return 'esquema-resumen'
  if (n.includes('PRACTIC') || n.includes('ENCADENAD') || n.includes('SUPUESTO')) {
    return 'practico'
  }
  if (
    n.includes('TEST') ||
    n.includes('TEORIC') ||
    n.includes('TEO_') ||
    n.includes('_TEO') ||
    n.includes('PREG')
  ) {
    return 'teorico'
  }
  if (n.includes('FICHA') || ext === '.apkg' || ext === '.csv') return 'ficha'
  return 'otro'
}

export function carpetaNumero(nombre: string): number | null {
  const m = nombre.trim().match(/^(\d+)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

/** Texto de la carpeta de disco, sin el número inicial. */
export function nombreDesdeCarpeta(dirName: string): string {
  return dirName
    .trim()
    .replace(/^__az_\d+\s+/, '')
    .replace(/^\d+[.\-_)]*\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function padCarpeta(n: number, total = 32): string {
  const w = Math.max(2, String(total).length)
  return String(n).padStart(w, '0')
}

export interface PasoRenumerar {
  oldName: string
  oldNum: number
  title: string
  newNum: number
  newName: string
}

/** Orden A–Z (español, sin acentos) y números 01, 02… para el Explorador. */
export function planRenumerar(dirNames: string[]): PasoRenumerar[] {
  const rows: Array<{ oldName: string; oldNum: number; title: string }> = []
  const seen = new Set<number>()
  for (const name of dirNames) {
    if (name.startsWith('.') || name.startsWith('__az_')) continue
    const num = carpetaNumero(name)
    const title = nombreDesdeCarpeta(name)
    if (num == null || !title) continue
    if (seen.has(num)) {
      throw new Error(`Hay dos carpetas con el número ${num}.`)
    }
    seen.add(num)
    rows.push({ oldName: name, oldNum: num, title })
  }
  rows.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base', numeric: true }))
  const pad = Math.max(2, String(rows.length).length)
  return rows.map((r, i) => {
    const newNum = i + 1
    return {
      ...r,
      newNum,
      newName: `${String(newNum).padStart(pad, '0')} ${r.title}`,
    }
  })
}

/** Nombre visible: carpeta de disco si existe, si no el de la semilla. */
export function nombreMateria(m: { nombre: string; nombre_carpeta?: string | null }): string {
  const n = (m.nombre_carpeta ?? '').trim()
  return n || m.nombre
}

/** Nombre comparable: mayúsculas, sin acentos, espacios colapsados. */
export function normMatch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/** Quita el sufijo de mazo partido de Anki: «EBEP 1 (2/3)» → «EBEP 1». */
export function baseNombreMazo(nombre: string): string {
  return nombre.replace(/\s*\(\d+\s*\/\s*\d+\)\s*$/, '').trim()
}

export function tipoFromWeb(tipo: string): 'T' | 'P' | null {
  const n = normMatch(tipo)
  if (n === 'T' || n.startsWith('TEORIC')) return 'T'
  if (n === 'P' || n.startsWith('PRACTIC')) return 'P'
  return null
}
