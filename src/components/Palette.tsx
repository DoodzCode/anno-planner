import { useState, useMemo } from 'react'
import { BUILDINGS, TIERS } from '../data/catalog'
import { useBlueprintStore } from '../state/blueprintStore'
import { TILE_PX } from '../lib/grid'

const PREVIEW_SCALE = 0.4
const MAX_PREVIEW = 32
const MIN_PREVIEW = 10

const DLC_COLOR: Record<string, string> = {
  'Seat of Power':        '#c8a820',
  'Empire of the Skies':  '#70a0c0',
  'Seeds of Change':      '#60a840',
  'Docklands':            '#3090b0',
}

function dlcLabel(dlc: string) {
  const abbrevs: Record<string, string> = {
    'Seat of Power':        'SoP',
    'Empire of the Skies':  'EotS',
    'Seeds of Change':      'SoC',
    'Docklands':            'DL',
  }
  return abbrevs[dlc] ?? dlc.slice(0, 4)
}

const CATEGORY_ORDER = ['residence', 'public', 'production', 'harbor', 'military']
const CATEGORY_LABEL: Record<string, string> = {
  residence: 'Residences', public: 'Public', production: 'Production',
  harbor: 'Harbor', military: 'Military',
}

export default function Palette({ leftWidth = 220 }: { leftWidth?: number }) {
  const columns = leftWidth >= 390 ? 3 : leftWidth >= 280 ? 2 : 1
  const maxPrev = columns > 1 ? 52 : 32
  const activeBuildingId = useBlueprintStore((s) => s.activeBuildingId)
  const setActiveBuildingId = useBlueprintStore((s) => s.setActiveBuildingId)
  const clearSelection = useBlueprintStore((s) => s.clearSelection)

  const [search, setSearch] = useState('')
  const [tier, setTier] = useState('all')

  const handleClick = (id: string) => {
    clearSelection()
    setActiveBuildingId(activeBuildingId === id ? null : id)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return BUILDINGS.filter(b => {
      if (tier !== 'all' && tier !== 'all-world' && b.tier !== tier) return false
      if (tier === 'all-world' && b.tier !== 'all') return false
      if (q && !b.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [search, tier])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const b of filtered) {
      const key = b.category
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(b)
    }
    return map
  }, [filtered])

  const orderedKeys = CATEGORY_ORDER.filter(k => grouped.has(k))

  return (
    <aside className="palette">
      <div className="palette-header">
        <h2>Buildings</h2>
        <input
          className="palette-search"
          type="search"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="palette-tiers">
        {TIERS.map(t => (
          <button
            key={t.id}
            className={`tier-btn${tier === t.id ? ' tier-btn--active' : ''}`}
            onClick={() => setTier(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="palette-list">
        {orderedKeys.map(cat => (
          <div key={cat} className="palette-group">
            <div className="palette-group-header">{CATEGORY_LABEL[cat] ?? cat}</div>
            {grouped.get(cat)!.map(b => {
              const pw = Math.max(MIN_PREVIEW, Math.min(maxPrev, b.footprint.w * TILE_PX * PREVIEW_SCALE))
              const ph = Math.max(MIN_PREVIEW, Math.min(maxPrev, b.footprint.h * TILE_PX * PREVIEW_SCALE))
              const isActive = activeBuildingId === b.id
              return (
                <button
                  key={b.id}
                  className={`palette-item${isActive ? ' palette-item--active' : ''}`}
                  onClick={() => handleClick(b.id)}
                  title={`${b.name} — ${b.footprint.w}×${b.footprint.h} tiles${b.dlc ? ` · ${b.dlc}` : ''}`}
                >
                  <div
                    className="palette-preview"
                    style={{ width: pw, height: ph, background: b.color }}
                  />
                  <div className="palette-info">
                    <span className="palette-label">{b.name}</span>
                    <span className="palette-size">
                      {b.footprint.w}×{b.footprint.h}
                      {b.dlc && (
                        <span
                          className="dlc-badge"
                          style={{ background: DLC_COLOR[b.dlc] ?? '#5a5a80' }}
                        >
                          {dlcLabel(b.dlc)}
                        </span>
                      )}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="palette-empty">No buildings match</p>
        )}
      </div>

      {activeBuildingId && (
        <p className="palette-hint">Click canvas to place · Esc to cancel</p>
      )}
    </aside>
  )
}
