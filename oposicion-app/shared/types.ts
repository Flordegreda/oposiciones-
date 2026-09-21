export type TipoItem = 'T' | 'P' | 'F'

export type EstadoItem =
  | 'Pendiente'
  | 'Generado'
  | 'Verificado'
  | 'En Anki'
  | 'Descartado'

export type CategoriaArchivo =
  | 'tema-ley'
  | 'esquema-resumen'
  | 'practico'
  | 'teorico'
  | 'ficha'
  | 'otro'

export interface Config {
  id: 1
  root_path: string
}

export interface Materia {
  id: number
  carpeta: number
  nombre: string
  nombre_carpeta: string | null
  ruta: string | null
  sin_material: number
}

export interface Item {
  id: number
  materia_id: number
  tipo: TipoItem
  nombre: string
  num: number
  estado: EstadoItem
  archivo_path: string | null
  notas: string | null
}

export interface ItemConStats extends Item {
  sin_archivo: boolean
}

export interface ArchivoDisco {
  path: string
  name: string
  relative: string
  size: number
  mtime: string
  ext: string
  isDir: boolean
  categoria: CategoriaArchivo
  itemId: number | null
  sinRegistrar: boolean
}

export interface MateriaCard {
  materia: Materia
  nT: number
  nP: number
  nF: number
  nArchivos: number
  cobertura: { T: boolean; P: boolean; F: boolean }
  nVerificados: number
  nItems: number
}

export interface DashboardData {
  totalMaterias: number
  totalItems: number
  totalArchivos: number
  pctVerificado: number
  sinMaterial: Materia[]
  cards: MateriaCard[]
  rootPath: string | null
  rootExiste: boolean
  errorDisco: string | null
}

export interface MateriaDetalle {
  materia: Materia
  items: ItemConStats[]
  archivos: ArchivoDisco[]
  nSinRegistrar: number
  nItemsSinArchivo: number
  nT: number
  pregT: number
  nP: number
  pregP: number
  nF: number
  nFichas: number
}

export interface ResumenItem {
  tipo: TipoItem
  nombre: string
  num: number
}

export interface ResumenFila {
  materia: Materia
  nT: number
  pregT: number
  nP: number
  pregP: number
  nF: number
  nFichas: number
  nItems: number
  nArchivos: number
  nVerificados: number
  pctVerificado: number
  items: ResumenItem[]
}

export interface ResumenData {
  filas: ResumenFila[]
  total: Omit<ResumenFila, 'materia'>
  huecosSinMaterial: Materia[]
  huecosPendientes: Array<{ materia: string; item: Item }>
}

export interface SeedMateria {
  carpeta: number
  nombre: string
  sin_material: boolean
  items?: Array<{
    tipo: TipoItem
    nombre: string
    num: number
    estado: EstadoItem
  }>
}

export interface SeedFile {
  meta?: Record<string, unknown>
  materias: SeedMateria[]
}

export interface VincularPorNombreReport {
  vinculados: number
  sinMatch: string[]
}

export interface SyncMaterialReport {
  emparejadas: number
  sinCarpeta: number
  vinculados: number
  creados: number
  omitidos: number
}

export interface RenumerarReport {
  renombradas: number
  total: number
  mapping: Array<{ de: number; a: number; nombre: string }>
}

export const ESTADOS: EstadoItem[] = [
  'Pendiente',
  'Generado',
  'Verificado',
  'En Anki',
  'Descartado',
]

export const CATEGORIA_LABEL: Record<CategoriaArchivo, string> = {
  'tema-ley': 'Tema/Ley',
  'esquema-resumen': 'Esquema-resumen',
  practico: 'Test práctico (P)',
  teorico: 'Test teórico (T)',
  ficha: 'Ficha (F)',
  otro: 'Otro material',
}

export const DEFAULT_ROOT = 'F:\\OPOSICION'
