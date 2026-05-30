export interface ChainGood {
  id: string
  name: string
  category: string
}

export interface ChainInput {
  good: string
  perMin: number
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
