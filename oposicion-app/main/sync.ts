import fs from 'node:fs'
import path from 'node:path'
import { carpetaNumero, nombreDesdeCarpeta, planRenumerar } from '../shared/classify'
import { bestMatch, tipoDeCategoria, type Matchable } from '../shared/match'
import type {
  ArchivoDisco,
  MateriaDetalle,
  RenumerarReport,
  SyncMaterialReport,
  TipoItem,
  VincularPorNombreReport,
} from '../shared/types'
import {
  compactarItems,
  getCategoriaOverride,
  getConfig,
  getMateria,
  itemsByPaths,
  itemsConStats,
  listMaterias,
  reassignCarpetas,
  refreshSinMaterialFlags,
  rewritePathPrefix,
  seedNumIndex,
  updateMateriaRuta,
  updateSeedCarpetas,
  upsertItem,
  vincularItem,
} from './db'
import {
  autoCategoria,
  listFilesRecursive,
  listSubdirs,
  toArchivoDisco,
} from './fs-ops'

export function syncRoot(rootPath: string): { emparejadas: number; sinCarpeta: number } {
  const dirs = listSubdirs(rootPath)
  const byNum = new Map<number, { path: string; name: string }>()
  for (const d of dirs) {
    const n = carpetaNumero(d.name)
    if (n != null && !byNum.has(n)) byNum.set(n, { path: d.path, name: d.name })
  }
  const materias = listMaterias()
  let emparejadas = 0
  let sinCarpeta = 0
  for (const m of materias) {
    const hit = byNum.get(m.carpeta)
    if (hit) {
      updateMateriaRuta(m.id, hit.path, nombreDesdeCarpeta(hit.name) || null)
      emparejadas += 1
    } else {
      updateMateriaRuta(m.id, null, null)
      sinCarpeta += 1
    }
  }
  return { emparejadas, sinCarpeta }
}

export function renumerarAlfabetico(rootPath: string): RenumerarReport {
  const dirs = listSubdirs(rootPath)
  const plan = planRenumerar(dirs.map((d) => d.name))
  if (plan.length === 0) {
    throw new Error('No hay carpetas numeradas en la raíz.')
  }
  const changes = plan.filter((p) => p.oldName !== p.newName)
  for (const p of plan) {
    if (p.oldName === p.newName) continue
    const tmpName = `__az_${String(p.newNum).padStart(3, '0')} ${p.title}`
    const from = path.join(rootPath, p.oldName)
    const tmp = path.join(rootPath, tmpName)
    if (!fs.existsSync(from)) throw new Error(`No existe la carpeta: ${p.oldName}`)
    fs.renameSync(from, tmp)
  }
  for (const p of plan) {
    if (p.oldName === p.newName) continue
    const tmpName = `__az_${String(p.newNum).padStart(3, '0')} ${p.title}`
    const tmp = path.join(rootPath, tmpName)
    const dest = path.join(rootPath, p.newName)
    if (fs.existsSync(dest)) throw new Error(`Ya existe: ${p.newName}`)
    fs.renameSync(tmp, dest)
  }
  for (const p of plan) {
    if (p.oldName === p.newName) continue
    rewritePathPrefix(path.join(rootPath, p.oldName), path.join(rootPath, p.newName))
  }
  reassignCarpetas(plan.map((p) => ({ from: p.oldNum, to: p.newNum })))
  try {
    updateSeedCarpetas(plan.map((p) => ({ from: p.oldNum, to: p.newNum })))
  } catch {
    /* semilla empaquetada de solo lectura */
  }
  syncRoot(rootPath)
  return {
    renombradas: changes.length,
    total: plan.length,
    mapping: plan.map((p) => ({ de: p.oldNum, a: p.newNum, nombre: p.title })),
  }
}

export function materiaDetalle(id: number): MateriaDetalle {
  const materia = getMateria(id)
  const items = itemsConStats(id)
  let archivos: ArchivoDisco[] = []
  if (materia.ruta) {
    const files = listFilesRecursive(materia.ruta)
    const filePaths = files.filter((f) => !f.isDir).map((f) => f.path)
    const linked = itemsByPaths(filePaths)
    const byPath = new Map(linked.map((it) => [it.archivo_path, it.id]))
    archivos = files.map((f) => {
      const itemId = f.isDir ? null : (byPath.get(f.path) ?? null)
      const cat = autoCategoria(f.name, getCategoriaOverride(f.path))
      return toArchivoDisco(f, cat, itemId)
    })
  }
  const compact = compactarItems(materia.carpeta, items, seedNumIndex())
  const t = compact.filter((i) => i.tipo === 'T')
  const p = compact.filter((i) => i.tipo === 'P')
  const f = compact.filter((i) => i.tipo === 'F')
  return {
    materia,
    items,
    archivos,
    nSinRegistrar: archivos.filter((a) => !a.isDir && a.sinRegistrar).length,
    nItemsSinArchivo: items.filter((i) => i.sin_archivo).length,
    nT: t.length,
    pregT: t.reduce((s, i) => s + (i.num || 0), 0),
    nP: p.length,
    pregP: p.reduce((s, i) => s + (i.num || 0), 0),
    nF: f.length,
    nFichas: f.reduce((s, i) => s + (i.num || 0), 0),
  }
}

export function vincularPorNombre(materiaId: number): VincularPorNombreReport {
  const det = materiaDetalle(materiaId)
  const libres = det.items.filter((i) => i.sin_archivo)
  const used = new Set<string>(
    det.items.filter((i) => !i.sin_archivo).map((i) => String(i.id)),
  )
  const cands: Matchable[] = libres.map((i) => ({
    id: String(i.id),
    nombre: i.nombre,
    tipo: i.tipo,
  }))
  let vinculados = 0
  const sinMatch: string[] = []
  const files = det.archivos.filter(
    (a) => !a.isDir && !a.itemId && ['teorico', 'practico', 'ficha'].includes(a.categoria),
  )
  for (const file of files) {
    const tipo = tipoDeCategoria(file.categoria)
    if (!tipo) continue
    const base = file.name.replace(/\.[^.]+$/, '')
    const hit = bestMatch(base, tipo, cands, used, 0.72)
    if (!hit) {
      sinMatch.push(file.name)
      continue
    }
    used.add(hit.id)
    vincularItem(Number(hit.id), file.path)
    vinculados += 1
  }
  return { vinculados, sinMatch }
}

export function vincularPorNombreTodas(): VincularPorNombreReport {
  let vinculados = 0
  const sinMatch: string[] = []
  for (const m of listMaterias()) {
    if (!m.ruta) continue
    const r = vincularPorNombre(m.id)
    vinculados += r.vinculados
    sinMatch.push(...r.sinMatch.map((n) => `${m.carpeta} ${n}`))
  }
  return { vinculados, sinMatch }
}

const SKIP_NAME =
  /\b(HOJA.?RESPUESTA|PROMPT|ESTRATEGIA|METODO.?DE.?PREPAR|PLANTILLA|TEMARIO.?2026)\b/i

function ignoreFile(name: string): boolean {
  const n = name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase()
  if (SKIP_NAME.test(n)) return true
  if (/^MATERIAS\.(DOCX|DOC|PDF)$/i.test(name)) return true
  return false
}

function tipoDesdeArchivo(name: string): TipoItem | null {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : ''
  if (!['.pdf', '.apkg', '.csv'].includes(ext)) return null
  if (ignoreFile(name)) return null
  const tipo = tipoDeCategoria(autoCategoria(name))
  if (tipo) return tipo
  if (ext === '.pdf') return 'T'
  return null
}

function nombreDesdeArchivo(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function relinkRutasRotas(materiaId: number): number {
  const det = materiaDetalle(materiaId)
  const libres = det.archivos.filter((a) => !a.isDir && !a.itemId)
  const byBase = new Map<string, string>()
  for (const a of libres) {
    byBase.set(a.name.toLowerCase(), a.path)
  }
  let n = 0
  for (const it of det.items) {
    if (!it.sin_archivo || !it.archivo_path) continue
    const base = path.basename(it.archivo_path).toLowerCase()
    const hit = byBase.get(base)
    if (!hit) continue
    vincularItem(it.id, hit)
    byBase.delete(base)
    n += 1
  }
  return n
}

function registrarArchivosNuevos(materiaId: number): { creados: number; omitidos: number; vinculados: number } {
  const det = materiaDetalle(materiaId)
  const existentes = new Set(
    det.items.map((i) => `${i.tipo}|${i.nombre.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()}`),
  )
  let creados = 0
  let omitidos = 0
  let vinculados = 0
  for (const file of det.archivos) {
    if (file.isDir || file.itemId) continue
    const tipo = tipoDesdeArchivo(file.name)
    if (!tipo) {
      omitidos += 1
      continue
    }
    const nombre = nombreDesdeArchivo(file.name)
    const key = `${tipo}|${nombre.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()}`
    if (existentes.has(key)) {
      const match = det.items.find(
        (i) =>
          i.tipo === tipo &&
          i.sin_archivo &&
          `${i.tipo}|${i.nombre.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()}` === key,
      )
      if (match) {
        vincularItem(match.id, file.path)
        vinculados += 1
      }
      continue
    }
    upsertItem({
      materia_id: materiaId,
      tipo,
      nombre,
      num: 0,
      estado: 'Generado',
      archivo_path: file.path,
    })
    existentes.add(key)
    creados += 1
  }
  return { creados, omitidos, vinculados }
}

/** Empareja carpetas, vincula PDF existentes y da de alta el material nuevo. */
export function syncMaterial(): SyncMaterialReport {
  const cfg = getConfig()
  if (!cfg.root_path) throw new Error('Configura primero la carpeta raíz.')
  const carpetas = syncRoot(cfg.root_path)
  let vinculados = 0
  let creados = 0
  let omitidos = 0
  for (const m of listMaterias()) {
    if (!m.ruta) continue
    vinculados += relinkRutasRotas(m.id)
    const v = vincularPorNombre(m.id)
    vinculados += v.vinculados
    const r = registrarArchivosNuevos(m.id)
    creados += r.creados
    vinculados += r.vinculados
    omitidos += r.omitidos
  }
  refreshSinMaterialFlags()
  return {
    emparejadas: carpetas.emparejadas,
    sinCarpeta: carpetas.sinCarpeta,
    vinculados,
    creados,
    omitidos,
  }
}
