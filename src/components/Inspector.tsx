import { useMemo } from 'react'
import { useBlueprintStore } from '../state/blueprintStore'
import { BUILDING_MAP } from '../data/catalog'
import { CHAIN_NAME_MAP, CHAIN_BUILDING_MAP, GOODS_MAP } from '../data/chainNameMap'
import { aggregateFlows, goodsTallies, workforceTotals } from '../lib/productionMath'
import { effectiveFootprint } from '../lib/grid'

export default function Inspector() {
  const selectedIds = useBlueprintStore((s) => s.selectedIds)
  const placements  = useBlueprintStore((s) => s.placements)
  const canUndo     = useBlueprintStore((s) => s.past.length > 0)
  const canRedo     = useBlueprintStore((s) => s.future.length > 0)
  const undo        = useBlueprintStore((s) => s.undo)
  const redo        = useBlueprintStore((s) => s.redo)

  const selected = placements.filter((p) => selectedIds.includes(p.id))
  const single   = selected.length === 1 ? selected[0] : null
  const building = single ? BUILDING_MAP.get(single.buildingId) : undefined

  // Production tallies — recompute only when placements change
  const allFlows = useMemo(() => {
    const resolve = (p: typeof placements[number]) => {
      const cat = BUILDING_MAP.get(p.buildingId)
      if (!cat) return null
      const chainId = CHAIN_NAME_MAP.get(cat.name)
      if (!chainId) return null
      const chain = CHAIN_BUILDING_MAP.get(chainId)
      if (!chain) return null
      return { chain, ctx: {} }
    }
    return aggregateFlows(placements, resolve)
  }, [placements])

  const TIER_LABELS: Record<string, string> = {
    farmers: 'Farmers', workers: 'Workers', artisans: 'Artisans',
    engineers: 'Engineers', investors: 'Investors',
    jornaleros: 'Jornaleros', obreros: 'Obreros',
  }

  const tallyEntries = useMemo(() => {
    const goods = goodsTallies(allFlows)
    const entries: Array<{ goodId: string; name: string; produced: number; consumed: number; net: number }> = []
    for (const [goodId, tally] of goods) {
      if (tally.produced === 0 && tally.consumed === 0) continue
      const good = GOODS_MAP.get(goodId)
      entries.push({ goodId, name: good?.name ?? goodId, ...tally })
    }
    return entries.sort((a, b) => b.net - a.net)
  }, [allFlows])

  const workforceEntries = useMemo(() => {
    const wf = workforceTotals(allFlows)
    return [...wf.entries()]
      .filter(([, t]) => t.consumed > 0)
      .map(([tier, t]) => ({ tier, consumed: t.consumed }))
      .sort((a, b) => a.tier.localeCompare(b.tier))
  }, [allFlows])

  return (
    <aside className="inspector">
      <h2>Inspector</h2>

      {building && single ? (
        <div className="inspector-content">
          <div className="inspector-swatch" style={{ background: building.color }} />
          <div className="inspector-name">{building.name}</div>
          <Row label="Category" value={building.category} />
          <Row label="Tier"     value={building.tier} />
          <Row
            label="Footprint"
            value={`${effectiveFootprint(building.footprint, single.rotation).w}×${effectiveFootprint(building.footprint, single.rotation).h}`}
          />
          <Row label="Rotation" value={`${single.rotation}°`} />
          {building.influenceRadius !== undefined && (
            <Row label="Influence" value={`${building.influenceRadius} tiles`} />
          )}
          {building.inputs  && <Row label="Inputs"  value={building.inputs.join(', ')} />}
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

      {/* Production tallies */}
      {tallyEntries.length > 0 && (
        <div className="inspector-tallies">
          <h2>Production</h2>
          <div className="tally-header-row">
            <span className="tally-good" />
            <span className="tally-col tally-col--produced">↑ Prod</span>
            <span className="tally-col tally-col--consumed">↓ Cons</span>
            <span className="tally-col tally-col--net">Net</span>
          </div>
          {tallyEntries.map(({ goodId, name, produced, consumed, net }) => (
            <div key={goodId} className="tally-row">
              <span className="tally-good" title={goodId}>{name}</span>
              <span className="tally-col tally-col--produced">
                {produced > 0 ? `+${produced.toFixed(2)}` : '—'}
              </span>
              <span className="tally-col tally-col--consumed">
                {consumed > 0 ? `−${consumed.toFixed(2)}` : '—'}
              </span>
              <span
                className="tally-col tally-col--net"
                style={{ color: net > 0.005 ? '#4caf7d' : net < -0.005 ? '#e05c5c' : '#6a6a90' }}
              >
                {net > 0 ? '+' : ''}{net.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Workforce panel */}
      {workforceEntries.length > 0 && (
        <div className="inspector-workforce">
          <h2>Workforce</h2>
          {workforceEntries.map(({ tier, consumed }) => (
            <div key={tier} className="tally-row">
              <span className="tally-good">{TIER_LABELS[tier] ?? tier}</span>
              <span className="tally-col tally-col--consumed">{consumed.toFixed(0)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="inspector-stats">
        <h2>Canvas</h2>
        <Row label="Placed"   value={String(placements.length)} />
        <Row label="Selected" value={String(selectedIds.length)} />
        <div className="inspector-undo-row">
          <button className="inspector-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            ↩ Undo
          </button>
          <button className="inspector-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
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
