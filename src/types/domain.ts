export type Rotation = 0 | 90 | 180 | 270

export interface Footprint {
  w: number
  h: number
}

// ── M4-B: Family + variant model ───────────────────────────────────────────

export type BuildingCategory =
  | 'residence'
  | 'production'
  | 'public_service'
  | 'infrastructure'

export type Region = 'old_world' | 'new_world' | 'arctic' | 'enbesa'

export interface ProductionStats {
  requiresElectricity: boolean
  baseCycleSeconds: number
  output: { good: string; perMin: number }
  inputs: { good: string; perMin: number }[]
  workforce?: { tier: string; count: number }[]
  verify?: boolean
}

export interface BuildingVariant {
  id: string                   // legacy Building.id — public contract, never change
  name: string
  iconFile?: string
  footprint: Footprint         // never null; matches existing call sites
  tier?: string
  order: number                // 0 = base/lowest = default placement
  overlayType?: string
  workRadius?: number
  influenceRadius?: number
  roadRequired?: boolean
  production?: ProductionStats // absent on non-producing buildings
}

export interface BuildingFamily {
  id: string                      // stable family slug derived from group
  name: string                    // display name (lowest-tier variant name)
  category: BuildingCategory
  region: Region
  dlc?: string
  defaultVariantId: string        // variant with order === 0
  variants: BuildingVariant[]
}

/** @deprecated use BuildingVariant */
export interface Building {
  id: string
  name: string
  tier: string
  footprint: Footprint
  category: string
  color: string
  group?: string
  iconFile?: string
  inputs?: string[]
  outputs?: string[]
  productionTime?: number
  /** service influence radius in tiles (marketplace, pub, fire station…) */
  influenceRadius?: number
  /** work area radius for production buildings (lumberjack, farm…) */
  workRadius?: number
  /** which overlay layer this building contributes to */
  overlayType?: string
  roadRequired?: boolean
  dlc?: string
}

export interface Placement {
  id: string
  buildingId: string
  x: number
  y: number
  rotation: Rotation
  tier?: string
  notes?: string
}

export interface Blueprint {
  id: string
  name: string
  gridSize: { w: number; h: number }
  placements: Placement[]
  metadata: { author?: string; version: string; dlcs: string[] }
  createdAt: number
  updatedAt: number
}
