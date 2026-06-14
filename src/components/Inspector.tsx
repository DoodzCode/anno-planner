import { useMemo } from 'react'
import { useBlueprintStore } from '../state/blueprintStore'
import { VARIANT_MAP, VARIANT_FAMILY_MAP } from '../data/catalog'
import { categoryColors } from '../constants/categoryColors'
import rawGoods from '../data/goods.json'
import { aggregateFlows, goodsTallies, workforceTotals, variantToChainBuilding } from '../lib/productionMath'
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
  const variant  = single ? VARIANT_MAP.get(single.buildingId) : undefined
  const family   = variant ? VARIANT_FAMILY_MAP.get(variant.id) : undefined

  const GOODS_MAP = new Map((rawGoods as { id: string; name: string }[]).map(g => [g.id, g]))

  // Production tallies — recompute only when placements change
  const allFlows = useMemo(() => {
    const resolve = (p: typeof placements[number]) => {
      const variant = VARIANT_MAP.get(p.buildingId)
      if (variant) {
        const chain = variantToChainBuilding(variant)
        if (chain) return { chain, ctx: {} }
      }
      return null
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

      {variant && family && single ? (
        <div className="inspector-content">
          <div className="inspector-swatch" style={{ background: categoryColors[family.category] }} />
          <div className="inspector-name">{variant.name}</div>
          <Row label="Category" value={family.category.replace('_', ' ')} />
          <Row label="Tier"     value={variant.tier || 'all'} />
          <Row
            label="Footprint"
            value={`${effectiveFootprint(variant.footprint, single.rotation).w}×${effectiveFootprint(variant.footprint, single.rotation).h}`}
          />
          <Row label="Rotation" value={`${single.rotation}°`} />
          {variant.influenceRadius !== undefined && (
            <Row label="Influence" value={`${variant.influenceRadius} tiles`} />
          )}
          {variant.production?.inputs && variant.production.inputs.length > 0 && (
            <Row label="Inputs" value={variant.production.inputs.map(i => i.good).join(', ')} />
          )}
          {variant.production?.output && (
            <Row label="Outputs" value={variant.production.output.good} />
          )}
          {variant.production?.baseCycleSeconds !== undefined && (
            <Row label="Cycle" value={`${variant.production.baseCycleSeconds}s`} />
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
