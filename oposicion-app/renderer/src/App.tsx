import { useCallback, useState } from 'react'
import { Layout, type Screen } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { MateriaDetalle } from './pages/MateriaDetalle'
import { Resumen } from './pages/Resumen'
import { Configuracion } from './pages/Configuracion'

export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [materiaId, setMateriaId] = useState<number | null>(null)
  const [resumenMateriaId, setResumenMateriaId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null)
  const [tick, setTick] = useState(0)

  const notify = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    setToast({ msg, kind })
    window.setTimeout(() => setToast(null), 4200)
  }, [])

  const bump = useCallback(() => setTick((n) => n + 1), [])

  const goMateria = (id: number) => {
    setMateriaId(id)
    setScreen('materia')
  }

  return (
    <Layout
      screen={screen}
      onNav={(s) => {
        setScreen(s)
        if (s !== 'materia') setMateriaId(null)
        setResumenMateriaId(null)
      }}
    >
      {screen === 'dashboard' && (
        <Dashboard key={tick} onOpen={goMateria} notify={notify} onChanged={bump} />
      )}
      {screen === 'materia' && materiaId != null && (
        <MateriaDetalle
          key={`${materiaId}-${tick}`}
          materiaId={materiaId}
          onBack={() => setScreen('dashboard')}
          onResumen={() => {
            setResumenMateriaId(materiaId)
            setScreen('resumen')
          }}
          notify={notify}
          onChanged={bump}
        />
      )}
      {screen === 'resumen' && (
        <Resumen key={`res-${resumenMateriaId}-${tick}`} onOpen={goMateria} materiaId={resumenMateriaId} />
      )}
      {screen === 'config' && (
        <Configuracion
          key={tick}
          notify={notify}
          onChanged={bump}
        />
      )}
      {toast && (
        <div
          className={`no-print fixed bottom-4 right-4 z-50 max-w-sm rounded-md px-4 py-2.5 text-sm text-white shadow-lg ${
            toast.kind === 'err' ? 'bg-red-600' : 'bg-primary'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </Layout>
  )
}
