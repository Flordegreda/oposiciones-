import { useEffect, useState } from 'react'
import { AlertTriangle, FolderX } from 'lucide-react'
import type { DashboardData, MateriaCard } from '@shared/types'
import { nombreMateria } from '@shared/classify'
import { invoke } from '../lib/api'
import { PuntoCobertura } from '../components/Semaforo'
import { SyncMaterialButton } from '../components/SyncMaterialButton'

export function Dashboard({
  onOpen,
  notify,
  onChanged,
}: {
  onOpen: (id: number) => void
  notify: (msg: string, kind?: 'ok' | 'err') => void
  onChanged: () => void
}) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    invoke<DashboardData>('db:dashboard')
      .then(setData)
      .catch((e: Error) => setErr(e.message))
  }, [])

  if (err) {
    return <p className="p-6 text-red-700">{err}</p>
  }
  if (!data) {
    return <p className="p-6 text-slate-500">Cargando…</p>
  }

  return (
    <div className="p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-primary">Materias</h1>
          <p className="text-xs text-slate-500">Inventario local de carpetas y archivos</p>
        </div>
        <SyncMaterialButton notify={notify} onDone={onChanged} />
      </header>

      <section className="mb-4 grid grid-cols-2 gap-0 overflow-hidden rounded-md border border-slate-200 bg-white sm:grid-cols-4">
        <Stat label="Materias" value={nf(data.totalMaterias)} />
        <Stat label="Ítems" value={nf(data.totalItems)} />
        <Stat label="Archivos" value={nf(data.totalArchivos)} />
        <Stat
          label="Verificado"
          value={`${data.pctVerificado.toFixed(1).replace('.', ',')}%`}
        />
      </section>

      {data.errorDisco && (
        <div className="mb-4 flex items-start gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <FolderX size={16} className="mt-0.5 shrink-0" />
          <span>
            {data.errorDisco} Abre Configuración para elegir la carpeta raíz (por defecto{' '}
            <code>F:\OPOSICION</code>).
          </span>
        </div>
      )}

      {data.sinMaterial.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            <strong>Materias sin material ({data.sinMaterial.length}):</strong>{' '}
            {data.sinMaterial.map((m) => `${m.carpeta} ${nombreMateria(m)}`).join(' · ')}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {data.cards.map((card) => (
          <MateriaTarjeta
            key={card.materia.id}
            card={card}
            onClick={() => {
              if (!card.materia.ruta && data.errorDisco) {
                notify('Asigna la carpeta raíz en Configuración.', 'err')
              }
              onOpen(card.materia.id)
            }}
          />
        ))}
      </div>
    </div>
  )
}

function nf(n: number): string {
  return n.toLocaleString('es-ES')
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-2xl font-semibold tabular-nums text-primary">{value}</div>
    </div>
  )
}

function MateriaTarjeta({ card, onClick }: { card: MateriaCard; onClick: () => void }) {
  const hueco = card.materia.sin_material === 1 && card.nArchivos === 0
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border bg-white p-3 text-left shadow-sm transition hover:shadow ${
        hueco ? 'border-red-400 bg-red-50/70' : 'border-slate-200 hover:border-primary/40'
      }`}
    >
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-slate-500">{card.materia.carpeta}</div>
        <div className="truncate text-[13px] font-semibold leading-tight text-slate-800">
          {nombreMateria(card.materia)}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
        <span>
          T <b>{card.nT}</b>
        </span>
        <span>
          P <b>{card.nP}</b>
        </span>
        <span>
          F <b>{card.nF}</b>
        </span>
        <span className="ml-auto text-slate-400">{card.nArchivos} arch.</span>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <PuntoCobertura on={card.cobertura.T} label="Teórico" />
        <PuntoCobertura on={card.cobertura.P} label="Práctico" />
        <PuntoCobertura on={card.cobertura.F} label="Fichas" />
      </div>
    </button>
  )
}
