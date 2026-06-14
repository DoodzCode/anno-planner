import { useRef, useEffect, useState, useMemo } from 'react'
import { Stage, Layer, Line, Rect, Group, Text, Circle } from 'react-konva'
import type Konva from 'konva'
import { useBlueprintStore } from '../state/blueprintStore'
import { getBuilding, VARIANT_FAMILY_MAP } from '../data/catalog'
import { categoryColors } from '../constants/categoryColors'
import { useOverlayStore, OVERLAY_DEFS } from '../state/overlayStore'
import Minimap from './Minimap'

function getBuildingColor(buildingId: string): string {
  const family = VARIANT_FAMILY_MAP.get(buildingId)
  return family ? categoryColors[family.category] : '#6b7280'
}
import {
  TILE_PX,
  GRID_COLS,
  GRID_ROWS,
  tileToPx,
  pxToTile,
  snapToGrid,
  effectiveFootprint,
} from '../lib/grid'

const GRID_LINE = '#1e1e32'
const GRID_ACCENT = '#2a2a44'
const MIN_SCALE = 0.2
const MAX_SCALE = 5
const ZOOM_FACTOR = 1.12

interface Box { x: number; y: number; w: number; h: number }

function toBox(ax: number, ay: number, bx: number, by: number): Box {
  return { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) }
}

function boxesOverlap(a: Box, b: Box) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

interface CanvasProps {
  onStageReady?: (stage: Konva.Stage) => void
}

export default function Canvas({ onStageReady }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })

  // Placement ghost
  const [ghostTile, setGhostTile] = useState<{ x: number; y: number } | null>(null)

  // Box-select drag (canvas coordinates)
  const [selBox, setSelBox] = useState<{ sx: number; sy: number; ex: number; ey: number } | null>(null)
  const isDrawingBox = useRef(false)

  // Pan mode
  const isSpaceDown = useRef(false)
  const [isPanning, setIsPanning] = useState(false)

  const activeOverlays = useOverlayStore((s) => s.active)
  const overlayColorMap = useMemo(
    () => new Map(OVERLAY_DEFS.map(d => [d.id, d.color])),
    []
  )

  // Store
  const placements = useBlueprintStore((s) => s.placements)
  const selectedIds = useBlueprintStore((s) => s.selectedIds)
  const activeBuildingId = useBlueprintStore((s) => s.activeBuildingId)
  const addPlacement = useBlueprintStore((s) => s.addPlacement)
  const movePlacement = useBlueprintStore((s) => s.movePlacement)
  const toggleSelected = useBlueprintStore((s) => s.toggleSelected)
  const setSelectedIds = useBlueprintStore((s) => s.setSelectedIds)
  const clearSelection = useBlueprintStore((s) => s.clearSelection)
  const setActiveBuildingId = useBlueprintStore((s) => s.setActiveBuildingId)

  // Resize
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

  // Expose stage to parent for PNG export
  useEffect(() => {
    if (stageRef.current && onStageReady) onStageReady(stageRef.current)
  })

  // Keyboard: all actions read from store via getState() to avoid stale closures
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        isSpaceDown.current = true
        setIsPanning(true)
        return
      }
      const s = useBlueprintStore.getState()
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault(); s.undo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault(); s.redo()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        s.deleteSelected()
      } else if (e.key === 'r' || e.key === 'R') {
        s.rotateSelected()
      } else if (e.key === 'Escape') {
        s.clearSelection()
        s.setActiveBuildingId(null)
        setGhostTile(null)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') { isSpaceDown.current = false; setIsPanning(false) }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Grid lines sized to fill the canvas pane at current dimensions
  const gridLines = useMemo(() => {
    const cols = Math.ceil(size.w / TILE_PX) + 1
    const rows = Math.ceil(size.h / TILE_PX) + 1
    const totalH = rows * TILE_PX
    const totalW = cols * TILE_PX
    const lines = []
    for (let c = 0; c <= cols; c++) {
      const accent = c % 5 === 0
      lines.push(
        <Line key={`v${c}`}
          points={[c * TILE_PX, 0, c * TILE_PX, totalH]}
          stroke={accent ? GRID_ACCENT : GRID_LINE}
          strokeWidth={accent ? 1 : 0.5} listening={false} />,
      )
    }
    for (let r = 0; r <= rows; r++) {
      const accent = r % 5 === 0
      lines.push(
        <Line key={`h${r}`}
          points={[0, r * TILE_PX, totalW, r * TILE_PX]}
          stroke={accent ? GRID_ACCENT : GRID_LINE}
          strokeWidth={accent ? 1 : 0.5} listening={false} />,
      )
    }
    return lines
  }, [size.w, size.h])

  const activeBuilding = activeBuildingId ? getBuilding(activeBuildingId) : undefined

  // Zoom-to-pointer on wheel (imperative — avoids 60fps React re-renders)
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const newScale = Math.max(
      MIN_SCALE,
      Math.min(MAX_SCALE, e.evt.deltaY < 0 ? oldScale * ZOOM_FACTOR : oldScale / ZOOM_FACTOR),
    )
    const origin = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale }
    stage.scale({ x: newScale, y: newScale })
    stage.position({ x: pointer.x - origin.x * newScale, y: pointer.y - origin.y * newScale })
  }

  // Canvas-space pointer position (accounts for viewport pan/zoom)
  const canvasPos = () => stageRef.current?.getRelativePointerPosition() ?? null

  const handleMouseMove = () => {
    const pos = canvasPos()
    if (!pos) return
    if (activeBuildingId) setGhostTile({ x: pxToTile(pos.x), y: pxToTile(pos.y) })
    if (isDrawingBox.current) {
      setSelBox((b) => b ? { ...b, ex: pos.x, ey: pos.y } : null)
    }
  }

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Middle mouse: start pan regardless
    if (e.evt.button === 1) {
      e.evt.preventDefault()
      isSpaceDown.current = true
      setIsPanning(true)
      return
    }
    if (isSpaceDown.current || activeBuildingId) return
    const pos = canvasPos()
    if (!pos) return
    isDrawingBox.current = true
    setSelBox({ sx: pos.x, sy: pos.y, ex: pos.x, ey: pos.y })
  }

  const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Release middle mouse pan
    if (e.evt.button === 1) {
      isSpaceDown.current = false
      setIsPanning(false)
    }

    if (!isDrawingBox.current) return
    isDrawingBox.current = false

    if (!selBox) return
    const box = toBox(selBox.sx, selBox.sy, selBox.ex, selBox.ey)
    setSelBox(null)

    // Only register as a box-select if dragged meaningfully
    if (box.w < 4 && box.h < 4) {
      clearSelection()
      return
    }

    const ids = useBlueprintStore.getState().placements
      .filter((p) => {
        const b = getBuilding(p.buildingId)
        if (!b) return false
        const fp = effectiveFootprint(b.footprint, p.rotation)
        return boxesOverlap(box, {
          x: tileToPx(p.x), y: tileToPx(p.y),
          w: tileToPx(fp.w), h: tileToPx(fp.h),
        })
      })
      .map((p) => p.id)
    setSelectedIds(ids)
  }

  const handleStageClick = () => {
    // Ignore if we just finished drawing a box (mouseup already handled it)
    if (selBox) return
    if (activeBuildingId && ghostTile) {
      addPlacement(activeBuildingId, ghostTile.x, ghostTile.y)
    } else if (!activeBuildingId) {
      clearSelection()
    }
  }

  const cursor = isPanning ? 'grab' : activeBuildingId ? 'crosshair' : selBox ? 'default' : 'default'

  const selectionRect = selBox
    ? toBox(selBox.sx, selBox.sy, selBox.ex, selBox.ey)
    : null

  return (
    <main className="canvas-pane">
      <Minimap stage={stageRef.current} />
      <div ref={containerRef} className="konva-container" style={{ cursor }}>
        <Stage
          ref={stageRef}
          width={size.w}
          height={size.h}
          draggable={isPanning}
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={handleStageClick}
          onMouseLeave={() => { setGhostTile(null); isDrawingBox.current = false; setSelBox(null) }}
        >
          <Layer listening={false}>{gridLines}</Layer>

          {/* Influence radius overlay circles */}
          {activeOverlays.size > 0 && (
            <Layer listening={false}>
              {placements.map((p) => {
                const building = getBuilding(p.buildingId)
                if (!building?.overlayType) return null
                if (!activeOverlays.has(building.overlayType)) return null
                const color = overlayColorMap.get(building.overlayType) ?? '#ffffff'
                const fp = effectiveFootprint(building.footprint, p.rotation)
                const cx = tileToPx(p.x) + tileToPx(fp.w) / 2
                const cy = tileToPx(p.y) + tileToPx(fp.h) / 2
                const r = (building.influenceRadius ?? 0) * TILE_PX
                return (
                  <Circle
                    key={`overlay-${p.id}`}
                    x={cx} y={cy}
                    radius={r}
                    fill={`${color}18`}
                    stroke={color}
                    strokeWidth={1}
                    dash={[6, 4]}
                    opacity={0.85}
                  />
                )
              })}
            </Layer>
          )}

          <Layer>
            {placements.map((p) => {
              const building = getBuilding(p.buildingId)
              if (!building) return null
              const fp = effectiveFootprint(building.footprint, p.rotation)
              const pw = tileToPx(fp.w)
              const ph = tileToPx(fp.h)
              const isSelected = selectedIds.includes(p.id)

              return (
                <Group
                  key={p.id}
                  x={tileToPx(p.x)}
                  y={tileToPx(p.y)}
                  draggable
                  dragBoundFunc={(pos) => {
                    const stage = stageRef.current
                    if (!stage) return pos
                    const sc = stage.scaleX()
                    const sp = stage.position()
                    const cx = (pos.x - sp.x) / sc
                    const cy = (pos.y - sp.y) / sc
                    const maxX = tileToPx(GRID_COLS - fp.w)
                    const maxY = tileToPx(GRID_ROWS - fp.h)
                    const sx = Math.max(0, Math.min(maxX, snapToGrid(cx)))
                    const sy = Math.max(0, Math.min(maxY, snapToGrid(cy)))
                    return { x: sp.x + sx * sc, y: sp.y + sy * sc }
                  }}
                  onDragStart={(e) => {
                    e.cancelBubble = true
                    if (!selectedIds.includes(p.id)) {
                      setSelectedIds([p.id])
                    }
                  }}
                  onDragEnd={(e) => {
                    const pos = e.target.position()
                    movePlacement(p.id, pxToTile(pos.x), pxToTile(pos.y))
                  }}
                  onMouseDown={(e) => { e.cancelBubble = true }}
                  onClick={(e) => {
                    e.cancelBubble = true
                    toggleSelected(p.id, e.evt.shiftKey)
                    setActiveBuildingId(null)
                    setGhostTile(null)
                  }}
                >
                  {/* Base fill */}
                  <Rect
                    width={pw} height={ph}
                    fill={getBuildingColor(p.buildingId)} opacity={0.78}
                    stroke={isSelected ? '#c8a96e' : 'rgba(0,0,0,0.25)'}
                    strokeWidth={isSelected ? 2 : 0.5}
                    cornerRadius={3}
                  />
                  {/* Category accent band at top */}
                  <Rect
                    width={pw} height={Math.max(3, ph * 0.12)}
                    fill="rgba(255,255,255,0.18)"
                    cornerRadius={[3, 3, 0, 0]}
                    listening={false}
                  />
                  {/* Building name label */}
                  <Text
                    text={building.name}
                    fontSize={Math.max(7, Math.min(9, pw / 5))}
                    fill="#ffffff" opacity={0.92}
                    width={pw} height={ph}
                    align="center" verticalAlign="middle"
                    wrap="none" ellipsis listening={false} padding={3}
                    shadowColor="rgba(0,0,0,0.6)" shadowBlur={2} shadowOffsetY={1}
                  />
                </Group>
              )
            })}

            {/* Ghost preview */}
            {activeBuilding && ghostTile && (
              <Rect
                x={tileToPx(ghostTile.x)} y={tileToPx(ghostTile.y)}
                width={tileToPx(activeBuilding.footprint.w)}
                height={tileToPx(activeBuilding.footprint.h)}
                fill={getBuildingColor(activeBuilding.id)} opacity={0.35}
                stroke={getBuildingColor(activeBuilding.id)} strokeWidth={1}
                dash={[4, 2]} listening={false}
              />
            )}

            {/* Box-select rectangle */}
            {selectionRect && (
              <Rect
                x={selectionRect.x} y={selectionRect.y}
                width={selectionRect.w} height={selectionRect.h}
                fill="rgba(200,169,110,0.07)"
                stroke="#c8a96e" strokeWidth={1}
                dash={[4, 3]} listening={false}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </main>
  )
}
