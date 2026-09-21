import fs from 'node:fs'
import path from 'node:path'
import { dialog, shell } from 'electron'
import type { ArchivoDisco, CategoriaArchivo } from '../shared/types'
import { classifyFilename } from '../shared/classify'

export function rootExists(rootPath: string): boolean {
  try {
    return fs.existsSync(rootPath) && fs.statSync(rootPath).isDirectory()
  } catch {
    return false
  }
}

export function assertDir(dir: string, label = 'carpeta'): void {
  if (!dir) throw new Error(`No hay ${label} configurada.`)
  try {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      throw new Error(`La ${label} no existe o no es accesible: ${dir}`)
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('La ')) throw err
    throw new Error(`No se puede acceder a la ${label}: ${dir}`)
  }
}

export function listSubdirs(rootPath: string): Array<{ name: string; path: string }> {
  assertDir(rootPath, 'carpeta raíz')
  return fs
    .readdirSync(rootPath, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => ({ name: d.name, path: path.join(rootPath, d.name) }))
}

export function countFiles(dir: string): number {
  if (!fs.existsSync(dir)) return 0
  let n = 0
  const walk = (d: string) => {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else n += 1
    }
  }
  walk(dir)
  return n
}

export function listFilesRecursive(dir: string): Array<{
  path: string
  name: string
  relative: string
  size: number
  mtime: string
  ext: string
  isDir: boolean
}> {
  assertDir(dir, 'carpeta de la materia')
  const out: Array<{
    path: string
    name: string
    relative: string
    size: number
    mtime: string
    ext: string
    isDir: boolean
  }> = []
  const walk = (d: string) => {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(d, { withFileTypes: true })
    } catch (err) {
      throw new Error(
        `Sin permiso para leer ${d}. ${err instanceof Error ? err.message : ''}`,
      )
    }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue
      const p = path.join(d, e.name)
      const rel = path.relative(dir, p)
      if (e.isDirectory()) {
        out.push({
          path: p,
          name: e.name,
          relative: rel,
          size: 0,
          mtime: '',
          ext: '',
          isDir: true,
        })
        walk(p)
      } else {
        const st = fs.statSync(p)
        out.push({
          path: p,
          name: e.name,
          relative: rel,
          size: st.size,
          mtime: st.mtime.toISOString(),
          ext: path.extname(e.name).toLowerCase(),
          isDir: false,
        })
      }
    }
  }
  walk(dir)
  out.sort((a, b) => a.relative.localeCompare(b.relative, 'es'))
  return out
}

export function toArchivoDisco(
  file: ReturnType<typeof listFilesRecursive>[number],
  categoria: CategoriaArchivo,
  itemId: number | null,
): ArchivoDisco {
  return {
    ...file,
    categoria,
    itemId,
    sinRegistrar: !file.isDir && itemId == null,
  }
}

export function autoCategoria(filename: string, override?: string): CategoriaArchivo {
  if (override) return override as CategoriaArchivo
  return classifyFilename(filename)
}

export async function selectDirectory(defaultPath?: string): Promise<string | null> {
  const res = await dialog.showOpenDialog({
    title: 'Seleccionar carpeta raíz',
    defaultPath,
    properties: ['openDirectory'],
  })
  if (res.canceled || !res.filePaths[0]) return null
  return res.filePaths[0]
}

export async function selectFiles(): Promise<string[]> {
  const res = await dialog.showOpenDialog({
    title: 'Importar archivos',
    properties: ['openFile', 'multiSelections'],
  })
  if (res.canceled) return []
  return res.filePaths
}

export async function openPath(target: string): Promise<void> {
  if (!fs.existsSync(target)) {
    throw new Error(`El archivo o carpeta no existe: ${target}`)
  }
  const err = await shell.openPath(target)
  if (err) throw new Error(`No se pudo abrir: ${err}`)
}

export function showInFolder(target: string): void {
  if (!fs.existsSync(target)) {
    throw new Error(`El archivo o carpeta no existe: ${target}`)
  }
  shell.showItemInFolder(target)
}

export function renamePath(from: string, newName: string): string {
  if (!newName.trim()) throw new Error('El nuevo nombre no puede estar vacío.')
  if (/[\\/:*?"<>|]/.test(newName)) {
    throw new Error('El nombre contiene caracteres no válidos en Windows.')
  }
  if (!fs.existsSync(from)) throw new Error(`No existe: ${from}`)
  const dest = path.join(path.dirname(from), newName)
  if (from === dest) return dest
  if (fs.existsSync(dest)) throw new Error(`Ya existe un archivo llamado ${newName}.`)
  fs.renameSync(from, dest)
  return dest
}

export function deletePath(target: string): void {
  if (!fs.existsSync(target)) throw new Error(`No existe: ${target}`)
  const st = fs.statSync(target)
  if (st.isDirectory()) fs.rmSync(target, { recursive: true, force: false })
  else fs.unlinkSync(target)
}

function uniqueDest(dir: string, filename: string): string {
  let dest = path.join(dir, filename)
  if (!fs.existsSync(dest)) return dest
  const ext = path.extname(filename)
  const base = path.basename(filename, ext)
  let i = 2
  while (fs.existsSync(dest)) {
    dest = path.join(dir, `${base} (${i})${ext}`)
    i += 1
  }
  return dest
}

export function importFiles(destDir: string, sources: string[]): string[] {
  assertDir(destDir, 'carpeta de destino')
  const copied: string[] = []
  for (const src of sources) {
    if (!fs.existsSync(src)) continue
    const dest = uniqueDest(destDir, path.basename(src))
    fs.copyFileSync(src, dest)
    copied.push(dest)
  }
  return copied
}

export function mkdirIn(parent: string, name: string): string {
  if (!name.trim()) throw new Error('El nombre de la carpeta no puede estar vacío.')
  if (/[\\/:*?"<>|]/.test(name)) {
    throw new Error('El nombre contiene caracteres no válidos en Windows.')
  }
  assertDir(parent, 'carpeta padre')
  const dest = path.join(parent, name.trim())
  if (fs.existsSync(dest)) throw new Error(`Ya existe: ${name}`)
  fs.mkdirSync(dest)
  return dest
}
