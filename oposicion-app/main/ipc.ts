import { ipcMain } from 'electron'
import path from 'node:path'
import {
  deleteItem,
  getConfig,
  getDashboard,
  getItem,
  getResumen,
  listMaterias,
  openDb,
  reloadSeed,
  setCategoriaOverride,
  setRootPath,
  unlinkByPath,
  upsertItem,
  vincularItem,
  renameCatKey,
} from './db'
import {
  deletePath,
  importFiles,
  mkdirIn,
  openPath,
  renamePath,
  rootExists,
  selectDirectory,
  selectFiles,
  showInFolder,
} from './fs-ops'
import {
  materiaDetalle,
  renumerarAlfabetico,
  syncMaterial,
  vincularPorNombre,
  vincularPorNombreTodas,
} from './sync'
import { nombreConvencion } from '../shared/neto'
import { classifyFilename, nombreMateria } from '../shared/classify'

type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }

function handle(channel: string, fn: (...args: any[]) => unknown): void {
  ipcMain.handle(channel, async (_evt, ...args: unknown[]) => {
    try {
      const data = await fn(...args)
      return { ok: true, data } satisfies IpcResult<unknown>
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return { ok: false, error } satisfies IpcResult<unknown>
    }
  })
}

export function registerIpc(): void {
  openDb()

  handle('db:getConfig', () => getConfig())
  handle('db:dashboard', () => {
    try {
      const cfg = getConfig()
      if (cfg.root_path && rootExists(cfg.root_path)) syncMaterial()
    } catch {
      /* el dashboard sigue; errorDisco cubre raíz inaccesible */
    }
    return getDashboard()
  })
  handle('db:resumen', () => getResumen())
  handle('db:materias', () => listMaterias())
  handle('db:materiaDetalle', (id: number) => materiaDetalle(id))
  handle('db:upsertItem', (payload: Parameters<typeof upsertItem>[0]) => upsertItem(payload))
  handle('db:deleteItem', (id: number) => {
    deleteItem(id)
  })
  handle('db:vincular', (itemId: number, archivoPath: string | null) =>
    vincularItem(itemId, archivoPath),
  )
  handle('db:setCategoria', (p: string, cat: string) => {
    setCategoriaOverride(p, cat)
  })
  handle('db:reloadSeed', () => {
    reloadSeed()
  })

  handle('sync:run', () => syncMaterial())
  handle('fs:renumerarAlfabetico', () => {
    const cfg = getConfig()
    if (!cfg.root_path) throw new Error('Configura primero la carpeta raíz.')
    return renumerarAlfabetico(cfg.root_path)
  })
  handle('fs:vincularPorNombre', (materiaId?: number) => {
    if (typeof materiaId === 'number') return vincularPorNombre(materiaId)
    return vincularPorNombreTodas()
  })

  handle('fs:selectRoot', async () => {
    const cfg = getConfig()
    const chosen = await selectDirectory(cfg.root_path || undefined)
    if (!chosen) return null
    setRootPath(chosen)
    syncMaterial()
    return getConfig()
  })

  handle('fs:open', async (target: string) => {
    await openPath(target)
  })
  handle('fs:reveal', (target: string) => {
    showInFolder(target)
  })
  handle('fs:rename', (from: string, newName: string) => {
    const dest = renamePath(from, newName)
    renameCatKey(from, dest)
    return dest
  })
  handle('fs:delete', (target: string) => {
    unlinkByPath(target)
    deletePath(target)
  })
  handle('fs:import', async (destDir: string) => {
    const sources = await selectFiles()
    if (sources.length === 0) return []
    return importFiles(destDir, sources)
  })
  handle('fs:mkdir', (parent: string, name: string) => mkdirIn(parent, name))
  handle('fs:proponerNombre', (materiaId: number, filePath: string) => {
    const det = materiaDetalle(materiaId)
    const file = det.archivos.find((a) => a.path === filePath)
    if (!file) throw new Error('Archivo no encontrado en la materia.')
    const linked = file.itemId
      ? det.items.find((i) => i.id === file.itemId)
      : undefined
    const cat = file.categoria
    let tipo: 'T' | 'P' | 'F' | null = linked?.tipo ?? null
    if (!tipo) {
      if (cat === 'teorico') tipo = 'T'
      else if (cat === 'practico') tipo = 'P'
      else if (cat === 'ficha') tipo = 'F'
      else tipo = classifyFilename(file.name) === 'teorico' ? 'T' : null
    }
    const sameTipo = tipo
      ? det.items.filter((i) => i.tipo === tipo)
      : []
    const idx = linked
      ? sameTipo.findIndex((i) => i.id === linked.id) + 1
      : sameTipo.length + 1
    return nombreConvencion(
      det.materia.carpeta,
      nombreMateria(det.materia),
      tipo,
      tipo ? idx : null,
      path.extname(file.name),
    )
  })
  handle('db:getItem', (id: number) => getItem(id))
}
