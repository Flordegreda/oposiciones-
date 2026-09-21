import { normMatch, tipoFromWeb } from './classify'
import type { TipoItem } from './types'

const RUIDO =
  /\b(TEORICO|TEORICA|PRACTICO|PRACTICA|PARTE|TEST|FICHA|FICHAS|ENCADENADO|ENCADENADA|SUPUESTO|GENERAL)\b/g

export function stripNoise(s: string): string {
  return normMatch(s).replace(RUIDO, ' ').replace(/\b\d+\b/g, ' ').replace(/\s+/g, ' ').trim()
}

export function extractNums(s: string): number[] {
  return [...normMatch(s).matchAll(/\d+/g)].map((m) => Number(m[0]))
}

export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  const prev = new Array<number>(n + 1)
  const cur = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    cur[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j]
  }
  return prev[n]
}

export function similarity(a: string, b: string): number {
  if (!a && !b) return 1
  if (!a || !b) return 0
  if (a === b) return 1
  const d = levenshtein(a, b)
  return 1 - d / Math.max(a.length, b.length)
}

export function scoreNombre(query: string, candidate: string): number {
  const q = normMatch(query)
  const c = normMatch(candidate)
  if (q === c) return 1
  const qs = stripNoise(query)
  const cs = stripNoise(candidate)
  let s = Math.max(similarity(q, c), similarity(qs, cs) * 0.96)
  const qn = extractNums(query)
  const cn = extractNums(candidate)
  if (qn.length && cn.length) {
    const same = qn.some((n) => cn.includes(n))
    s += same ? 0.08 : -0.25
  }
  if (q.includes(c) || c.includes(q)) s = Math.max(s, 0.88)
  return Math.min(1, Math.max(0, s))
}

export type Matchable = { id: string; nombre: string; tipo: TipoItem }

export function bestMatch(
  query: string,
  tipo: TipoItem,
  candidates: Matchable[],
  used: Set<string>,
  minScore = 0.78,
): Matchable | undefined {
  let best: Matchable | undefined
  let bestScore = minScore
  for (const cand of candidates) {
    if (cand.tipo !== tipo) continue
    if (used.has(cand.id)) continue
    const s = scoreNombre(query, cand.nombre)
    if (s > bestScore) {
      bestScore = s
      best = cand
    }
  }
  return best
}

export function tipoDeCategoria(cat: string): TipoItem | null {
  if (cat === 'teorico') return 'T'
  if (cat === 'practico') return 'P'
  if (cat === 'ficha') return 'F'
  return tipoFromWeb(cat)
}
