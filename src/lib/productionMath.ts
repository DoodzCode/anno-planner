import type { Placement } from '../types/domain'
import type { Building } from '../types/domain'
import type { ChainBuilding, ChainGood } from '../types/productionChain'

export interface GoodTally {
  produced: number
  consumed: number
  net: number
}

/**
 * Compute tons/min output for a chain building at a given productivity %.
 * Electric buildings use 200 as the base (100% = 2× the non-electric rate).
 */
export function outputRate(building: ChainBuilding, productivity = 100): number {
  const base = building.requiresElectricity ? 200 : 100
  return (productivity / base) * (60 / building.baseCycleSeconds)
}

/**
 * Compute per-input consumption in t/min at a given productivity %.
 * Each input consumes at the same rate the building produces (1-ton-in : 1-ton-out).
 */
export function inputRates(
  building: ChainBuilding,
  productivity = 100,
): Record<string, number> {
  const rate = outputRate(building, productivity)
  const result: Record<string, number> = {}
  for (const inp of building.inputs) {
    // Scale input demand proportionally to its defined perMin ratio vs outputPerMin
    result[inp.good] = rate * (inp.perMin / building.outputPerMin)
  }
  return result
}

/**
 * Aggregate all production and consumption across every placed building.
 * Returns a Map keyed by good id with produced/consumed/net in t/min at 100% productivity.
 * Buildings with no chain entry are silently skipped (they don't affect production math).
 */
export function computeTallies(
  placements: Placement[],
  catalogMap: Map<string, Building>,
  chainNameMap: Map<string, string>,
  chainBuildingMap: Map<string, ChainBuilding>,
): Map<string, GoodTally> {
  const tallies = new Map<string, GoodTally>()

  const get = (id: string): GoodTally => {
    if (!tallies.has(id)) tallies.set(id, { produced: 0, consumed: 0, net: 0 })
    return tallies.get(id)!
  }

  for (const p of placements) {
    const catalogBuilding = catalogMap.get(p.buildingId)
    if (!catalogBuilding) continue

    const chainId = chainNameMap.get(catalogBuilding.name)
    if (!chainId) continue

    const chain = chainBuildingMap.get(chainId)
    if (!chain) continue

    const outRate = outputRate(chain)
    const inRates = inputRates(chain)

    // Output
    const outTally = get(chain.output.good)
    outTally.produced += outRate
    outTally.net += outRate

    // Inputs
    for (const [goodId, rate] of Object.entries(inRates)) {
      const inTally = get(goodId)
      inTally.consumed += rate
      inTally.net -= rate
    }
  }

  return tallies
}

/**
 * Given a target output of `demandPerMin` t/min for a good, return how many
 * buildings of `producer` are needed (fractional — caller rounds up).
 */
export function buildingsNeeded(
  producer: ChainBuilding,
  demandPerMin: number,
  productivity = 100,
): number {
  const rate = outputRate(producer, productivity)
  return rate > 0 && isFinite(rate) ? demandPerMin / rate : Infinity
}

export type { ChainGood }
