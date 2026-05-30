import './App.css'
import Palette from './components/Palette'
import Canvas from './components/Canvas'
import Inspector from './components/Inspector'

export default function App() {
  return (
    <div className="app-shell">
      <Palette />
      <Canvas />
      <Inspector />
    </div>
  )
}
