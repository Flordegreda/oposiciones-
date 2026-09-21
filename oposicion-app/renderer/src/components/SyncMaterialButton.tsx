import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { SyncMaterialReport } from '@shared/types'
import { invoke } from '../lib/api'

function resumen(r: SyncMaterialReport): string {
  const bits = [
    `${r.emparejadas} carpetas`,
    r.vinculados ? `${r.vinculados} vinculados` : null,
    r.creados ? `${r.creados} nuevos` : null,
  ].filter(Boolean)
  return `Material sincronizado: ${bits.join(', ')}.`
}

export function SyncMaterialButton({
  notify,
  onDone,
  variant = 'primary',
  label = 'Sincronizar material',
}: {
  notify: (msg: string, kind?: 'ok' | 'err') => void
  onDone?: () => void
  variant?: 'primary' | 'secondary'
  label?: string
}) {
  const [busy, setBusy] = useState(false)

  return (
    <button
      type="button"
      disabled={busy}
      className={
        variant === 'primary'
          ? 'inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-700 disabled:opacity-50'
          : 'inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50'
      }
      onClick={() => {
        void (async () => {
          setBusy(true)
          try {
            const r = await invoke<SyncMaterialReport>('sync:run')
            notify(resumen(r))
            onDone?.()
          } catch (e) {
            notify((e as Error).message, 'err')
          } finally {
            setBusy(false)
          }
        })()
      }}
    >
      <RefreshCw size={14} className={busy ? 'animate-spin' : undefined} />
      {busy ? 'Sincronizando…' : label}
    </button>
  )
}
