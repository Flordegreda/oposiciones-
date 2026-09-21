import { useEffect, useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import type { ResumenData, ResumenFila, ResumenItem } from '@shared/types'
import { nombreMateria } from '@shared/classify'
import { invoke } from '../lib/api'

const TIPO_LABEL = { T: 'Teórico', P: 'Práctico', F: 'Fichas' } as const

function nf(n: number): string {
  return n.toLocaleString('es-ES')
}

function cantidad(it: ResumenItem): string {
  if (!it.num) return '—'
  if (it.tipo === 'F') return `${nf(it.num)} fichas`
  return `${nf(it.num)} preg.`
}

export function Resumen({
  onOpen,
  materiaId,
}: {
  onOpen: (id: number) => void
  materiaId?: number | null
}) {
  const [data, setData] = useState<ResumenData | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    invoke<ResumenData>('db:resumen')
      .then(setData)
      .catch((e: Error) => setErr(e.message))
  }, [])

  const filas = useMemo(() => {
    if (!data) return []
    if (materiaId == null) return data.filas
    return data.filas.filter((f) => f.materia.id === materiaId)
  }, [data, materiaId])

  if (err) return <p className="p-6 text-red-700">{err}</p>
  if (!data) return <p className="p-6 text-slate-500">Cargando…</p>

  const una = filas.length === 1
  const fecha = new Date().toLocaleString('es-ES')
  const tot = una
    ? filas[0]
    : data.total

  return (
    <div className="p-5 print:p-0">
      <header className="no-print mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-lg font-semibold text-primary">Resumen</h1>
          <p className="text-xs text-slate-500">
            Tests y fichas por materia. Imprime o guarda como PDF.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-700"
          onClick={() => window.print()}
        >
          <Printer size={14} />
          Imprimir
        </button>
      </header>

      <div className="informe-print rounded-md border border-slate-200 bg-white p-5 print:border-0 print:p-0">
        <div className="mb-5 border-b border-slate-200 pb-3">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">JEX A1 Jurídica</div>
          <h2 className="text-base font-semibold text-primary">
            {una ? nombreMateria(filas[0].materia) : 'Material de estudio'}
          </h2>
          <p className="mt-1 text-[12px] text-slate-600">{fecha}</p>
          <p className="mt-1 text-[12px] text-slate-600">
            {nf(tot.nT)} tests teóricos ({nf(tot.pregT)} preg.) · {nf(tot.nP)} tests prácticos (
            {nf(tot.pregP)} preg.) · {nf(tot.nF)} mazos ({nf(tot.nFichas)} fichas)
          </p>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-1.5 pr-2">Nº</th>
                <th className="py-1.5 pr-2">Materia</th>
                <th className="py-1.5 pr-2 text-right">Tests T</th>
                <th className="py-1.5 pr-2 text-right">Preg. T</th>
                <th className="py-1.5 pr-2 text-right">Tests P</th>
                <th className="py-1.5 pr-2 text-right">Preg. P</th>
                <th className="py-1.5 pr-2 text-right">Mazos</th>
                <th className="py-1.5 text-right">Fichas</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr
                  key={f.materia.id}
                  className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 print:cursor-default ${
                    f.materia.sin_material && f.nArchivos === 0 ? 'bg-red-50' : ''
                  }`}
                  onClick={() => onOpen(f.materia.id)}
                >
                  <td className="py-1.5 pr-2 tabular-nums text-slate-500">{f.materia.carpeta}</td>
                  <td className="py-1.5 pr-2 font-medium">
                    {nombreMateria(f.materia)}
                    {f.materia.sin_material && f.nArchivos === 0 ? (
                      <span className="ml-1 font-normal text-red-700">(sin material)</span>
                    ) : null}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{f.nT}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{nf(f.pregT)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{f.nP}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{nf(f.pregP)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{f.nF}</td>
                  <td className="py-1.5 text-right tabular-nums">{nf(f.nFichas)}</td>
                </tr>
              ))}
            </tbody>
            {!una && (
              <tfoot>
                <tr className="border-t-2 border-primary/30 font-semibold">
                  <td className="py-1.5 pr-2" colSpan={2}>
                    TOTAL
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{data.total.nT}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{nf(data.total.pregT)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{data.total.nP}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{nf(data.total.pregP)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{data.total.nF}</td>
                  <td className="py-1.5 text-right tabular-nums">{nf(data.total.nFichas)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {filas.map((f) => (
          <MateriaBloque key={f.materia.id} f={f} />
        ))}
      </div>

      {data.huecosSinMaterial.length > 0 && (
        <div className="no-print mt-6 rounded-md border border-red-200 bg-white p-3">
          <h2 className="mb-2 text-sm font-semibold text-red-800">Materias sin material</h2>
          <ul className="space-y-1 text-[12px]">
            {data.huecosSinMaterial.map((m) => (
              <li key={m.id}>
                <button type="button" className="text-left hover:underline" onClick={() => onOpen(m.id)}>
                  {m.carpeta}. {nombreMateria(m)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function MateriaBloque({ f }: { f: ResumenFila }) {
  const grupos = (
    [
      ['T', f.items.filter((i) => i.tipo === 'T')],
      ['P', f.items.filter((i) => i.tipo === 'P')],
      ['F', f.items.filter((i) => i.tipo === 'F')],
    ] as const
  ).filter(([, list]) => list.length > 0)

  return (
    <section className="informe-materia mt-8 break-inside-avoid">
      <h3 className="border-b border-primary/30 pb-1 text-sm font-semibold text-primary">
        {String(f.materia.carpeta).padStart(2, '0')} {nombreMateria(f.materia)}
      </h3>
      <p className="mt-1 text-[11px] text-slate-500">
        {f.nT} test{f.nT === 1 ? '' : 's'} teórico{f.nT === 1 ? '' : 's'} ({nf(f.pregT)} preg.) ·{' '}
        {f.nP} práctico{f.nP === 1 ? '' : 's'} ({nf(f.pregP)} preg.) · {f.nF} mazo
        {f.nF === 1 ? '' : 's'} ({nf(f.nFichas)} fichas)
        {f.materia.sin_material && f.nArchivos === 0 ? ' · sin material' : ''}
      </p>

      {grupos.length === 0 ? (
        <p className="mt-2 text-[11px] text-slate-500">No hay tests ni fichas.</p>
      ) : (
        grupos.map(([tipo, list]) => (
          <div key={tipo} className="mt-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {TIPO_LABEL[tipo]}
            </div>
            <table className="mt-0.5 w-full text-left text-[11px]">
              <thead className="text-[10px] uppercase text-slate-400">
                <tr>
                  <th className="py-0.5 pr-2">Nombre</th>
                  <th className="py-0.5 text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {list.map((it, i) => (
                  <tr key={`${it.nombre}-${i}`} className="border-t border-slate-100">
                    <td className="py-0.5 pr-2">{it.nombre}</td>
                    <td className="py-0.5 text-right tabular-nums">{cantidad(it)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </section>
  )
}
