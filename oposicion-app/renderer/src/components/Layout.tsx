import type { ReactNode } from 'react'
import { FolderOpen, LayoutDashboard, List, Settings } from 'lucide-react'

export type Screen = 'dashboard' | 'materia' | 'resumen' | 'config'

const NAV: Array<{ id: Screen; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Materias', icon: LayoutDashboard },
  { id: 'resumen', label: 'Resumen', icon: List },
  { id: 'config', label: 'Configuración', icon: Settings },
]

export function Layout({
  screen,
  onNav,
  children,
}: {
  screen: Screen
  onNav: (s: Screen) => void
  children: ReactNode
}) {
  return (
    <div className="flex h-full min-h-0">
      <aside className="no-print flex w-[210px] shrink-0 flex-col bg-primary-800 text-white">
        <div className="border-b border-white/10 px-4 py-4">
          <div className="text-[11px] uppercase tracking-wider text-primary-200">JEX A1 Jurídica</div>
          <div className="mt-0.5 text-sm font-semibold">Control de oposición</div>
        </div>
        <nav className="flex-1 p-2">
          {NAV.map((item) => {
            const Icon = item.icon
            const active =
              screen === item.id || (item.id === 'dashboard' && screen === 'materia')
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNav(item.id)}
                className={`mb-1 flex w-full items-center gap-2 rounded px-3 py-2 text-left text-[13px] ${
                  active ? 'bg-white/15 font-medium' : 'text-primary-100 hover:bg-white/10'
                }`}
              >
                <Icon size={16} />
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="px-4 py-3 text-[11px] text-primary-200">
          <FolderOpen size={12} className="mr-1 inline" />
          Gestor documental local
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto bg-slate-100 print:overflow-visible print:bg-white">{children}</main>
    </div>
  )
}
