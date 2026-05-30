import { create } from 'zustand'

export interface OverlayDef {
  id: string
  label: string
  color: string
}

export const OVERLAY_DEFS: OverlayDef[] = [
  { id: 'market',     label: 'Market',     color: '#f5a623' },
  { id: 'pub',        label: 'Pub',        color: '#d4a017' },
  { id: 'religion',   label: 'Church',     color: '#6ab0e4' },
  { id: 'fire',       label: 'Fire',       color: '#e05050' },
  { id: 'police',     label: 'Police',     color: '#5070c0' },
  { id: 'education',  label: 'Education',  color: '#30b0a0' },
  { id: 'health',     label: 'Hospital',   color: '#50c060' },
  { id: 'bank',       label: 'Bank',       color: '#c8a820' },
  { id: 'culture',    label: 'Culture',    color: '#a060c0' },
  { id: 'power',      label: 'Power',      color: '#808080' },
  { id: 'tradeUnion', label: 'Trade Union', color: '#8a6030' },
  { id: 'townHall',   label: 'Town Hall',  color: '#8a3030' },
]

interface OverlayState {
  active: Set<string>
  toggle: (id: string) => void
  isActive: (id: string) => boolean
}

export const useOverlayStore = create<OverlayState>((set, get) => ({
  active: new Set(),
  toggle: (id) =>
    set((s) => {
      const next = new Set(s.active)
      next.has(id) ? next.delete(id) : next.add(id)
      return { active: next }
    }),
  isActive: (id) => get().active.has(id),
}))
