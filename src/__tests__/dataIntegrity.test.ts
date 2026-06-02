import { describe, it, expect } from 'vitest'
import buildings from '../data/buildings-1800.json'
import rawChains from '../data/production-chains.json'
import { CHAIN_NAME_MAP, CHAIN_BUILDING_MAP, GOODS_MAP } from '../data/chainNameMap'

type ChainData = { goods: { id: string }[]; buildings: { id: string; inputs: { good: string }[]; output: { good: string } }[] }
const chains = rawChains as ChainData

const catalogBuildings = buildings as { id: string; name: string }[]

// ── Catalog integrity ──────────────────────────────────────

describe('catalog buildings-1800.json', () => {
  it.todo(
    'has no duplicate building ids — known bug: logistic-02-warehouse-i-1010371 × 4 (Workers/Artisans/Engineers/Investors); fixed in Phase 4 consolidation',
  )

  it('has no buildings with missing required fields', () => {
    const missing = catalogBuildings.filter(
      b => !b.id || !b.name,
    )
    expect(missing).toHaveLength(0)
  })
})

// ── Chain data integrity ────────────────────────────────────

describe('production-chains.json', () => {
  it('has no duplicate chain building ids', () => {
    const ids = chains.buildings.map(b => b.id)
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(dupes).toHaveLength(0)
  })

  it('has no duplicate good ids', () => {
    const ids = chains.goods.map(g => g.id)
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(dupes).toHaveLength(0)
  })

  it('every output good exists in the goods list', () => {
    const goodIds = new Set(chains.goods.map(g => g.id))
    const missing = chains.buildings
      .map(b => b.output.good)
      .filter(g => !goodIds.has(g))
    expect(missing).toHaveLength(0)
  })

  it('every input good exists in the goods list', () => {
    const goodIds = new Set(chains.goods.map(g => g.id))
    const missing: string[] = []
    for (const b of chains.buildings) {
      for (const inp of b.inputs) {
        if (!goodIds.has(inp.good)) missing.push(`${b.id} → ${inp.good}`)
      }
    }
    expect(missing).toHaveLength(0)
  })
})

// ── Name-map integrity ─────────────────────────────────────

describe('CHAIN_NAME_MAP', () => {
  it('every entry resolves to a chain building', () => {
    const broken: string[] = []
    for (const [name, chainId] of CHAIN_NAME_MAP) {
      if (!CHAIN_BUILDING_MAP.has(chainId)) broken.push(`"${name}" → ${chainId}`)
    }
    expect(broken).toHaveLength(0)
  })

  it('every chain building id in the map exists in GOODS_MAP output goods', () => {
    // Each chain building must produce a good that's in GOODS_MAP
    const broken: string[] = []
    for (const [chainId, building] of CHAIN_BUILDING_MAP) {
      if (!GOODS_MAP.has(building.output.good)) broken.push(`${chainId} → ${building.output.good}`)
    }
    expect(broken).toHaveLength(0)
  })
})
