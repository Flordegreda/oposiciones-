import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import Database from 'better-sqlite3'
import { baseNombreMazo, normMatch } from '../shared/classify'
import type {
  Config,
  DashboardData,
  Item,
  ItemConStats,
  Materia,
  MateriaCard,
  ResumenData,
  ResumenFila,
  ResumenItem,
  SeedFile,
  TipoItem,
} from '../shared/types'
import { DEFAULT_ROOT } from '../shared/types'
import { countFiles, rootExists } from './fs-ops'

let db: Database.Database | undefined

function seedFilePath(): string {
  const candidates = [
    path.join(process.cwd(), 'seed_materias.json'),
    path.join(__dirname, '../../seed_materias.json'),
    path.join(__dirname, '../../../seed_materias.json'),
    path.join(app.getAppPath(), 'seed_materias.json'),
    path.join(app.getAppPath(), '..', '..', 'seed_materias.json'),
    path.join(process.resourcesPath, 'seed_materias.json'),
  ]
  const found = candidates.find((p) => fs.existsSync(p))
  if (!found) {
    throw new Error(
      `No se encontró seed_materias.json. Buscado en:\n${candidates.join('\n')}`,
    )
  }
  return found
}

export function dbPath(): string {
  return path.join(app.getPath('userData'), 'datos.db')
}

export function openDb(): Database.Database {
  if (db) return db
  const instance = new Database(dbPath())
  instance.pragma('journal_mode = WAL')
  instance.pragma('foreign_keys = ON')
  db = instance
  try {
    migrate()
    seedIfEmpty()
    rellenarNumsDesdeSeed()
  } catch (err) {
    try {
      instance.close()
    } catch {
      /* ignore */
    }
    db = undefined
    throw err
  }
  return db
}

function migrate(): void {
  if (!db) throw new Error('Base de datos no inicializada.')
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      root_path TEXT,
      penal_factor REAL DEFAULT 3
    );
    CREATE TABLE IF NOT EXISTS materias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      carpeta INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      ruta TEXT,
      sin_material INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      materia_id INTEGER NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      nombre TEXT NOT NULL,
      num INTEGER NOT NULL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'Pendiente',
      archivo_path TEXT,
      notas TEXT
    );
    CREATE TABLE IF NOT EXISTS intentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      fecha TEXT NOT NULL,
      aciertos INTEGER NOT NULL,
      fallos INTEGER NOT NULL,
      blanco INTEGER NOT NULL,
      neto_pct REAL
    );
    CREATE TABLE IF NOT EXISTS archivo_cats (
      path TEXT PRIMARY KEY,
      categoria TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS web_intentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      fecha TEXT NOT NULL,
      aciertos INTEGER NOT NULL,
      fallos INTEGER NOT NULL,
      blanco INTEGER NOT NULL,
      neto_pct REAL
    );
  `)
  const row = db.prepare('SELECT id FROM config WHERE id = 1').get()
  if (!row) {
    db.prepare(
      `INSERT INTO config (id, root_path, penal_factor) VALUES (1, ?, 3)`,
    ).run(DEFAULT_ROOT)
  }
  ensureColumn('materias', 'nombre_carpeta', 'TEXT')
}

function ensureColumn(table: string, column: string, spec: string): void {
  if (!db) return
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (cols.some((c) => c.name === column)) return
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${spec}`)
}

function loadSeed(): void {
  const seedPath = seedFilePath()
  const raw = fs.readFileSync(seedPath, 'utf8')
  const seed = JSON.parse(raw) as SeedFile
  if (!Array.isArray(seed.materias) || seed.materias.length === 0) {
    throw new Error(`La semilla no contiene materias: ${seedPath}`)
  }
  const insertM = db.prepare(
    `INSERT INTO materias (carpeta, nombre, ruta, sin_material) VALUES (?, ?, NULL, ?)`,
  )
  const insertI = db.prepare(
    `INSERT INTO items (materia_id, tipo, nombre, num, estado, archivo_path, notas)
     VALUES (?, ?, ?, ?, ?, NULL, NULL)`,
  )
  const tx = db.transaction(() => {
    if (seed.meta?.penal_factor) {
      db.prepare('UPDATE config SET penal_factor = ? WHERE id = 1').run(
        seed.meta.penal_factor,
      )
    }
    for (const m of seed.materias) {
      const info = insertM.run(m.carpeta, m.nombre, m.sin_material ? 1 : 0)
      const materiaId = Number(info.lastInsertRowid)
      if (m.sin_material) continue
      for (const it of m.items ?? []) {
        insertI.run(materiaId, it.tipo, it.nombre, it.num, it.estado)
      }
    }
  })
  tx()
}

function seedIfEmpty(): void {
  const count = Number(db.prepare('SELECT COUNT(*) AS n FROM materias').pluck().get() ?? 0)
  if (count === 0) loadSeed()
}

export function seedNumIndex(): Map<string, number> {
  const seed = JSON.parse(fs.readFileSync(seedFilePath(), 'utf8')) as SeedFile
  const map = new Map<string, number>()
  for (const m of seed.materias) {
    for (const it of m.items ?? []) {
      if (!it.num) continue
      map.set(`${m.carpeta}|${it.tipo}|${normMatch(it.nombre)}`, it.num)
    }
  }
  return map
}

/** Completa ítems con num=0 usando la semilla (mismo nombre, no fragmentos Anki). */
export function rellenarNumsDesdeSeed(): void {
  if (!db) return
  const idx = seedNumIndex()
  const rows = db
    .prepare(
      `SELECT items.id, items.tipo, items.nombre, items.num, materias.carpeta
       FROM items JOIN materias ON materias.id = items.materia_id
       WHERE items.num IS NULL OR items.num = 0`,
    )
    .all() as Array<{
    id: number
    tipo: string
    nombre: string
    num: number
    carpeta: number
  }>
  const upd = db.prepare('UPDATE items SET num = ? WHERE id = ?')
  const tx = db.transaction(() => {
    for (const r of rows) {
      const n = idx.get(`${r.carpeta}|${r.tipo}|${normMatch(r.nombre)}`)
      if (n) upd.run(n, r.id)
    }
  })
  tx()
}

export function compactarItems(
  carpeta: number,
  items: Array<{ tipo: TipoItem; nombre: string; num: number }>,
  seedIdx = seedNumIndex(),
): ResumenItem[] {
  const groups = new Map<string, typeof items>()
  for (const it of items) {
    const key = `${it.tipo}|${normMatch(baseNombreMazo(it.nombre))}`
    const arr = groups.get(key) ?? []
    arr.push(it)
    groups.set(key, arr)
  }
  const out: ResumenItem[] = []
  for (const group of groups.values()) {
    const tipo = group[0].tipo
    const nombre = baseNombreMazo(group[0].nombre)
    const fromItems = Math.max(0, ...group.map((i) => i.num || 0))
    const fromSeed = seedIdx.get(`${carpeta}|${tipo}|${normMatch(nombre)}`) ?? 0
    out.push({ tipo, nombre, num: fromItems || fromSeed })
  }
  out.sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre, 'es'))
  return out
}

export function getConfig(): Config {
  const row = db.prepare('SELECT id, root_path FROM config WHERE id = 1').get() as {
    id: 1
    root_path: string | null
  }
  return {
    id: 1,
    root_path: row.root_path || '',
  }
}

export function setRootPath(rootPath: string): Config {
  db.prepare('UPDATE config SET root_path = ? WHERE id = 1').run(rootPath)
  return getConfig()
}

export function reloadSeed(): void {
  const tx = db.transaction(() => {
    db.exec('DELETE FROM web_intentos')
    db.exec('DELETE FROM intentos')
    db.exec('DELETE FROM items')
    db.exec('DELETE FROM materias')
    db.exec('DELETE FROM archivo_cats')
  })
  tx()
  loadSeed()
}

export function listMaterias(): Materia[] {
  return db
    .prepare('SELECT * FROM materias ORDER BY carpeta ASC')
    .all() as Materia[]
}

export function getMateria(id: number): Materia {
  const m = db.prepare('SELECT * FROM materias WHERE id = ?').get(id) as Materia | undefined
  if (!m) throw new Error('Materia no encontrada.')
  return m
}

export function updateMateriaRuta(
  id: number,
  ruta: string | null,
  nombreCarpeta: string | null = null,
): void {
  db.prepare('UPDATE materias SET ruta = ?, nombre_carpeta = ? WHERE id = ?').run(
    ruta,
    nombreCarpeta,
    id,
  )
}

export function updateMateriaSinMaterial(id: number, sin: boolean): void {
  db.prepare('UPDATE materias SET sin_material = ? WHERE id = ?').run(sin ? 1 : 0, id)
}

/** Recalcula «sin material» según archivos e ítems reales, no la semilla. */
export function refreshSinMaterialFlags(): void {
  const upd = db.prepare('UPDATE materias SET sin_material = ? WHERE id = ?')
  const tx = db.transaction(() => {
    for (const m of listMaterias()) {
      const nArchivos = nArchivosDe(m)
      const nItems = countsPorTipo(m.id).nItems
      const sin = nArchivos === 0 && nItems === 0
      if ((m.sin_material === 1) !== sin) upd.run(sin ? 1 : 0, m.id)
    }
  })
  tx()
}

function rebasePath(p: string, fromDir: string, toDir: string): string | null {
  const from = path.resolve(fromDir)
  const to = path.resolve(toDir)
  const cur = path.resolve(p)
  const fromL = from.toLowerCase()
  const curL = cur.toLowerCase()
  if (curL === fromL) return to
  const sep = path.sep.toLowerCase()
  if (curL.startsWith(fromL + sep) || curL.startsWith(fromL + '/')) {
    return path.join(to, cur.slice(from.length).replace(/^[\\/]+/, ''))
  }
  return null
}

/** Reescribe rutas de materia, PDFs vinculados y categorías al renombrar una carpeta. */
export function rewritePathPrefix(fromDir: string, toDir: string): void {
  if (!db) throw new Error('Base de datos no inicializada.')
  const mats = db.prepare('SELECT id, ruta FROM materias').all() as Array<{
    id: number
    ruta: string | null
  }>
  const updM = db.prepare('UPDATE materias SET ruta = ? WHERE id = ?')
  for (const m of mats) {
    if (!m.ruta) continue
    const next = rebasePath(m.ruta, fromDir, toDir)
    if (next) updM.run(next, m.id)
  }
  const items = db.prepare('SELECT id, archivo_path FROM items').all() as Array<{
    id: number
    archivo_path: string | null
  }>
  const updI = db.prepare('UPDATE items SET archivo_path = ? WHERE id = ?')
  for (const it of items) {
    if (!it.archivo_path) continue
    const next = rebasePath(it.archivo_path, fromDir, toDir)
    if (next) updI.run(next, it.id)
  }
  const cats = db.prepare('SELECT path FROM archivo_cats').all() as Array<{ path: string }>
  const updC = db.prepare('UPDATE archivo_cats SET path = ? WHERE path = ?')
  for (const c of cats) {
    const next = rebasePath(c.path, fromDir, toDir)
    if (next) updC.run(next, c.path)
  }
}

export function reassignCarpetas(pairs: Array<{ from: number; to: number }>): void {
  if (!db) throw new Error('Base de datos no inicializada.')
  const tx = db.transaction(() => {
    const toTmp = db.prepare('UPDATE materias SET carpeta = ? WHERE carpeta = ?')
    const toFinal = db.prepare('UPDATE materias SET carpeta = ? WHERE carpeta = ?')
    for (const p of pairs) {
      toTmp.run(p.from + 10_000, p.from)
    }
    for (const p of pairs) {
      toFinal.run(p.to, p.from + 10_000)
    }
  })
  tx()
}

export function updateSeedCarpetas(pairs: Array<{ from: number; to: number }>): void {
  const seedPath = seedFilePath()
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as SeedFile
  const map = new Map(pairs.map((p) => [p.from, p.to]))
  for (const m of seed.materias) {
    const n = map.get(m.carpeta)
    if (n != null) m.carpeta = n
  }
  seed.materias.sort((a, b) => a.carpeta - b.carpeta)
  fs.writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`)
}

export function listItems(materiaId: number): Item[] {
  return db
    .prepare('SELECT * FROM items WHERE materia_id = ? ORDER BY tipo, id')
    .all(materiaId) as Item[]
}

export function getItem(id: number): Item {
  const it = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Item | undefined
  if (!it) throw new Error('Ítem no encontrado.')
  return it
}

export function upsertItem(payload: {
  id?: number
  materia_id: number
  tipo: string
  nombre: string
  num: number
  estado: string
  archivo_path?: string | null
  notas?: string | null
}): Item {
  if (!payload.nombre.trim()) throw new Error('El nombre del ítem es obligatorio.')
  if (!['T', 'P', 'F'].includes(payload.tipo)) throw new Error('Tipo no válido.')
  if (payload.id) {
    db.prepare(
      `UPDATE items SET tipo=?, nombre=?, num=?, estado=?, archivo_path=?, notas=? WHERE id=?`,
    ).run(
      payload.tipo,
      payload.nombre.trim(),
      payload.num,
      payload.estado,
      payload.archivo_path ?? null,
      payload.notas ?? null,
      payload.id,
    )
    return getItem(payload.id)
  }
  const info = db
    .prepare(
      `INSERT INTO items (materia_id, tipo, nombre, num, estado, archivo_path, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      payload.materia_id,
      payload.tipo,
      payload.nombre.trim(),
      payload.num,
      payload.estado,
      payload.archivo_path ?? null,
      payload.notas ?? null,
    )
  return getItem(Number(info.lastInsertRowid))
}

export function deleteItem(id: number): void {
  db.prepare('DELETE FROM items WHERE id = ?').run(id)
}

export function vincularItem(itemId: number, archivoPath: string | null): Item {
  db.prepare('UPDATE items SET archivo_path = ? WHERE id = ?').run(archivoPath, itemId)
  return getItem(itemId)
}

export function unlinkByPath(archivoPath: string): void {
  db.prepare('UPDATE items SET archivo_path = NULL WHERE archivo_path = ?').run(archivoPath)
}

export function itemsByPaths(paths: string[]): Item[] {
  if (paths.length === 0) return []
  const placeholders = paths.map(() => '?').join(',')
  return db
    .prepare(`SELECT * FROM items WHERE archivo_path IN (${placeholders})`)
    .all(...paths) as Item[]
}

export function getCategoriaOverride(p: string): string | undefined {
  const row = db.prepare('SELECT categoria FROM archivo_cats WHERE path = ?').get(p) as
    | { categoria: string }
    | undefined
  return row?.categoria
}

export function setCategoriaOverride(p: string, categoria: string): void {
  db.prepare(
    `INSERT INTO archivo_cats (path, categoria) VALUES (?, ?)
     ON CONFLICT(path) DO UPDATE SET categoria = excluded.categoria`,
  ).run(p, categoria)
}

export function renameCatKey(from: string, to: string): void {
  db.prepare('UPDATE archivo_cats SET path = ? WHERE path = ?').run(to, from)
  db.prepare('UPDATE items SET archivo_path = ? WHERE archivo_path = ?').run(to, from)
}

function itemStats(item: Item): ItemConStats {
  const sinArchivo = !item.archivo_path || !fs.existsSync(item.archivo_path)
  return { ...item, sin_archivo: sinArchivo }
}

export function itemsConStats(materiaId: number): ItemConStats[] {
  return listItems(materiaId).map(itemStats)
}

function nArchivosDe(materia: Materia): number {
  if (!materia.ruta) return 0
  try {
    return countFiles(materia.ruta)
  } catch {
    return 0
  }
}

function countsPorTipo(materiaId: number): {
  nT: number
  nP: number
  nF: number
  nItems: number
  nVerificados: number
} {
  const rows = db
    .prepare(
      `SELECT tipo, estado, COUNT(*) AS n
       FROM items WHERE materia_id = ? GROUP BY tipo, estado`,
    )
    .all(materiaId) as Array<{ tipo: string; estado: string; n: number }>
  let nT = 0
  let nP = 0
  let nF = 0
  let nVerificados = 0
  for (const r of rows) {
    if (r.tipo === 'T') nT += r.n
    if (r.tipo === 'P') nP += r.n
    if (r.tipo === 'F') nF += r.n
    if (r.estado === 'Verificado') nVerificados += r.n
  }
  return { nT, nP, nF, nItems: nT + nP + nF, nVerificados }
}

function toCard(materia: Materia): MateriaCard {
  const c = countsPorTipo(materia.id)
  const nArchivos = nArchivosDe(materia)
  return {
    materia,
    nT: c.nT,
    nP: c.nP,
    nF: c.nF,
    nArchivos,
    cobertura: { T: c.nT > 0, P: c.nP > 0, F: c.nF > 0 },
    nVerificados: c.nVerificados,
    nItems: c.nItems,
  }
}

export function getDashboard(): DashboardData {
  refreshSinMaterialFlags()
  const cfg = getConfig()
  const materias = listMaterias()
  const cards = materias.map(toCard)
  const totalItems = cards.reduce((s, c) => s + c.nItems, 0)
  const totalVerif = cards.reduce((s, c) => s + c.nVerificados, 0)
  const totalArchivos = cards.reduce((s, c) => s + c.nArchivos, 0)
  const sinMaterial = materias.filter((m) => m.sin_material === 1)
  let errorDisco: string | null = null
  const existe = cfg.root_path ? rootExists(cfg.root_path) : false
  if (cfg.root_path && !existe) {
    errorDisco = `La carpeta raíz no existe o no es accesible: ${cfg.root_path}`
  }
  return {
    totalMaterias: materias.length,
    totalItems,
    totalArchivos,
    pctVerificado: totalItems ? Math.round((totalVerif / totalItems) * 1000) / 10 : 0,
    sinMaterial,
    cards,
    rootPath: cfg.root_path,
    rootExiste: existe,
    errorDisco,
  }
}

export function getResumen(): ResumenData {
  refreshSinMaterialFlags()
  const materias = listMaterias()
  const seedIdx = seedNumIndex()
  const filas: ResumenFila[] = materias.map((materia) => {
    const c = countsPorTipo(materia.id)
    const items = compactarItems(materia.carpeta, itemsConStats(materia.id), seedIdx)
    const t = items.filter((i) => i.tipo === 'T')
    const p = items.filter((i) => i.tipo === 'P')
    const f = items.filter((i) => i.tipo === 'F')
    const nArchivos = nArchivosDe(materia)
    return {
      materia,
      nT: t.length,
      pregT: t.reduce((s, i) => s + (i.num || 0), 0),
      nP: p.length,
      pregP: p.reduce((s, i) => s + (i.num || 0), 0),
      nF: f.length,
      nFichas: f.reduce((s, i) => s + (i.num || 0), 0),
      nItems: c.nItems,
      nArchivos,
      nVerificados: c.nVerificados,
      pctVerificado: c.nItems ? Math.round((c.nVerificados / c.nItems) * 1000) / 10 : 0,
      items,
    }
  })
  const total = filas.reduce<Omit<ResumenFila, 'materia'>>(
    (acc, f) => ({
      nT: acc.nT + f.nT,
      pregT: acc.pregT + f.pregT,
      nP: acc.nP + f.nP,
      pregP: acc.pregP + f.pregP,
      nF: acc.nF + f.nF,
      nFichas: acc.nFichas + f.nFichas,
      nItems: acc.nItems + f.nItems,
      nArchivos: acc.nArchivos + f.nArchivos,
      nVerificados: acc.nVerificados + f.nVerificados,
      pctVerificado: 0,
      items: [],
    }),
    {
      nT: 0,
      pregT: 0,
      nP: 0,
      pregP: 0,
      nF: 0,
      nFichas: 0,
      nItems: 0,
      nArchivos: 0,
      nVerificados: 0,
      pctVerificado: 0,
      items: [],
    },
  )
  total.pctVerificado = total.nItems
    ? Math.round((total.nVerificados / total.nItems) * 1000) / 10
    : 0
  const huecosSinMaterial = materias.filter((m) => m.sin_material === 1)
  const pendientes = db
    .prepare(
      `SELECT items.*, COALESCE(NULLIF(materias.nombre_carpeta, ''), materias.nombre) AS materia_nombre
       FROM items JOIN materias ON materias.id = items.materia_id
       WHERE items.estado = 'Pendiente'
       ORDER BY materias.carpeta, items.id`,
    )
    .all() as Array<Item & { materia_nombre: string }>
  return {
    filas,
    total,
    huecosSinMaterial,
    huecosPendientes: pendientes.map((p) => ({
      materia: p.materia_nombre,
      item: p as Item,
    })),
  }
}
