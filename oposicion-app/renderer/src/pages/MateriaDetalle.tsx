import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  Layers,
  Printer,
  Trash2,
  Upload,
} from 'lucide-react'
import type { ArchivoDisco, MateriaDetalle as Detalle } from '@shared/types'
import { CATEGORIA_LABEL } from '@shared/types'
import { formatBytes, formatSumarioMaterial } from '@shared/neto'
import { nombreMateria } from '@shared/classify'
import { invoke } from '../lib/api'
import { Modal } from '../components/Modal'
import { SyncMaterialButton } from '../components/SyncMaterialButton'

const FILE_ICONS: Record<string, typeof FileText> = {
  '.pdf': FileText,
  '.docx': FileText,
  '.doc': FileText,
  '.apkg': Layers,
  '.csv': FileSpreadsheet,
  '.txt': File,
  '.md': File,
  '.png': FileImage,
  '.jpg': FileImage,
  '.jpeg': FileImage,
  '.gif': FileImage,
  '.webp': FileImage,
}

export function MateriaDetalle({
  materiaId,
  onBack,
  onResumen,
  notify,
  onChanged,
}: {
  materiaId: number
  onBack: () => void
  onResumen: () => void
  notify: (msg: string, kind?: 'ok' | 'err') => void
  onChanged: () => void
}) {
  const [data, setData] = useState<Detalle | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [renameFile, setRenameFile] = useState<ArchivoDisco | null>(null)
  const [newFolder, setNewFolder] = useState(false)

  const load = useCallback(() => {
    invoke<Detalle>('db:materiaDetalle', materiaId)
      .then(setData)
      .catch((e: Error) => setErr(e.message))
  }, [materiaId])

  useEffect(() => {
    load()
  }, [load])

  if (err) return <p className="p-6 text-red-700">{err}</p>
  if (!data) return <p className="p-6 text-slate-500">Cargando…</p>

  const { materia, archivos } = data

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <button type="button" onClick={onBack} className="rounded p-1 hover:bg-slate-100">
          <ArrowLeft size={16} />
        </button>
        <div>
          <div className="text-[11px] text-slate-500">Materia {materia.carpeta}</div>
          <h1 className="text-base font-semibold text-primary">{nombreMateria(materia)}</h1>
        </div>
        {materia.sin_material === 1 && archivos.every((a) => a.isDir) && (
          <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">
            Sin material
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <SyncMaterialButton
            notify={notify}
            onDone={() => {
              load()
              onChanged()
            }}
            variant="secondary"
            label="Sincronizar"
          />
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-[12px] hover:bg-slate-50"
            onClick={onResumen}
          >
            <Printer size={12} /> Imprimir
          </button>
        </div>
      </header>

      <div className="grid shrink-0 grid-cols-3 border-b border-slate-200 bg-white">
        <SumatorioCasilla
          label="Teórico"
          value={data.pregT}
          unidad="preg."
          detalle={`${data.nT} banco${data.nT === 1 ? '' : 's'}`}
        />
        <SumatorioCasilla
          label="Práctico"
          value={data.pregP}
          unidad="preg."
          detalle={`${data.nP} banco${data.nP === 1 ? '' : 's'}`}
        />
        <SumatorioCasilla
          label="Fichas"
          value={data.nFichas}
          unidad="fichas"
          detalle={`${data.nF} mazo${data.nF === 1 ? '' : 's'}`}
        />
      </div>
      <p className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[12px] text-slate-600">
        <span className="font-semibold text-slate-800">Material total: </span>
        {formatSumarioMaterial(data)}
      </p>

      <section className="min-h-0 flex-1 overflow-auto bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Archivos</h2>
          <div className="flex gap-1.5">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-[12px] hover:bg-slate-50 disabled:opacity-40"
              disabled={!materia.ruta}
              onClick={async () => {
                try {
                  await invoke('fs:import', materia.ruta)
                  notify('Archivos importados.')
                  load()
                  onChanged()
                } catch (e) {
                  notify((e as Error).message, 'err')
                }
              }}
            >
              <Upload size={12} /> Importar
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-[12px] hover:bg-slate-50 disabled:opacity-40"
              disabled={!materia.ruta}
              onClick={() => setNewFolder(true)}
            >
              <FolderPlus size={12} /> Subcarpeta
            </button>
          </div>
        </div>
        {!materia.ruta ? (
          <p className="text-[12px] text-amber-800">
            Esta materia no tiene carpeta emparejada. Sincroniza en Configuración.
          </p>
        ) : archivos.length === 0 ? (
          <p className="text-[12px] text-slate-500">La carpeta está vacía.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {archivos.map((f) => (
              <ArchivoRow
                key={f.path}
                file={f}
                onOpen={async () => {
                  try {
                    await invoke('fs:open', f.path)
                  } catch (e) {
                    notify((e as Error).message, 'err')
                  }
                }}
                onReveal={() => {
                  invoke('fs:reveal', f.path).catch((e: Error) => notify(e.message, 'err'))
                }}
                onRename={() => setRenameFile(f)}
                onDelete={async () => {
                  if (!window.confirm(`¿Eliminar «${f.name}» del disco? Esta acción no se puede deshacer.`)) {
                    return
                  }
                  try {
                    await invoke('fs:delete', f.path)
                    notify('Eliminado.')
                    load()
                    onChanged()
                  } catch (e) {
                    notify((e as Error).message, 'err')
                  }
                }}
              />
            ))}
          </ul>
        )}
      </section>

      {renameFile && (
        <FormRename
          file={renameFile}
          onClose={() => setRenameFile(null)}
          onSaved={() => {
            setRenameFile(null)
            load()
          }}
          notify={notify}
        />
      )}

      {newFolder && materia.ruta && (
        <FormNuevaCarpeta
          parent={materia.ruta}
          onClose={() => setNewFolder(false)}
          onSaved={() => {
            setNewFolder(false)
            load()
          }}
          notify={notify}
        />
      )}
    </div>
  )
}

function SumatorioCasilla({
  label,
  value,
  unidad,
  detalle,
}: {
  label: string
  value: number
  unidad: string
  detalle: string
}) {
  return (
    <div className="border-r border-slate-100 px-4 py-3 last:border-r-0">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums text-primary">
        {value.toLocaleString('es-ES')}
        <span className="ml-1 text-[11px] font-normal text-slate-500">{unidad}</span>
      </div>
      <div className="text-[11px] text-slate-500">{detalle}</div>
    </div>
  )
}

function ArchivoRow({
  file,
  onOpen,
  onReveal,
  onRename,
  onDelete,
}: {
  file: ArchivoDisco
  onOpen: () => void
  onReveal: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const Icon = file.isDir ? Folder : (FILE_ICONS[file.ext] ?? File)
  return (
    <li className="flex items-start gap-2 py-2">
      <Icon size={16} className={`mt-0.5 shrink-0 ${file.isDir ? 'text-amber-600' : 'text-primary'}`} />
      <div className="min-w-0 flex-1">
        <button type="button" className="block truncate text-left text-[12px] font-medium hover:underline" onClick={onOpen}>
          {file.relative}
        </button>
        {!file.isDir && (
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span>{CATEGORIA_LABEL[file.categoria]}</span>
            {file.sinRegistrar && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">
                sin registrar
              </span>
            )}
            <span>{formatBytes(file.size)}</span>
            <span>{file.mtime ? new Date(file.mtime).toLocaleDateString('es-ES') : ''}</span>
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-1 text-[11px]">
        <button type="button" className="rounded px-1.5 py-0.5 hover:bg-slate-100" onClick={onReveal}>
          Mostrar
        </button>
        <button type="button" className="rounded px-1.5 py-0.5 hover:bg-slate-100" onClick={onRename}>
          Renombrar
        </button>
        <button type="button" className="rounded px-1.5 py-0.5 text-red-700 hover:bg-red-50" onClick={onDelete}>
          <Trash2 size={11} className="inline" /> Eliminar
        </button>
      </div>
    </li>
  )
}

function FormRename({
  file,
  onClose,
  onSaved,
  notify,
}: {
  file: ArchivoDisco
  onClose: () => void
  onSaved: () => void
  notify: (msg: string, kind?: 'ok' | 'err') => void
}) {
  const [name, setName] = useState(file.name)
  return (
    <Modal title="Renombrar" onClose={onClose}>
      <input className="mb-3 w-full rounded border px-2 py-1.5 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex justify-end gap-2">
        <button type="button" className="rounded px-3 py-1.5 text-sm" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="rounded bg-primary px-3 py-1.5 text-sm text-white"
          onClick={async () => {
            try {
              await invoke('fs:rename', file.path, name)
              notify('Renombrado.')
              onSaved()
            } catch (e) {
              notify((e as Error).message, 'err')
            }
          }}
        >
          Aplicar
        </button>
      </div>
    </Modal>
  )
}

function FormNuevaCarpeta({
  parent,
  onClose,
  onSaved,
  notify,
}: {
  parent: string
  onClose: () => void
  onSaved: () => void
  notify: (msg: string, kind?: 'ok' | 'err') => void
}) {
  const [name, setName] = useState('')
  return (
    <Modal title="Nueva subcarpeta" onClose={onClose}>
      <input
        className="mb-3 w-full rounded border px-2 py-1.5 text-sm"
        placeholder="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <button type="button" className="rounded px-3 py-1.5 text-sm" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="rounded bg-primary px-3 py-1.5 text-sm text-white"
          onClick={async () => {
            try {
              await invoke('fs:mkdir', parent, name)
              notify('Carpeta creada.')
              onSaved()
            } catch (e) {
              notify((e as Error).message, 'err')
            }
          }}
        >
          Crear
        </button>
      </div>
    </Modal>
  )
}
