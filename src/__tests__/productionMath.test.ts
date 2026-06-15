import { describe, it, expect } from 'vitest'
import {
  outputRate, inputRates, computeTallies, buildingsNeeded,
  buildingFlows, aggregateFlows, goodsTallies, workforceTotals,
  goodRes, workRes,
} from '../lib/productionMath'
import type { ChainBuilding } from '../types/productionChain'
import type { Building, Placement } from '../types/domain'

// ── Fixtures ───────────────────────────────────────────────

const lumberjack: ChainBuilding = {
  id: 'lumberjacks_hut', name: "Lumberjack's Hut", region: 'Old World',
  tier: 'Farmers', category: 'forestry', requiresElectricity: false,
  baseCycleSeconds: 15, outputPerMin: 4,
  inputs: [], output: { good: 'timber', perMin: 4 },
}

const furnace: ChainBuilding = {
  id: 'furnace', name: 'Furnace', region: 'Old World',
  tier: 'Workers', category: 'factory', requiresElectricity: false,
  baseCycleSeconds: 30, outputPerMin: 2,
  inputs: [{ good: 'iron', perMin: 2 }, { good: 'coal', perMin: 2 }],
  output: { good: 'steel', perMin: 2 },
}

const steelworks: ChainBuilding = {
  id: 'steelworks', name: 'Steelworks', region: 'Old World',
  tier: 'Workers', category: 'factory', requiresElectricity: false,
  baseCycleSeconds: 45, outputPerMin: 1.33,
  inputs: [{ good: 'steel', perMin: 1.33 }],
  output: { good: 'steel_beams', perMin: 1.33 },
}

const weaponsFactory: ChainBuilding = {
  id: 'weapons_factory', name: 'Weapons Factory', region: 'Old World',
  tier: 'Workers', category: 'factory', requiresElectricity: false,
  baseCycleSeconds: 90, outputPerMin: 0.67,
  inputs: [{ good: 'steel', perMin: 0.67 }],
  output: { good: 'weapons', perMin: 0.67 },
}

const electricBuilding: ChainBuilding = {
  id: 'electric_test', name: 'Electric Test', region: 'Old World',
  tier: 'Engineers', category: 'factory', requiresElectricity: true,
  baseCycleSeconds: 30, outputPerMin: 4,
  inputs: [], output: { good: 'some_good', perMin: 4 },
}

// Fixture with workforce for Phase 3 tests
const flourMill: ChainBuilding = {
  id: 'flour_mill', name: 'Flour Mill', region: 'Old World',
  tier: 'Workers', category: 'factory', requiresElectricity: false,
  baseCycleSeconds: 30, outputPerMin: 2,
  inputs: [{ good: 'grain', perMin: 2 }],
  output: { good: 'flour', perMin: 2 },
  workforce: [{ tier: 'workers', count: 20 }],
}

const bakery: ChainBuilding = {
  id: 'bakery', name: 'Bakery', region: 'Old World',
  tier: 'Workers', category: 'factory', requiresElectricity: false,
  baseCycleSeconds: 60, outputPerMin: 1,
  inputs: [{ good: 'flour', perMin: 1 }],
  output: { good: 'bread', perMin: 1 },
  workforce: [{ tier: 'workers', count: 30 }],
}

// ── outputRate ─────────────────────────────────────────────

describe('outputRate', () => {
  it('returns correct rate for non-electric building at 100%', () => {
    expect(outputRate(lumberjack)).toBeCloseTo(4)
    expect(outputRate(furnace)).toBeCloseTo(2)
    expect(outputRate(steelworks)).toBeCloseTo(1.33, 1)
    expect(outputRate(weaponsFactory)).toBeCloseTo(0.67, 1)
  })

  it('scales linearly with productivity', () => {
    expect(outputRate(lumberjack, 50)).toBeCloseTo(2)
    expect(outputRate(lumberjack, 200)).toBeCloseTo(8)
  })

  it('uses 200 as base for electric buildings (100% productivity = 2× non-electric rate)', () => {
    expect(outputRate(electricBuilding, 100)).toBeCloseTo(1)
    expect(outputRate(electricBuilding, 200)).toBeCloseTo(2)
  })
})

// ── inputRates ─────────────────────────────────────────────

describe('inputRates', () => {
  it('returns empty for buildings with no inputs', () => {
    expect(inputRates(lumberjack)).toEqual({})
  })

  it('returns correct consumption for furnace at 100%', () => {
    const rates = inputRates(furnace)
    expect(rates['iron']).toBeCloseTo(2)
    expect(rates['coal']).toBeCloseTo(2)
  })

  it('scales inputs proportionally with productivity', () => {
    const rates = inputRates(furnace, 50)
    expect(rates['iron']).toBeCloseTo(1)
    expect(rates['coal']).toBeCloseTo(1)
  })
})

// ── Furnace ratio ──────────────────────────────────────────

describe("Furnace ratio validation (Ian's correction)", () => {
  it('1 Furnace steel output equals sum of 1 Steelworks + 1 Weapons Factory steel demand', () => {
    const steelProduced = outputRate(furnace)
    const steelForBeams = inputRates(steelworks)['steel']
    const steelForWeapons = inputRates(weaponsFactory)['steel']
    expect(steelForBeams + steelForWeapons).toBeCloseTo(steelProduced, 1)
  })
})

// ── buildingFlows ──────────────────────────────────────────

describe('buildingFlows', () => {
  it('emits one positive output flow for a no-input building', () => {
    const flows = buildingFlows(lumberjack)
    expect(flows).toHaveLength(1)
    expect(flows[0]).toMatchObject({ kind: 'good', id: goodRes('timber'), amount: expect.closeTo(4, 1) })
  })

  it('emits positive output + negative input flows for furnace', () => {
    const flows = buildingFlows(furnace)
    const out = flows.find(f => f.id === goodRes('steel'))
    const iron = flows.find(f => f.id === goodRes('iron'))
    const coal = flows.find(f => f.id === goodRes('coal'))
    expect(out?.amount).toBeCloseTo(2)
    expect(iron?.amount).toBeCloseTo(-2)
    expect(coal?.amount).toBeCloseTo(-2)
  })

  it('scales good flows with productivity', () => {
    const flows50  = buildingFlows(lumberjack, { productivity: 50 })
    const flows100 = buildingFlows(lumberjack, { productivity: 100 })
    expect(flows50[0].amount).toBeCloseTo(flows100[0].amount / 2)
  })

  it('emits workforce flows as negative (demand) independent of productivity', () => {
    const lo = buildingFlows(flourMill, { productivity: 50 })
    const hi = buildingFlows(flourMill, { productivity: 100 })
    const wf = (fs: typeof lo) => fs.find(f => f.kind === 'workforce')!
    // Workforce demand is fixed regardless of productivity
    expect(wf(lo).amount).toBe(wf(hi).amount)
    expect(wf(lo).amount).toBe(-20)
    expect(wf(lo).id).toBe(workRes('workers'))
  })

  it('output good scales with productivity even when workforce is fixed', () => {
    const lo = buildingFlows(flourMill, { productivity: 50 })
    const hi = buildingFlows(flourMill, { productivity: 100 })
    const out = (fs: typeof lo) => fs.find(f => f.id === goodRes('flour'))!
    expect(out(lo).amount).toBeCloseTo(out(hi).amount / 2)
  })

  it('emits no workforce flows when workforce field is absent', () => {
    const flows = buildingFlows(furnace)
    expect(flows.filter(f => f.kind === 'workforce')).toHaveLength(0)
  })
})

// ── aggregateFlows ─────────────────────────────────────────

describe('aggregateFlows', () => {
  const makePlace = (id: string, buildingId: string): Placement => ({ id, buildingId, x: 0, y: 0, rotation: 0 })
  const fakeResolve = (map: Record<string, ChainBuilding>) =>
    (p: Placement) => {
      const chain = map[p.buildingId]
      return chain ? { chain, ctx: {} } : null
    }

  it('aggregates output of two lumberjacks', () => {
    const map = aggregateFlows(
      [makePlace('1', 'lumber'), makePlace('2', 'lumber')],
      fakeResolve({ lumber: lumberjack }),
    )
    const timber = map.get(goodRes('timber'))!
    expect(timber.produced).toBeCloseTo(8)
    expect(timber.consumed).toBe(0)
    expect(timber.net).toBeCloseTo(8)
  })

  it('separates produced and consumed even when net is zero', () => {
    const grainFarm: ChainBuilding = {
      ...lumberjack, id: 'grain_farm', output: { good: 'grain', perMin: 2 },
      baseCycleSeconds: 30, outputPerMin: 2,
    }
    const mill: ChainBuilding = {
      ...flourMill,
      workforce: undefined,
    }
    const map = aggregateFlows(
      [makePlace('farm', 'grain'), makePlace('mill', 'flour')],
      fakeResolve({ grain: grainFarm, flour: mill }),
    )
    const grain = map.get(goodRes('grain'))!
    expect(grain.consumed).toBeGreaterThan(0)
    expect(grain.net).toBeCloseTo(0)
  })

  it('aggregates workforce across multiple buildings', () => {
    const map = aggregateFlows(
      [makePlace('f1', 'flour'), makePlace('f2', 'flour'), makePlace('b1', 'bread')],
      fakeResolve({ flour: flourMill, bread: bakery }),
    )
    const workers = map.get(workRes('workers'))!
    expect(workers.consumed).toBeCloseTo(2 * 20 + 30)
  })

  it('returns empty map when no placements resolve', () => {
    const map = aggregateFlows([makePlace('x', 'unknown')], () => null)
    expect(map.size).toBe(0)
  })
})

// ── goodsTallies / workforceTotals ─────────────────────────

describe('goodsTallies and workforceTotals', () => {
  const makePlace = (id: string, bid: string): Placement => ({ id, buildingId: bid, x: 0, y: 0, rotation: 0 })

  it('goodsTallies strips good: prefix and excludes workforce entries', () => {
    const raw = aggregateFlows(
      [makePlace('1', 'f')],
      () => ({ chain: flourMill, ctx: {} }),
    )
    const goods = goodsTallies(raw)
    expect(goods.has('flour')).toBe(true)
    expect(goods.has('grain')).toBe(true)
    expect([...goods.keys()].some(k => k.startsWith('workforce:'))).toBe(false)
  })

  it('workforceTotals strips workforce: prefix and excludes good entries', () => {
    const raw = aggregateFlows(
      [makePlace('1', 'f')],
      () => ({ chain: flourMill, ctx: {} }),
    )
    const wf = workforceTotals(raw)
    expect(wf.has('workers')).toBe(true)
    expect([...wf.keys()].some(k => k.startsWith('good:'))).toBe(false)
  })
})

// ── computeTallies (back-compat) ───────────────────────────

describe('computeTallies', () => {
  const catalogLumber: Building = {
    id: 'cat-lumber', name: "Lumberjack's Hut", tier: 'farmers',
    footprint: { w: 4, h: 4 }, category: 'production', color: '#000',
  }
  const catalogFurnace: Building = {
    id: 'cat-furnace', name: 'Furnace', tier: 'workers',
    footprint: { w: 3, h: 3 }, category: 'production', color: '#000',
  }

  const catalogMap = new Map([['cat-lumber', catalogLumber], ['cat-furnace', catalogFurnace]])
  const chainNameMap = new Map(["Lumberjack's Hut", 'Furnace'].map((n, i) =>
    [n, ['lumberjacks_hut', 'furnace'][i]]))
  const chainBuildingMap = new Map([['lumberjacks_hut', lumberjack], ['furnace', furnace]])

  const makeP = (id: string, buildingId: string): Placement => ({ id, buildingId, x: 0, y: 0, rotation: 0 })

  it('counts a single Lumberjack as +4 t/min timber', () => {
    const tallies = computeTallies([makeP('p1', 'cat-lumber')], catalogMap, chainNameMap, chainBuildingMap)
    expect(tallies.get('timber')?.produced).toBeCloseTo(4)
    expect(tallies.get('timber')?.consumed).toBe(0)
    expect(tallies.get('timber')?.net).toBeCloseTo(4)
  })

  it('counts two Lumberjacks as +8 t/min timber', () => {
    const tallies = computeTallies([makeP('p1', 'cat-lumber'), makeP('p2', 'cat-lumber')], catalogMap, chainNameMap, chainBuildingMap)
    expect(tallies.get('timber')?.net).toBeCloseTo(8)
  })

  it('counts Furnace as +2 steel, -2 iron, -2 coal', () => {
    const tallies = computeTallies([makeP('p1', 'cat-furnace')], catalogMap, chainNameMap, chainBuildingMap)
    expect(tallies.get('steel')?.net).toBeCloseTo(2)
    expect(tallies.get('iron')?.net).toBeCloseTo(-2)
    expect(tallies.get('coal')?.net).toBeCloseTo(-2)
  })

  it('skips buildings absent from catalogMap', () => {
    const tallies = computeTallies([makeP('p1', 'unknown-id')], catalogMap, chainNameMap, chainBuildingMap)
    expect(tallies.size).toBe(0)
  })

  it('skips buildings present in catalog but missing from chainNameMap', () => {
    const unmapped: Building = { id: 'unmapped', name: 'Not Mapped', tier: 'workers', footprint: { w: 2, h: 2 }, category: 'production', color: '#000' }
    const extCatalog = new Map([...catalogMap, ['unmapped', unmapped]])
    const tallies = computeTallies([makeP('p1', 'unmapped')], extCatalog, chainNameMap, chainBuildingMap)
    expect(tallies.size).toBe(0)
  })

  it('skips buildings whose chainNameMap entry does not resolve to a chain building', () => {
    const ghost: Building = { id: 'ghost', name: 'Ghost Building', tier: 'workers', footprint: { w: 1, h: 1 }, category: 'production', color: '#000' }
    const extCatalog = new Map([...catalogMap, ['ghost', ghost]])
    const extNameMap = new Map([...chainNameMap, ['Ghost Building', 'ghost_chain_id']])
    // ghost_chain_id is NOT in chainBuildingMap
    const tallies = computeTallies([makeP('p1', 'ghost')], extCatalog, extNameMap, chainBuildingMap)
    expect(tallies.size).toBe(0)
  })
})

// ── buildingsNeeded ────────────────────────────────────────

describe('buildingsNeeded', () => {
  it('computes how many furnaces for 6 t/min steel', () => {
    expect(buildingsNeeded(furnace, 6)).toBeCloseTo(3)
  })

  it('returns Infinity for zero-rate buildings', () => {
    const zero = { ...furnace, baseCycleSeconds: 0 }
    expect(buildingsNeeded(zero, 1)).toBe(Infinity)
  })
})
