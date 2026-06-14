import { useEffect, useRef } from 'react'
import type Konva from 'konva'
import { useBlueprintStore } from '../state/blueprintStore'
import { getBuilding, VARIANT_FAMILY_MAP } from '../data/catalog'
import { categoryColors } from '../constants/categoryColors'
import { TILE_PX, effectiveFootprint } from '../lib/grid'

interface Props {
  stage: Konva.Stage | null
}

const MAP_W = 160
const MAP_H = 100

export default function Minimap({ stage }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const placements = useBlueprintStore(s => s.placements)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // World dimensions in tiles — match the dynamic canvas grid
    const worldCols = stage ? stage.width()  / TILE_PX : MAP_W
    const worldRows = stage ? stage.height() / TILE_PX : MAP_H

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
  }, [placements, stage])

  return (
    <div className="minimap">
      <canvas ref={canvasRef} width={MAP_W} height={MAP_H} />
    </div>
  )
}
