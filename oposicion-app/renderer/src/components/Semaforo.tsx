export function PuntoCobertura({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      title={label}
      className={`inline-block h-2.5 w-2.5 rounded-full ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}
    />
  )
}
