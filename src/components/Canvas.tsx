import { useRef, useEffect, useState, useMemo } from 'react'
import { Stage, Layer, Line } from 'react-konva'

const TILE_PX = 24
const GRID_COLS = 60
const GRID_ROWS = 40
const GRID_LINE = '#1e1e32'
const GRID_ACCENT = '#2a2a44'

export default function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ w: Math.floor(width), h: Math.floor(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const gridLines = useMemo(() => {
    const lines = []
    for (let c = 0; c <= GRID_COLS; c++) {
      const accent = c % 5 === 0
      lines.push(
        <Line
          key={`v${c}`}
          points={[c * TILE_PX, 0, c * TILE_PX, GRID_ROWS * TILE_PX]}
          stroke={accent ? GRID_ACCENT : GRID_LINE}
          strokeWidth={accent ? 1 : 0.5}
          listening={false}
        />,
      )
    }
    for (let r = 0; r <= GRID_ROWS; r++) {
      const accent = r % 5 === 0
      lines.push(
        <Line
          key={`h${r}`}
          points={[0, r * TILE_PX, GRID_COLS * TILE_PX, r * TILE_PX]}
          stroke={accent ? GRID_ACCENT : GRID_LINE}
          strokeWidth={accent ? 1 : 0.5}
          listening={false}
        />,
      )
    }
    return lines
  }, [])

  return (
    <main className="canvas-pane">
      <div ref={containerRef} className="konva-container">
        <Stage width={size.w} height={size.h}>
          <Layer>{gridLines}</Layer>
        </Stage>
      </div>
    </main>
  )
}
