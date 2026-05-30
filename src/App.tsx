import { useEffect } from 'react'
import './App.css'
import Palette from './components/Palette'
import Canvas from './components/Canvas'
import Inspector from './components/Inspector'
import OverlayBar from './components/OverlayBar'
import { loadCurrentBlueprint, startAutoSave } from './state/persistence'

export default function App() {
  useEffect(() => {
    let unsub: (() => void) | null = null
    loadCurrentBlueprint().then(() => {
      unsub = startAutoSave()
    })
    return () => unsub?.()
  }, [])

  return (
    <div className="app-shell">
      <Palette />
      <div className="canvas-column">
        <OverlayBar />
        <Canvas />
      </div>
      <Inspector />
    </div>
  )
}
