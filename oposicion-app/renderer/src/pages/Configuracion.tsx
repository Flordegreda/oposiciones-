import { useEffect, useState } from 'react'
import { ArrowDownAZ, FolderSearch, RotateCcw } from 'lucide-react'
import type { Config, RenumerarReport } from '@shared/types'
import { invoke } from '../lib/api'
import { SyncMaterialButton } from '../components/SyncMaterialButton'

export function Configuracion({
  notify,
  onChanged,
}: {
  notify: (msg: string, kind?: 'ok' | 'err') => void
  onChanged: () => void
}) {
  const [cfg, setCfg] = useState<Config | null>(null)
  const [busy, setBusy] = useState(false)

  const load = () => {
    invoke<Config>('db:getConfig')
      .then(setCfg)
      .catch((e: Error) => notify(e.message, 'err'))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!cfg) return <p className="p-6 text-slate-500">Cargando…</p>

  return (
    <div className="mx-auto max-w-xl p-5">
      <h1 className="mb-1 text-lg font-semibold text-primary">Configuración</h1>
      <p className="mb-5 text-xs text-slate-500">
        Gestor documental local. Las rutas se guardan en este equipo.
      </p>

      <section className="mb-4 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Carpeta raíz</h2>
        <p className="mb-2 break-all rounded bg-slate-50 px-2 py-1.5 font-mono text-[12px] text-slate-700">
          {cfg.root_path || '— no asignada —'}
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-700"
          onClick={async () => {
            try {
              const next = await invoke<Config | null>('fs:selectRoot')
              if (next) {
                setCfg(next)
                notify('Carpeta raíz actualizada y sincronizada.')
                onChanged()
              }
            } catch (e) {
              notify((e as Error).message, 'err')
            }
          }}
        >
          <FolderSearch size={14} />
          Elegir carpeta…
        </button>
        <p className="mt-2 text-[11px] text-slate-500">
          Debe contener las 32 subcarpetas numeradas (01 ABOGACIA, 02 ADMINISTRACION ELECTRONICA, …).
        </p>
      </section>

      <section className="mb-4 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Disco</h2>
        <p className="mb-2 text-[12px] text-slate-600">
          Lee las carpetas de <code>F:\OPOSICION</code>, vincula los PDF que ya existían y registra el
          material nuevo (tests y fichas).
        </p>
        <SyncMaterialButton notify={notify} onDone={onChanged} />
        <button
          type="button"
          disabled={busy}
          className="ml-2 mt-2 inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
          onClick={async () => {
            if (
              !window.confirm(
                `¿Renombrar las carpetas de ${cfg.root_path} en orden alfabético (01, 02, 03…)? Cierra archivos abiertos de esas carpetas antes.`,
              )
            ) {
              return
            }
            setBusy(true)
            try {
              const r = await invoke<RenumerarReport>('fs:renumerarAlfabetico')
              notify(
                `Renumeradas ${r.renombradas} de ${r.total} carpetas en orden A–Z.`,
              )
              onChanged()
            } catch (e) {
              notify((e as Error).message, 'err')
            } finally {
              setBusy(false)
            }
          }}
        >
          <ArrowDownAZ size={14} />
          Renumerar A–Z
        </button>
        <p className="mt-2 text-[11px] text-slate-500">
          Pone números 01, 02… según el nombre de la carpeta para que el Explorador y la app coincidan.
        </p>
      </section>

      <section className="rounded-md border border-red-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-red-800">Recargar semilla</h2>
        <p className="mb-2 text-[12px] text-slate-600">
          Borra materias e ítems y vuelve a cargar <code>seed_materias.json</code>. La carpeta raíz se conserva.
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded border border-red-300 px-3 py-1.5 text-sm text-red-800 hover:bg-red-50"
          onClick={async () => {
            if (
              !window.confirm(
                '¿Reinicializar el inventario desde la semilla? Se perderán ítems y vínculos registrados.',
              )
            ) {
              return
            }
            try {
              await invoke('db:reloadSeed')
              try {
                await invoke('sync:run')
              } catch {
                /* raíz puede no existir */
              }
              notify('Semilla recargada.')
              onChanged()
              load()
            } catch (e) {
              notify((e as Error).message, 'err')
            }
          }}
        >
          <RotateCcw size={14} />
          Recargar semilla
        </button>
      </section>
    </div>
  )
}
