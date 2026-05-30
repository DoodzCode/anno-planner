import Dexie, { type Table } from 'dexie'
import type { Blueprint } from '../types/domain'
import { useBlueprintStore } from './blueprintStore'

const CURRENT_ID = 'current'

class AnnoDb extends Dexie {
  blueprints!: Table<Blueprint>

  constructor() {
    super('anno-planner')
    this.version(1).stores({
      blueprints: 'id, updatedAt',
    })
  }
}

const db = new AnnoDb()
let savedCreatedAt = 0

export async function loadCurrentBlueprint(): Promise<void> {
  const blueprint = await db.blueprints.get(CURRENT_ID)
  if (blueprint) {
    savedCreatedAt = blueprint.createdAt
    useBlueprintStore.getState().loadPlacements(blueprint.placements)
  }
}

export function startAutoSave(): () => void {
  return useBlueprintStore.subscribe(async (state, prevState) => {
    if (state.placements === prevState.placements) return
    const now = Date.now()
    await db.blueprints.put({
      id: CURRENT_ID,
      name: 'Current Blueprint',
      gridSize: { w: 60, h: 40 },
      placements: state.placements,
      metadata: { version: '0.1.0', dlcs: [] },
      createdAt: savedCreatedAt || now,
      updatedAt: now,
    })
    if (!savedCreatedAt) savedCreatedAt = now
  })
}
