import type { Placement } from '../types/domain'

/**
 * A starter blueprint demonstrating a simple Farmers production chain:
 * Timber chain (Lumberjack → Sawmill) + Wool/Clothing chain (Sheep → Knitters)
 * + basic public needs (Marketplace, Pub) + Schnapps chain (Potato → Distillery)
 * Laid out on a 30-column sub-grid centered around (4, 3).
 */
export const TUTORIAL_PLACEMENTS: Placement[] = [
  // ── Marketplace (5×6) at (2, 2)
  { id: 'tut-01', buildingId: 'logistic-01-marketplace', x: 2,  y: 2,  rotation: 0 },

  // ── Timber chain
  // Lumberjack's Hut (4×4) at (10, 2)
  { id: 'tut-02', buildingId: 'agriculture-05-timber-yard', x: 10, y: 2,  rotation: 0 },
  // Second Lumberjack (4×4) at (15, 2)
  { id: 'tut-03', buildingId: 'agriculture-05-timber-yard', x: 15, y: 2,  rotation: 0 },
  // Sawmill (4×3) at (10, 7)
  { id: 'tut-04', buildingId: 'factory-03-timber-factory', x: 10, y: 7,  rotation: 0 },

  // ── Wool / Work Clothes chain
  // Sheep Farm (3×3) at (22, 2)
  { id: 'tut-05', buildingId: 'agriculture-06-sheep-farm', x: 22, y: 2,  rotation: 0 },
  // Framework Knitters (4×4) at (22, 6)
  { id: 'tut-06', buildingId: 'processing-04-weavery',    x: 22, y: 6,  rotation: 0 },

  // ── Schnapps chain
  // Potato Farm (3×3) at (2, 10)
  { id: 'tut-07', buildingId: 'agriculture-04-potato-farm',   x: 2,  y: 10, rotation: 0 },
  // Schnapps Distillery (3×4) at (6, 10)
  { id: 'tut-08', buildingId: 'food-06-schnapps-maker',       x: 6,  y: 10, rotation: 0 },

  // ── Pub (6×4) at (15, 8)
  { id: 'tut-09', buildingId: 'service-01-pub',               x: 15, y: 8,  rotation: 0 },
]
