import Dexie, { type Table } from 'dexie'
import type { Blueprint } from '../types/domain'
import { useBlueprintStore } from './blueprintStore'
import { migratePlacements } from '../lib/migration'

const CURRENT_ID = 'current'

class AnnoDb extends Dexie {
  blueprints!: Table<Blueprint>

  constructor() {
    super('anno-planner')
    this.version(1).stores({ blueprints: 'id, updatedAt' })
    this.version(2).stores({ blueprints: 'id, updatedAt' }).upgrade(tx =>
      tx.table('blueprints').toCollection().modify(bp => {
        bp.placements = migratePlacements(bp.placements ?? [])
        bp.metadata = { ...(bp.metadata ?? {}), version: '0.2.0' }
      })
    )
  }
}

const db = new AnnoDb()
let savedCreatedAt = 0

export async function loadCurrentBlueprint(): Promise<void> {
  const blueprint = await db.blueprints.get(CURRENT_ID)
  if (blueprint) {
    savedCreatedAt = blueprint.createdAt
    useBlueprintStore.getState().loadPlacements(migratePlacements(blueprint.placements), blueprint.name)
  }
}

export function startAutoSave(): () => void {
  return useBlueprintStore.subscribe(async (state, prevState) => {
    if (state.placements === prevState.placements) return
    const now = Date.now()
    await db.blueprints.put({
      id: CURRENT_ID,
      name: state.blueprintName,
      gridSize: { w: 60, h: 40 },
      placements: state.placements,
      metadata: { version: '0.1.0', dlcs: [] },
      createdAt: savedCreatedAt || now,
      updatedAt: now,
    })
    if (!savedCreatedAt) savedCreatedAt = now
  })
}

// ── Blueprint library ──────────────────────────────────────

function buildCurrentBlueprint(name: string): Blueprint {
  const { placements, blueprintName } = useBlueprintStore.getState()
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name: name || blueprintName,
    gridSize: { w: 60, h: 40 },
    placements: [...placements],
    metadata: { version: '0.1.0', dlcs: [] },
    createdAt: now,
    updatedAt: now,
  }
}

export async function saveToLibrary(name: string): Promise<string> {
  const bp = buildCurrentBlueprint(name)
  await db.blueprints.put(bp)
  return bp.id
}

export async function listLibrary(): Promise<Blueprint[]> {
  const all = await db.blueprints.orderBy('updatedAt').reverse().toArray()
  return all.filter(bp => bp.id !== CURRENT_ID)
}

export async function loadFromLibrary(id: string): Promise<void> {
  const bp = await db.blueprints.get(id)
  if (!bp) return
  savedCreatedAt = 0
  useBlueprintStore.getState().loadPlacements(migratePlacements(bp.placements), bp.name)
  // Also persist as current so auto-save tracks it
  const now = Date.now()
  await db.blueprints.put({ ...bp, id: CURRENT_ID, updatedAt: now })
  savedCreatedAt = bp.createdAt
}

export async function deleteFromLibrary(id: string): Promise<void> {
  await db.blueprints.delete(id)
}

export async function renameInLibrary(id: string, name: string): Promise<void> {
  await db.blueprints.update(id, { name, updatedAt: Date.now() })
}

export async function duplicateInLibrary(id: string): Promise<string> {
  const bp = await db.blueprints.get(id)
  if (!bp) throw new Error(`Blueprint ${id} not found`)
  const now = Date.now()
  const copy: Blueprint = {
    ...bp,
    id: crypto.randomUUID(),
    name: `${bp.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  }
  await db.blueprints.put(copy)
  return copy.id
}
