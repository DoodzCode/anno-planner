import { useBlueprintStore } from '../state/blueprintStore'
import { BUILDING_MAP } from '../data/catalog'
import { effectiveFootprint } from '../lib/grid'

export default function Inspector() {
  const selectedIds = useBlueprintStore((s) => s.selectedIds)
  const placements = useBlueprintStore((s) => s.placements)
  const canUndo = useBlueprintStore((s) => s.past.length > 0)
  const canRedo = useBlueprintStore((s) => s.future.length > 0)
  const undo = useBlueprintStore((s) => s.undo)
  const redo = useBlueprintStore((s) => s.redo)

  const selected = placements.filter((p) => selectedIds.includes(p.id))
  const single = selected.length === 1 ? selected[0] : null
  const building = single ? BUILDING_MAP.get(single.buildingId) : undefined

  return (
    <aside className="inspector">
      <h2>Inspector</h2>

      {building && single ? (
        <div className="inspector-content">
          <div className="inspector-swatch" style={{ background: building.color }} />
          <div className="inspector-name">{building.name}</div>
          <Row label="Category" value={building.category} />
          <Row label="Tier" value={building.tier} />
          <Row
            label="Footprint"
            value={`${effectiveFootprint(building.footprint, single.rotation).w}×${effectiveFootprint(building.footprint, single.rotation).h}`}
          />
          <Row label="Rotation" value={`${single.rotation}°`} />
          {building.influenceRadius !== undefined && (
            <Row label="Influence" value={`${building.influenceRadius} tiles`} />
          )}
          {building.inputs && <Row label="Inputs" value={building.inputs.join(', ')} />}
          {building.outputs && <Row label="Outputs" value={building.outputs.join(', ')} />}
          {building.productionTime !== undefined && (
            <Row label="Cycle" value={`${building.productionTime}s`} />
          )}
          <p className="inspector-hint">R — rotate · Del — delete · Shift+click — multi</p>
        </div>
      ) : selected.length > 1 ? (
        <div className="inspector-content">
          <div className="inspector-name">{selected.length} buildings selected</div>
          <p className="inspector-hint">R — rotate all · Del — delete all</p>
        </div>
      ) : (
        <p className="placeholder-note">Click to select · Drag canvas to box-select</p>
      )}

      <div className="inspector-stats">
        <h2>Canvas</h2>
        <Row label="Placed" value={String(placements.length)} />
        <Row label="Selected" value={String(selectedIds.length)} />
        <div className="inspector-undo-row">
          <button
            className="inspector-btn"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            ↩ Undo
          </button>
          <button
            className="inspector-btn"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            Redo ↪
          </button>
        </div>
      </div>
    </aside>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="inspector-row">
      <span className="inspector-row-label">{label}</span>
      <span className="inspector-row-value">{value}</span>
    </div>
  )
}
