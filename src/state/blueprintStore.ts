import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Placement } from '../types/domain'
import { nextRotation } from '../lib/grid'

const MAX_HISTORY = 50

interface BlueprintState {
  placements: Placement[]
  selectedIds: string[]
  activeBuildingId: string | null
  past: Placement[][]
  future: Placement[][]

  addPlacement: (buildingId: string, x: number, y: number) => void
  movePlacement: (id: string, x: number, y: number) => void
  deleteSelected: () => void
  rotateSelected: () => void
  toggleSelected: (id: string, additive: boolean) => void
  setSelectedIds: (ids: string[]) => void
  clearSelection: () => void
  setActiveBuildingId: (id: string | null) => void
  loadPlacements: (placements: Placement[]) => void
  undo: () => void
  redo: () => void
}

function pushHistory(state: { past: Placement[][]; future: Placement[][] }, snapshot: Placement[]) {
  state.past.push(snapshot)
  if (state.past.length > MAX_HISTORY) state.past.shift()
  state.future.splice(0)
}

export const useBlueprintStore = create<BlueprintState>()(
  immer((set, get) => ({
    placements: [],
    selectedIds: [],
    activeBuildingId: null,
    past: [],
    future: [],

    addPlacement: (buildingId, x, y) => {
      const prev = get().placements
      set((state) => {
        pushHistory(state, prev)
        state.placements.push({ id: crypto.randomUUID(), buildingId, x, y, rotation: 0 })
      })
    },

    movePlacement: (id, x, y) => {
      const prev = get().placements
      set((state) => {
        pushHistory(state, prev)
        const p = state.placements.find((p) => p.id === id)
        if (p) { p.x = x; p.y = y }
      })
    },

    deleteSelected: () => {
      const { selectedIds, placements } = get()
      if (selectedIds.length === 0) return
      set((state) => {
        pushHistory(state, placements)
        state.placements = state.placements.filter((p) => !selectedIds.includes(p.id))
        state.selectedIds = []
      })
    },

    rotateSelected: () => {
      const { selectedIds, placements } = get()
      if (selectedIds.length === 0) return
      set((state) => {
        pushHistory(state, placements)
        state.placements.forEach((p) => {
          if (selectedIds.includes(p.id)) p.rotation = nextRotation(p.rotation)
        })
      })
    },

    toggleSelected: (id, additive) =>
      set((state) => {
        if (additive) {
          const idx = state.selectedIds.indexOf(id)
          if (idx === -1) state.selectedIds.push(id)
          else state.selectedIds.splice(idx, 1)
        } else {
          state.selectedIds = [id]
        }
      }),

    setSelectedIds: (ids) =>
      set((state) => { state.selectedIds = ids }),

    clearSelection: () =>
      set((state) => { state.selectedIds = [] }),

    setActiveBuildingId: (id) =>
      set((state) => { state.activeBuildingId = id }),

    loadPlacements: (placements) =>
      set((state) => {
        state.placements.splice(0, state.placements.length, ...placements)
        state.past.splice(0)
        state.future.splice(0)
        state.selectedIds = []
      }),

    undo: () => {
      const { past, placements } = get()
      if (past.length === 0) return
      const prev = past[past.length - 1]
      set((state) => {
        state.past.pop()
        state.future.unshift(placements)
        if (state.future.length > MAX_HISTORY) state.future.pop()
        state.placements.splice(0, state.placements.length, ...prev)
        state.selectedIds = []
      })
    },

    redo: () => {
      const { placements, future } = get()
      if (future.length === 0) return
      const next = future[0]
      set((state) => {
        state.future.shift()
        state.past.push(placements)
        if (state.past.length > MAX_HISTORY) state.past.shift()
        state.placements.splice(0, state.placements.length, ...next)
        state.selectedIds = []
      })
    },
  })),
)
