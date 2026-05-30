import { BUILDINGS } from '../data/catalog'
import { useBlueprintStore } from '../state/blueprintStore'
import { TILE_PX } from '../lib/grid'

const PREVIEW_SCALE = 0.5

export default function Palette() {
  const activeBuildingId = useBlueprintStore((s) => s.activeBuildingId)
  const setActiveBuildingId = useBlueprintStore((s) => s.setActiveBuildingId)
  const clearSelection = useBlueprintStore((s) => s.clearSelection)

  const handleClick = (id: string) => {
    clearSelection()
    setActiveBuildingId(activeBuildingId === id ? null : id)
  }

  return (
    <aside className="palette">
      <h2>Buildings</h2>
      <div className="palette-list">
        {BUILDINGS.map((b) => {
          const pw = b.footprint.w * TILE_PX * PREVIEW_SCALE
          const ph = b.footprint.h * TILE_PX * PREVIEW_SCALE
          const isActive = activeBuildingId === b.id
          return (
            <button
              key={b.id}
              className={`palette-item${isActive ? ' palette-item--active' : ''}`}
              onClick={() => handleClick(b.id)}
              title={`${b.name} — ${b.footprint.w}×${b.footprint.h} tiles`}
            >
              <div
                className="palette-preview"
                style={{ width: pw, height: ph, background: b.color }}
              />
              <div className="palette-info">
                <span className="palette-label">{b.name}</span>
                <span className="palette-size">
                  {b.footprint.w}×{b.footprint.h}
                </span>
              </div>
            </button>
          )
        })}
      </div>
      {activeBuildingId && (
        <p className="palette-hint">Click canvas to place · Esc to cancel</p>
      )}
    </aside>
  )
}
