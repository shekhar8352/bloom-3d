import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Chrome } from './components/Chrome'
import { LoadingScreen } from './components/LoadingScreen'
import { Scene } from './components/Scene'
import { useBouquet } from './store/bouquetStore'
import { useUi } from './store/uiStore'

const Playground = lazy(() => import('./components/playground/Playground'))

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="grid h-full place-items-center bg-[#f3e6dc] px-6 text-center text-ink">
          <div className="max-w-sm">
            <h1 className="font-serif text-5xl">Bloom</h1>
            <p className="mt-3 text-ink/75">
              This browser could not start the 3D view. Try another browser, or update the graphics drivers.
            </p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const ready = useUi((state) => state.sceneReady)
  const open = useUi((state) => state.playgroundOpen)
  const [hold, setHold] = useState(true)
  const [builderMounted, setBuilderMounted] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => setHold(false), 900)
    const backup = window.setTimeout(() => useUi.getState().setSceneReady(true), 5000)
    return () => {
      window.clearTimeout(timeout)
      window.clearTimeout(backup)
    }
  }, [])

  useEffect(() => {
    if (open) setBuilderMounted(true)
  }, [open])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }
      const meta = event.metaKey || event.ctrlKey
      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) useBouquet.getState().redo()
        else useBouquet.getState().undo()
      } else if (meta && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        useBouquet.getState().redo()
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && useUi.getState().playgroundOpen) {
        const id = useBouquet.getState().selectedId
        if (!id) return
        event.preventDefault()
        useBouquet.getState().removeFlower(id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <SceneBoundary>
      <div className="relative h-full w-full overflow-hidden">
        <Scene />
        <Chrome />
        {builderMounted && (
          <Suspense fallback={null}>
            <Playground />
          </Suspense>
        )}
        <LoadingScreen visible={!(ready && !hold)} />
      </div>
    </SceneBoundary>
  )
}
