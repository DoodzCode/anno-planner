import type { Building } from '../types/domain'

export const BUILDINGS: Building[] = [
  {
    id: 'marketplace',
    name: 'Marketplace',
    tier: 'farmers',
    footprint: { w: 3, h: 3 },
    category: 'public',
    color: '#c8942a',
    influenceRadius: 20,
  },
  {
    id: 'lumberjack',
    name: "Lumberjack's Hut",
    tier: 'farmers',
    footprint: { w: 2, h: 2 },
    category: 'production',
    color: '#4a7c3a',
    outputs: ['timber'],
    productionTime: 30,
  },
  {
    id: 'sawmill',
    name: 'Sawmill',
    tier: 'farmers',
    footprint: { w: 4, h: 3 },
    category: 'production',
    color: '#7c5a3a',
    inputs: ['timber'],
    outputs: ['planks'],
    productionTime: 60,
    roadRequired: true,
  },
  {
    id: 'sheep-farm',
    name: 'Sheep Farm',
    tier: 'workers',
    footprint: { w: 5, h: 4 },
    category: 'production',
    color: '#4a7a60',
    outputs: ['wool'],
    productionTime: 60,
  },
  {
    id: 'guard-tower',
    name: 'Guard Tower',
    tier: 'farmers',
    footprint: { w: 1, h: 1 },
    category: 'military',
    color: '#8a4a4a',
    influenceRadius: 7,
  },
]

export const BUILDING_MAP = new Map(BUILDINGS.map(b => [b.id, b]))
