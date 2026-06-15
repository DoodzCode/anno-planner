export interface ChainGood {
  id: string
  name: string
  category: string
}

export interface ChainInput {
  good: string
  perMin: number
}

// Lowercase tier ids match the catalog and will match workforce flow resource ids
export type PopulationTier =
  | 'farmers' | 'workers' | 'artisans' | 'engineers' | 'investors'
  | 'jornaleros' | 'obreros'
  | 'scholars'
  | 'shepherds' | 'explorers' | 'elders'

export interface WorkforceRequirement {
  tier: PopulationTier
  count: number
}

export interface ChainBuilding {
  id: string
  name: string
  region: string
  tier: string
  category: string
  baseCycleSeconds: number
  outputPerMin: number
  inputs: ChainInput[]
  output: { good: string; perMin: number }
  requiresElectricity: boolean
  // Phase 3 will populate these for all production buildings
  workforce?: WorkforceRequirement[]
  verify?: boolean
  note?: string
}

export interface ProductionChainData {
  schemaVersion: string
  game: string
  scope: string
  goods: ChainGood[]
  buildings: ChainBuilding[]
}
