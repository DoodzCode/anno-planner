import type { Placement, Rotation } from '../types/domain'
import { getBuilding } from '../data/catalog'
import { effectiveFootprint, footprintsOverlap } from './grid'

export function wouldCollide(
  placements: Placement[],
  buildingId: string,
  x: number,
  y: number,
  rotation: Rotation,
  excludeId?: string,
): boolean {
  const building = getBuilding(buildingId)
  if (!building) return false
  const fp = effectiveFootprint(building.footprint, rotation)
  for (const p of placements) {
    if (p.id === excludeId) continue
    const pb = getBuilding(p.buildingId)
    if (!pb) continue
    const pfp = effectiveFootprint(pb.footprint, p.rotation)
    if (footprintsOverlap(x, y, fp.w, fp.h, p.x, p.y, pfp.w, pfp.h)) return true
  }
  return false
}
