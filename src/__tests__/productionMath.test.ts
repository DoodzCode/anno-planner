import { describe, it, expect } from 'vitest'
import { outputRate, inputRates, computeTallies, buildingsNeeded } from '../lib/productionMath'
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

// ── outputRate ─────────────────────────────────────────────

describe('outputRate', () => {
  it('returns correct rate for non-electric building at 100%', () => {
    expect(outputRate(lumberjack)).toBeCloseTo(4)      // 60/15 = 4
    expect(outputRate(furnace)).toBeCloseTo(2)          // 60/30 = 2
    expect(outputRate(steelworks)).toBeCloseTo(1.33, 1) // 60/45 ≈ 1.33
    expect(outputRate(weaponsFactory)).toBeCloseTo(0.67, 1) // 60/90 ≈ 0.67
  })

  it('scales linearly with productivity', () => {
    expect(outputRate(lumberjack, 50)).toBeCloseTo(2)
    expect(outputRate(lumberjack, 200)).toBeCloseTo(8)
  })

  it('uses 200 as base for electric buildings (100% productivity = 2× non-electric rate)', () => {
    // baseCycleSeconds=30 electric: at 100% productivity → (100/200)*(60/30) = 1
    expect(outputRate(electricBuilding, 100)).toBeCloseTo(1)
    // at 200% productivity → (200/200)*(60/30) = 2
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

// ── Furnace ratio: the known clean 1:1:1 split ─────────────

describe('Furnace ratio validation (Ian\'s correction)', () => {
  it('1 Furnace steel output equals sum of 1 Steelworks + 1 Weapons Factory steel demand', () => {
    const steelProduced = outputRate(furnace)                  // 2 t/min
    const steelForBeams = inputRates(steelworks)['steel']      // 1.33 t/min
    const steelForWeapons = inputRates(weaponsFactory)['steel'] // 0.67 t/min
    expect(steelForBeams + steelForWeapons).toBeCloseTo(steelProduced, 1)
  })
})

// ── computeTallies ─────────────────────────────────────────

describe('computeTallies', () => {
  const catalogLumber: Building = {
    id: 'cat-lumber', name: "Lumberjack's Hut", tier: 'farmers',
    footprint: { w: 4, h: 4 }, category: 'production', color: '#000',
  }
  const catalogFurnace: Building = {
    id: 'cat-furnace', name: 'Furnace', tier: 'workers',
    footprint: { w: 3, h: 3 }, category: 'production', color: '#000',
  }

  const catalogMap = new Map([
    ['cat-lumber', catalogLumber],
    ['cat-furnace', catalogFurnace],
  ])
  const chainNameMap = new Map([
    ["Lumberjack's Hut", 'lumberjacks_hut'],
    ['Furnace', 'furnace'],
  ])
  const chainBuildingMap = new Map([
    ['lumberjacks_hut', lumberjack],
    ['furnace', furnace],
  ])

  const makePlacement = (id: string, buildingId: string): Placement => ({
    id, buildingId, x: 0, y: 0, rotation: 0,
  })

  it('counts a single Lumberjack as +4 t/min timber', () => {
    const placements = [makePlacement('p1', 'cat-lumber')]
    const tallies = computeTallies(placements, catalogMap, chainNameMap, chainBuildingMap)
    expect(tallies.get('timber')?.produced).toBeCloseTo(4)
    expect(tallies.get('timber')?.consumed).toBe(0)
    expect(tallies.get('timber')?.net).toBeCloseTo(4)
  })

  it('counts two Lumberjacks as +8 t/min timber', () => {
    const placements = [makePlacement('p1', 'cat-lumber'), makePlacement('p2', 'cat-lumber')]
    const tallies = computeTallies(placements, catalogMap, chainNameMap, chainBuildingMap)
    expect(tallies.get('timber')?.net).toBeCloseTo(8)
  })

  it('counts Furnace as +2 steel, -2 iron, -2 coal', () => {
    const placements = [makePlacement('p1', 'cat-furnace')]
    const tallies = computeTallies(placements, catalogMap, chainNameMap, chainBuildingMap)
    expect(tallies.get('steel')?.net).toBeCloseTo(2)
    expect(tallies.get('iron')?.net).toBeCloseTo(-2)
    expect(tallies.get('coal')?.net).toBeCloseTo(-2)
  })

  it('skips unknown buildings silently', () => {
    const placements = [makePlacement('p1', 'unknown-building-id')]
    const tallies = computeTallies(placements, catalogMap, chainNameMap, chainBuildingMap)
    expect(tallies.size).toBe(0)
  })
})

// ── buildingsNeeded ────────────────────────────────────────

describe('buildingsNeeded', () => {
  it('computes how many furnaces for 6 t/min steel', () => {
    // Each furnace = 2 t/min → need 3
    expect(buildingsNeeded(furnace, 6)).toBeCloseTo(3)
  })

  it('returns Infinity for zero-rate buildings', () => {
    const zero = { ...furnace, baseCycleSeconds: 0 }
    expect(buildingsNeeded(zero, 1)).toBe(Infinity)
  })
})
