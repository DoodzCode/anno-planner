import type { Building } from '../types/domain'
import rawBuildings from './buildings-1800.json'

export const BUILDINGS: Building[] = rawBuildings as Building[]

export const BUILDING_MAP = new Map(BUILDINGS.map(b => [b.id, b]))

export const TIERS = [
  { id: 'all',       label: 'All' },
  { id: 'farmers',   label: 'Farmers' },
  { id: 'workers',   label: 'Workers' },
  { id: 'artisans',  label: 'Artisans' },
  { id: 'engineers', label: 'Engineers' },
  { id: 'investors', label: 'Investors' },
  { id: 'scholars',  label: 'Scholars' },
  { id: 'harbor',    label: 'Harbor' },
  { id: 'all-world', label: 'Special' },
] as const

export const CATEGORIES = [
  { id: 'all',        label: 'All' },
  { id: 'residence',  label: 'Residences' },
  { id: 'production', label: 'Production' },
  { id: 'public',     label: 'Public' },
  { id: 'harbor',     label: 'Harbor' },
  { id: 'military',   label: 'Military' },
] as const
