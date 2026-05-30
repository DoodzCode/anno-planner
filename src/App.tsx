import { useEffect } from 'react'
import './App.css'
import Palette from './components/Palette'
import Canvas from './components/Canvas'
import Inspector from './components/Inspector'
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
      <Canvas />
      <Inspector />
    </div>
  )
}
