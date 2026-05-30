export type Rotation = 0 | 90 | 180 | 270

export interface Footprint {
  w: number
  h: number
}

export interface Building {
  id: string
  name: string
  tier: string
  footprint: Footprint
  category: string
  color: string
  inputs?: string[]
  outputs?: string[]
  productionTime?: number
  influenceRadius?: number
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
