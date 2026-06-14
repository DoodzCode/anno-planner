import { useState, useMemo, useEffect } from 'react'
import { FAMILIES, FAMILY_CATEGORIES, TIERS } from '../data/catalog'
import { useBlueprintStore } from '../state/blueprintStore'
import { TILE_PX } from '../lib/grid'
import { categoryColors } from '../constants/categoryColors'
import type { BuildingCategory } from '../types/domain'

const TIER_LABELS: Record<string, string> = {
  farmers: 'F',
  workers: 'W',
  artisans: 'A',
  engineers: 'E',
  investors: 'I',
  scholars: 'S'
}

const PREVIEW_SCALE = 0.4
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

export default function Palette({ leftWidth = 220 }: { leftWidth?: number }) {
  const columns = leftWidth >= 390 ? 3 : leftWidth >= 280 ? 2 : 1
  const maxPrev = columns > 1 ? 52 : 32
  const activeBuildingId = useBlueprintStore((s) => s.activeBuildingId)
  const setActiveBuildingId = useBlueprintStore((s) => s.setActiveBuildingId)
  const clearSelection = useBlueprintStore((s) => s.clearSelection)

  const [search, setSearch] = useState('')
  const [tier, setTier] = useState('all')

  const [selectedVariantIds, setSelectedVariantIds] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('anno-planner-selected-variants')
      return saved ? JSON.parse(saved) : {}
    } catch (e) {
      return {}
    }
  })

  useEffect(() => {
    if (activeBuildingId) {
      const family = FAMILIES.find(f => f.variants.some(v => v.id === activeBuildingId))
      if (family) {
        setSelectedVariantIds(prev => {
          if (prev[family.id] === activeBuildingId) return prev
          const next = { ...prev, [family.id]: activeBuildingId }
          localStorage.setItem('anno-planner-selected-variants', JSON.stringify(next))
          return next
        })
      }
    }
  }, [activeBuildingId])

  const handleSelectVariant = (familyId: string, variantId: string) => {
    setSelectedVariantIds(prev => {
      const next = { ...prev, [familyId]: variantId }
      localStorage.setItem('anno-planner-selected-variants', JSON.stringify(next))
      return next
    })

    const family = FAMILIES.find(f => f.id === familyId)
    if (family && activeBuildingId && family.variants.some(v => v.id === activeBuildingId)) {
      setActiveBuildingId(variantId)
    }
  }

  const handleClick = (id: string) => {
    clearSelection()
    setActiveBuildingId(activeBuildingId === id ? null : id)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return FAMILIES.filter(family => {
      // search filter
      if (q && !family.name.toLowerCase().includes(q)) return false
      // tier filter
      if (tier !== 'all') {
        const matchesTier = family.variants.some(v => {
          if (tier === 'all-world') {
            return v.tier === 'all' || !v.tier
          }
          return v.tier === tier
        })
        if (!matchesTier) return false
      }
      return true
    })
  }, [search, tier])

  const grouped = useMemo(() => {
    const map = new Map<BuildingCategory, typeof filtered>()
    for (const family of filtered) {
      const key = family.category
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(family)
    }
    return map
  }, [filtered])

  const orderedKeys = FAMILY_CATEGORIES
    .filter(c => c.id !== 'all' && grouped.has(c.id as BuildingCategory))
    .map(c => c.id as BuildingCategory)

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
        {orderedKeys.map(cat => {
          const catDef = FAMILY_CATEGORIES.find(c => c.id === cat)
          const groupLabel = catDef ? catDef.label : cat
          return (
            <div key={cat} className="palette-group">
              <div className="palette-group-header">{groupLabel}</div>
              {grouped.get(cat)!.map(family => {
                const selectedVariantId = selectedVariantIds[family.id] || family.defaultVariantId
                const currentVariant = family.variants.find(v => v.id === selectedVariantId) || family.variants[0]
                const footprint = currentVariant.footprint
                const pw = Math.max(MIN_PREVIEW, Math.min(maxPrev, footprint.w * TILE_PX * PREVIEW_SCALE))
                const ph = Math.max(MIN_PREVIEW, Math.min(maxPrev, footprint.h * TILE_PX * PREVIEW_SCALE))
                const isActive = activeBuildingId !== null && family.variants.some(v => v.id === activeBuildingId)
                const color = categoryColors[family.category]

                const hasVariants = family.variants.length > 1
                const isSpecialQuickSelect = family.id === '1-old-world-residence' || family.id === 'general-small-warehouse'

                return (
                  <div
                    key={family.id}
                    className={`palette-item${isActive ? ' palette-item--active' : ''}`}
                  >
                    <button
                      className="palette-item-main"
                      onClick={() => handleClick(currentVariant.id)}
                      title={`${currentVariant.name} — ${footprint.w}×${footprint.h} tiles${family.dlc ? ` · ${family.dlc}` : ''}`}
                    >
                      <div
                        className="palette-preview"
                        style={{ width: pw, height: ph, background: color }}
                      />
                      <div className="palette-info">
                        <span className="palette-label">{family.name}</span>
                        <span className="palette-size">
                          {footprint.w}×{footprint.h}
                          {family.dlc && (
                            <span
                              className="dlc-badge"
                              style={{ background: DLC_COLOR[family.dlc] ?? '#5a5a80' }}
                            >
                              {dlcLabel(family.dlc)}
                            </span>
                          )}
                        </span>
                      </div>
                    </button>

                    {hasVariants && (
                      isSpecialQuickSelect ? (
                        <div className="quick-select-tabs" onClick={e => e.stopPropagation()}>
                          {family.variants.map(v => {
                            const label = TIER_LABELS[v.tier ?? ''] || v.name.slice(0, 1).toUpperCase()
                            const isSelected = selectedVariantId === v.id
                            return (
                              <button
                                key={v.id}
                                className={`quick-select-btn${isSelected ? ' quick-select-btn--active' : ''}`}
                                onClick={() => handleSelectVariant(family.id, v.id)}
                                title={v.name}
                              >
                                {label}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="variant-dropdown-container" onClick={e => e.stopPropagation()}>
                          <select
                            className="variant-dropdown"
                            value={selectedVariantId}
                            onChange={e => handleSelectVariant(family.id, e.target.value)}
                          >
                            {family.variants.map(v => (
                              <option key={v.id} value={v.id}>
                                {v.name} ({v.footprint.w}×{v.footprint.h})
                              </option>
                            ))}
                          </select>
                        </div>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
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


