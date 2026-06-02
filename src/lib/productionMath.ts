import type { Placement } from '../types/domain'
import type { Building } from '../types/domain'
import type { ChainBuilding, ChainGood } from '../types/productionChain'

// ── Resource flow types ────────────────────────────────────

export type ResourceKind = 'good' | 'workforce'

/**
 * Namespaced resource id: `good:<goodId>` or `workforce:<tier>`.
 * Keeping one map and one aggregation loop for both kinds.
 */
export type ResourceId = string

export const goodRes  = (id: string): ResourceId => `good:${id}`
export const workRes  = (tier: string): ResourceId => `workforce:${tier}`

export interface ResourceFlow {
  kind: ResourceKind
  id: ResourceId
  /** +supply/produce, -demand/consume */
  amount: number
}

export interface ResourceTally {
  produced: number
  consumed: number
  net: number
}

// Backwards-compat alias — existing callers use GoodTally
export type GoodTally = ResourceTally

export interface FlowContext {
  productivity?: number
}

// ── Single-building helpers ────────────────────────────────

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
 */
export function inputRates(
  building: ChainBuilding,
  productivity = 100,
): Record<string, number> {
  const rate = outputRate(building, productivity)
  const result: Record<string, number> = {}
  for (const inp of building.inputs) {
    result[inp.good] = rate * (inp.perMin / building.outputPerMin)
  }
  return result
}

/**
 * Pure: all resource flows emitted by one chain building instance at a given context.
 * Goods flows are in t/min; workforce flows are headcount (independent of productivity).
 */
export function buildingFlows(b: ChainBuilding, ctx: FlowContext = {}): ResourceFlow[] {
  const rate = outputRate(b, ctx.productivity ?? 100)
  const flows: ResourceFlow[] = []

  flows.push({ kind: 'good', id: goodRes(b.output.good), amount: rate })

  for (const inp of b.inputs) {
    flows.push({
      kind: 'good',
      id: goodRes(inp.good),
      amount: -(rate * (inp.perMin / b.outputPerMin)),
    })
  }

  for (const w of b.workforce ?? []) {
    flows.push({ kind: 'workforce', id: workRes(w.tier), amount: -w.count })
  }

  return flows
}

// ── Blueprint aggregation ──────────────────────────────────

/**
 * Aggregate resource flows across all placements.
 * `resolve` is responsible for the catalog↔chain lookup so this function stays pure.
 */
export function aggregateFlows(
  placements: Placement[],
  resolve: (p: Placement) => { chain: ChainBuilding; ctx: FlowContext } | null,
): Map<ResourceId, ResourceTally> {
  const out = new Map<ResourceId, ResourceTally>()

  const bump = (id: ResourceId, amt: number) => {
    const t = out.get(id) ?? { produced: 0, consumed: 0, net: 0 }
    if (amt >= 0) t.produced += amt; else t.consumed += -amt
    t.net += amt
    out.set(id, t)
  }

  for (const p of placements) {
    const r = resolve(p)
    if (!r) continue
    for (const f of buildingFlows(r.chain, r.ctx)) bump(f.id, f.amount)
  }

  return out
}

// ── Map selectors ──────────────────────────────────────────

/** Extract only good tallies from a unified flow map, keyed by bare good id. */
export function goodsTallies(map: Map<ResourceId, ResourceTally>): Map<string, ResourceTally> {
  const result = new Map<string, ResourceTally>()
  for (const [id, tally] of map) {
    if (id.startsWith('good:')) result.set(id.slice(5), tally)
  }
  return result
}

/** Extract only workforce tallies from a unified flow map, keyed by tier name. */
export function workforceTotals(map: Map<ResourceId, ResourceTally>): Map<string, ResourceTally> {
  const result = new Map<string, ResourceTally>()
  for (const [id, tally] of map) {
    if (id.startsWith('workforce:')) result.set(id.slice(10), tally)
  }
  return result
}

// ── Back-compat API ────────────────────────────────────────

/**
 * Aggregate all production and consumption across every placed building.
 * Returns a Map keyed by good id with produced/consumed/net in t/min at 100% productivity.
 * Buildings with no chain entry are silently skipped.
 */
export function computeTallies(
  placements: Placement[],
  catalogMap: Map<string, Building>,
  chainNameMap: Map<string, string>,
  chainBuildingMap: Map<string, ChainBuilding>,
): Map<string, GoodTally> {
  const resolve = (p: Placement) => {
    const catalogBuilding = catalogMap.get(p.buildingId)
    if (!catalogBuilding) return null
    const chainId = chainNameMap.get(catalogBuilding.name)
    if (!chainId) return null
    const chain = chainBuildingMap.get(chainId)
    if (!chain) return null
    return { chain, ctx: {} as FlowContext }
  }
  return goodsTallies(aggregateFlows(placements, resolve))
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
