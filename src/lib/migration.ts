import type { Placement } from '../types/domain'

/**
 * Maps legacy building ids (pre-Phase-4) to their new unique ids.
 *
 * logistic-02-warehouse-i       was the farmers tier (unique id, but renamed for consistency).
 * logistic-02-warehouse-i-1010371 was shared by workers/artisans/engineers/investors;
 *   BUILDING_MAP kept the last entry (investors) so existing placements effectively
 *   resolved to the investors warehouse — migrate accordingly.
 */
export const LEGACY_ID_MAP: Readonly<Record<string, string>> = {
  'logistic-02-warehouse-i':         'logistic-02-warehouse-farmers',
  'logistic-02-warehouse-i-1010371': 'logistic-02-warehouse-investors',
}

/** Rewrite any legacy buildingIds in a placement array. Pure — returns a new array. */
export function migratePlacements(placements: Placement[]): Placement[] {
  return placements.map(p => {
    const newId = LEGACY_ID_MAP[p.buildingId]
    return newId ? { ...p, buildingId: newId } : p
  })
}
