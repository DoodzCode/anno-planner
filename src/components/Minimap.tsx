import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import type Konva from 'konva'
import { useBlueprintStore } from '../state/blueprintStore'
import { getBuilding, VARIANT_FAMILY_MAP } from '../data/catalog'
import { categoryColors } from '../constants/categoryColors'
import { TILE_PX, GRID_COLS, GRID_ROWS, effectiveFootprint } from '../lib/grid'

export interface MinimapHandle { redraw: () => void }

interface Props {
  stage: Konva.Stage | null
  onNavigate?: (tileX: number, tileY: number) => void
}

const MAP_W = 160
const MAP_H = 100

const Minimap = forwardRef<MinimapHandle, Props>(function Minimap({ stage, onNavigate }, ref) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const placements = useBlueprintStore(s => s.placements)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const worldCols = GRID_COLS
    const worldRows = GRID_ROWS

    const scaleX = MAP_W / worldCols
    const scaleY = MAP_H / worldRows

    ctx.clearRect(0, 0, MAP_W, MAP_H)

    ctx.fillStyle = 'rgba(10,10,22,0.6)'
    ctx.fillRect(0, 0, MAP_W, MAP_H)

    // Grid lines every 10 tiles
    ctx.strokeStyle = 'rgba(200,169,110,0.12)'
    ctx.lineWidth = 0.5
    for (let c = 0; c <= worldCols; c += 10) {
      ctx.beginPath(); ctx.moveTo(c * scaleX, 0); ctx.lineTo(c * scaleX, MAP_H); ctx.stroke()
    }
    for (let r = 0; r <= worldRows; r += 10) {
      ctx.beginPath(); ctx.moveTo(0, r * scaleY); ctx.lineTo(MAP_W, r * scaleY); ctx.stroke()
    }

    // Placements
    for (const p of placements) {
      const building = getBuilding(p.buildingId)
      if (!building) continue
      const fp = effectiveFootprint(building.footprint, p.rotation)
      const family = VARIANT_FAMILY_MAP.get(p.buildingId)
      const color = family ? categoryColors[family.category] : '#6b7280'
      ctx.fillStyle = color + 'cc'
      ctx.fillRect(p.x * scaleX, p.y * scaleY, fp.w * scaleX, fp.h * scaleY)
    }

    // Viewport rectangle
    if (stage) {
      const stagePos   = stage.position()
      const stageScale = stage.scaleX()

      const vx = -stagePos.x / stageScale / TILE_PX
      const vy = -stagePos.y / stageScale / TILE_PX
      const vw = stage.width()  / stageScale / TILE_PX
      const vh = stage.height() / stageScale / TILE_PX

      ctx.strokeStyle = 'rgba(200,169,110,0.7)'
      ctx.lineWidth = 1.2
      ctx.strokeRect(vx * scaleX, vy * scaleY, vw * scaleX, vh * scaleY)
    }
  }, [stage, placements])

  useImperativeHandle(ref, () => ({ redraw: draw }), [draw])
  useEffect(() => { draw() }, [draw])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !onNavigate) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const tileX = mx / (MAP_W / GRID_COLS)
    const tileY = my / (MAP_H / GRID_ROWS)
    onNavigate(tileX, tileY)
  }

  return (
    <div className="minimap">
      <canvas
        ref={canvasRef}
        width={MAP_W}
        height={MAP_H}
        onMouseDown={handleClick}
        style={{ cursor: 'pointer' }}
      />
    </div>
  )
})

export default Minimap
