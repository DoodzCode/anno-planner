import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import type { MinimapHandle } from './Minimap'
import { Stage, Layer, Line, Rect, Group, Text, Circle } from 'react-konva'
import type Konva from 'konva'
import { useBlueprintStore } from '../state/blueprintStore'
import { getBuilding, VARIANT_FAMILY_MAP, FARM_FIELD_MAP, PAINTABLE_IDS } from '../data/catalog'
import { categoryColors } from '../constants/categoryColors'
import { useOverlayStore, OVERLAY_DEFS } from '../state/overlayStore'
import { wouldCollide } from '../lib/collide'
import Minimap from './Minimap'
import BuildingContextMenu from './BuildingContextMenu'

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

const CANVAS_W = GRID_COLS * TILE_PX
const CANVAS_H = GRID_ROWS * TILE_PX

function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  if (!t) return false
  return t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable
}

interface Box { x: number; y: number; w: number; h: number }

function toBox(ax: number, ay: number, bx: number, by: number): Box {
  return { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) }
}

function boxesOverlap(a: Box, b: Box) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

interface ContextMenuData {
  buildingName: string
  fieldIds: string[]
  x: number
  y: number
}

interface CanvasProps {
  onStageReady?: (stage: Konva.Stage) => void
}

export default function Canvas({ onStageReady }: CanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const minimapRef = useRef<MinimapHandle>(null)
  const rafPending = useRef(false)

  // Placement ghost
  const [ghostTile, setGhostTile] = useState<{ x: number; y: number } | null>(null)

  // Box-select drag (canvas coordinates)
  const [selBox, setSelBox] = useState<{ sx: number; sy: number; ex: number; ey: number } | null>(null)
  const isDrawingBox = useRef(false)

  // Spacebar / middle-mouse pan mode
  const isSpaceDown = useRef(false)
  const [isPanning, setIsPanning] = useState(false)

  // Manual left-drag pan (when no building is held)
  const isManualPanning = useRef(false)
  const panStart = useRef<{ px: number; py: number; sx: number; sy: number } | null>(null)
  const didPan = useRef(false)
  const [grabbing, setGrabbing] = useState(false)

  // Paint mode (hold left mouse + drag for paintable buildings like fields)
  const isPainting = useRef(false)
  const lastPaintTile = useRef<{ x: number; y: number } | null>(null)
  const didPaint = useRef(false)

  // Tracks the snapped tile position for each building during drag.
  const dragTileRef = useRef<Map<string, { x: number; y: number }>>(new Map())

  // Context menu for farm buildings (shows their associated field buttons)
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null)

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

  // Expose stage to parent for PNG export
  useEffect(() => {
    if (stageRef.current && onStageReady) onStageReady(stageRef.current)
  })

  // Recompute farm context menu position from current stage transform
  const updateContextMenu = useCallback(() => {
    const stage = stageRef.current
    const { placements: ps, selectedIds: ids } = useBlueprintStore.getState()
    if (!stage || ids.length !== 1) { setContextMenu(null); return }
    const placement = ps.find(p => p.id === ids[0])
    if (!placement) { setContextMenu(null); return }
    const fieldIds = FARM_FIELD_MAP.get(placement.buildingId)
    if (!fieldIds) { setContextMenu(null); return }
    const building = getBuilding(placement.buildingId)
    if (!building) { setContextMenu(null); return }
    const fp = effectiveFootprint(building.footprint, placement.rotation)
    const sc = stage.scaleX()
    const sp = stage.position()
    setContextMenu({
      buildingName: building.name,
      fieldIds,
      x: sp.x + (placement.x + fp.w / 2) * TILE_PX * sc,
      y: sp.y + placement.y * TILE_PX * sc,
    })
  }, [])

  useEffect(() => {
    updateContextMenu()
  }, [selectedIds, placements, updateContextMenu])

  const scheduleMinimapRedraw = useCallback(() => {
    if (rafPending.current) return
    rafPending.current = true
    requestAnimationFrame(() => {
      rafPending.current = false
      minimapRef.current?.redraw()
    })
  }, [])

  const handleMinimapNavigate = useCallback((tileX: number, tileY: number) => {
    const stage = stageRef.current
    if (!stage) return
    const scale = stage.scaleX()
    const pane = stage.container().parentElement
    const vw = pane?.clientWidth ?? stage.width()
    const vh = pane?.clientHeight ?? stage.height()
    stage.position({ x: vw / 2 - tileX * TILE_PX * scale, y: vh / 2 - tileY * TILE_PX * scale })
    scheduleMinimapRedraw()
    updateContextMenu()
  }, [scheduleMinimapRedraw, updateContextMenu])

  // Keyboard: all actions read from store via getState() to avoid stale closures
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e)) return

      if (e.key === ' ') {
        e.preventDefault()
        isSpaceDown.current = true
        setIsPanning(true)
        return
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        const stage = stageRef.current
        if (!stage) return
        const step = e.shiftKey ? 200 : 60
        const p = stage.position()
        if (e.key === 'ArrowLeft')  stage.position({ x: p.x + step, y: p.y })
        if (e.key === 'ArrowRight') stage.position({ x: p.x - step, y: p.y })
        if (e.key === 'ArrowUp')    stage.position({ x: p.x, y: p.y + step })
        if (e.key === 'ArrowDown')  stage.position({ x: p.x, y: p.y - step })
        scheduleMinimapRedraw(); updateContextMenu()
        return
      }

      const s = useBlueprintStore.getState()
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault(); s.undo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault(); s.redo()
      } else if (e.key === 'd' || e.key === 'D') {
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

  const gridLines = useMemo(() => {
    const lines = []
    for (let c = 0; c <= GRID_COLS; c++) {
      const accent = c % 5 === 0
      lines.push(
        <Line key={`v${c}`}
          points={[c * TILE_PX, 0, c * TILE_PX, CANVAS_H]}
          stroke={accent ? GRID_ACCENT : GRID_LINE}
          strokeWidth={accent ? 1 : 0.5} listening={false} />,
      )
    }
    for (let r = 0; r <= GRID_ROWS; r++) {
      const accent = r % 5 === 0
      lines.push(
        <Line key={`h${r}`}
          points={[0, r * TILE_PX, CANVAS_W, r * TILE_PX]}
          stroke={accent ? GRID_ACCENT : GRID_LINE}
          strokeWidth={accent ? 1 : 0.5} listening={false} />,
      )
    }
    return lines
  }, [])

  const activeBuilding = activeBuildingId ? getBuilding(activeBuildingId) : undefined

  // Ghost validity: red when the current hover tile would overlap an existing building
  const ghostValid = useMemo(() => {
    if (!ghostTile || !activeBuildingId) return true
    return !wouldCollide(placements, activeBuildingId, ghostTile.x, ghostTile.y, 0)
  }, [ghostTile, activeBuildingId, placements])

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
    updateContextMenu()
    scheduleMinimapRedraw()
  }

  // Canvas-space pointer position (accounts for viewport pan/zoom)
  const canvasPos = () => stageRef.current?.getRelativePointerPosition() ?? null

  const handleMouseMove = () => {
    // Manual pan takes priority over all other mouse-move actions
    if (isManualPanning.current) {
      const stage = stageRef.current
      const scr = stage?.getPointerPosition()
      if (stage && scr && panStart.current) {
        stage.position({
          x: panStart.current.sx + (scr.x - panStart.current.px),
          y: panStart.current.sy + (scr.y - panStart.current.py),
        })
        if (Math.abs(scr.x - panStart.current.px) > 2 || Math.abs(scr.y - panStart.current.py) > 2) {
          didPan.current = true
        }
        scheduleMinimapRedraw(); updateContextMenu()
      }
      return
    }

    const pos = canvasPos()
    if (!pos) return

    const tx = pxToTile(pos.x)
    const ty = pxToTile(pos.y)

    if (activeBuildingId) setGhostTile({ x: tx, y: ty })

    // Paint: place a tile at each new position while mouse button is held
    if (isPainting.current && activeBuildingId) {
      if (!lastPaintTile.current || lastPaintTile.current.x !== tx || lastPaintTile.current.y !== ty) {
        addPlacement(activeBuildingId, tx, ty)
        lastPaintTile.current = { x: tx, y: ty }
      }
      return
    }

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
    if (isSpaceDown.current) return

    const pos = canvasPos()
    if (!pos) return

    // Paint mode: paintable building active + left mouse down = start painting
    if (activeBuildingId && PAINTABLE_IDS.has(activeBuildingId)) {
      const tx = pxToTile(pos.x)
      const ty = pxToTile(pos.y)
      isPainting.current = true
      didPaint.current = true
      lastPaintTile.current = null
      addPlacement(activeBuildingId, tx, ty)
      lastPaintTile.current = { x: tx, y: ty }
      return
    }

    if (activeBuildingId) return  // non-paintable building: click handler places it

    // No building held: Shift+drag = box-select, plain drag = pan the view
    if (e.evt.shiftKey) {
      isDrawingBox.current = true
      setSelBox({ sx: pos.x, sy: pos.y, ex: pos.x, ey: pos.y })
      return
    }
    const stage = stageRef.current
    const scr = stage?.getPointerPosition()
    if (stage && scr) {
      panStart.current = { px: scr.x, py: scr.y, sx: stage.x(), sy: stage.y() }
      isManualPanning.current = true
      didPan.current = false
      setGrabbing(true)
    }
  }

  const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Release middle mouse pan
    if (e.evt.button === 1) {
      isSpaceDown.current = false
      setIsPanning(false)
      return
    }

    if (isManualPanning.current) {
      isManualPanning.current = false
      panStart.current = null
      setGrabbing(false)
      return
    }

    if (isPainting.current) {
      isPainting.current = false
      lastPaintTile.current = null
      return
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
    // Ignore if we just finished drawing a box, paint stroke, or drag-pan
    if (selBox || didPaint.current || didPan.current) { didPaint.current = false; didPan.current = false; return }
    if (activeBuildingId && ghostTile && ghostValid) {
      addPlacement(activeBuildingId, ghostTile.x, ghostTile.y)
    } else if (!activeBuildingId) {
      clearSelection()
    }
  }

  const isPaintable = activeBuildingId ? PAINTABLE_IDS.has(activeBuildingId) : false
  const cursor = grabbing ? 'grabbing'
    : isPanning ? 'grab'
    : activeBuildingId
      ? (ghostValid ? (isPaintable ? 'cell' : 'crosshair') : 'not-allowed')
      : 'grab'

  const selectionRect = selBox
    ? toBox(selBox.sx, selBox.sy, selBox.ex, selBox.ey)
    : null

  return (
    <main className="canvas-pane">
      <Minimap ref={minimapRef} stage={stageRef.current} onNavigate={handleMinimapNavigate} />
      {contextMenu && (
        <BuildingContextMenu
          {...contextMenu}
          onSelectField={(fieldId) => {
            setActiveBuildingId(fieldId)
            clearSelection()
          }}
        />
      )}
      <div className="konva-container" style={{ cursor }}>
        <Stage
          ref={stageRef}
          width={CANVAS_W}
          height={CANVAS_H}
          draggable={isPanning}
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={handleStageClick}
          onDragMove={() => { updateContextMenu(); scheduleMinimapRedraw() }}
          onMouseLeave={() => {
            setGhostTile(null)
            isDrawingBox.current = false
            setSelBox(null)
            if (isPainting.current) {
              isPainting.current = false
              lastPaintTile.current = null
            }
            if (isManualPanning.current) {
              isManualPanning.current = false
              panStart.current = null
              setGrabbing(false)
            }
          }}
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
                    const tx = pxToTile(sx)
                    const ty = pxToTile(sy)
                    const currentPlacements = useBlueprintStore.getState().placements
                    if (!wouldCollide(currentPlacements, p.buildingId, tx, ty, p.rotation, p.id)) {
                      dragTileRef.current.set(p.id, { x: tx, y: ty })
                    }
                    const tracked = dragTileRef.current.get(p.id) ?? { x: p.x, y: p.y }
                    return { x: sp.x + tileToPx(tracked.x) * sc, y: sp.y + tileToPx(tracked.y) * sc }
                  }}
                  onDragStart={(e) => {
                    e.cancelBubble = true
                  }}
                  onDragEnd={(e) => {
                    e.cancelBubble = true
                    const tracked = dragTileRef.current.get(p.id)
                    dragTileRef.current.delete(p.id)
                    if (tracked) {
                      movePlacement(p.id, tracked.x, tracked.y)
                    } else {
                      const pos = e.target.position()
                      movePlacement(p.id, pxToTile(pos.x), pxToTile(pos.y))
                    }
                    if (!useBlueprintStore.getState().selectedIds.includes(p.id)) {
                      setSelectedIds([p.id])
                    }
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

            {/* Ghost preview — red when position is occupied */}
            {activeBuilding && ghostTile && (
              <Rect
                x={tileToPx(ghostTile.x)} y={tileToPx(ghostTile.y)}
                width={tileToPx(activeBuilding.footprint.w)}
                height={tileToPx(activeBuilding.footprint.h)}
                fill={ghostValid ? getBuildingColor(activeBuilding.id) : '#ef4444'}
                opacity={ghostValid ? 0.35 : 0.45}
                stroke={ghostValid ? getBuildingColor(activeBuilding.id) : '#ef4444'}
                strokeWidth={1}
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
