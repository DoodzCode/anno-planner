import type { BuildingFamily, BuildingVariant } from '../types/domain'
import rawFamilies from './building-catalog.json'

// ── Family catalog ─────────────────────────────────────────────────────────
export const FAMILIES: BuildingFamily[] = rawFamilies as unknown as BuildingFamily[]
export const FAMILY_MAP  = new Map(FAMILIES.map(f => [f.id, f]))
export const VARIANT_MAP = new Map(
  FAMILIES.flatMap(f => f.variants).map(v => [v.id, v])
)
export const VARIANT_FAMILY_MAP = new Map(
  FAMILIES.flatMap(f => f.variants.map(v => [v.id, f]))
)

/** Unified building lookup — returns the variant. */
export function getBuilding(id: string): BuildingVariant | undefined {
  return VARIANT_MAP.get(id)
}

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

/** @deprecated Use FAMILY_CATEGORIES. These ids ('public', 'harbor', 'military') are not in BuildingCategory. */
export const CATEGORIES = [
  { id: 'all',        label: 'All' },
  { id: 'residence',  label: 'Residences' },
  { id: 'production', label: 'Production' },
  { id: 'public',     label: 'Public' },
  { id: 'harbor',     label: 'Harbor' },
  { id: 'military',   label: 'Military' },
] as const

export const FAMILY_CATEGORIES = [
  { id: 'all',            label: 'All' },
  { id: 'residence',      label: 'Residences' },
  { id: 'production',     label: 'Production' },
  { id: 'public_service', label: 'Public Service' },
  { id: 'infrastructure', label: 'Infrastructure' },
] as const

// Farm → field dependencies. Fields are hidden from the palette and accessed
// via a context menu on the selected parent farm.
export const FARM_FIELD_MAP = new Map<string, string[]>([
  ['agriculture-01-grain-farm',       ['agriculture-01-field-grain-field']],
  ['agriculture-02-cattle-farm',      ['agriculture-02-field-pasture']],
  ['agriculture-03-hop-farm',         ['agriculture-03-field-hop-field']],
  ['agriculture-04-potato-farm',      ['agriculture-04-field-potato-field']],
  ['agriculture-06-sheep-farm',       ['agriculture-06-field-sheepfold']],
  ['agriculture-08-pig-farm',         ['agriculture-08-field-pig-sty']],
  ['agriculture-10-vineyard',         ['agriculture-10-field-vines']],
  ['agriculture-11-bell-pepper-farm', ['agriculture-11-field-pepper-field']],
  ['heavy-10-oil-heavy-industry',     ['heavy-10-field-oil-pump']],
])

// Reverse: field variant id → parent farm variant id
export const FIELD_PARENT_MAP = new Map<string, string>(
  [...FARM_FIELD_MAP.entries()].flatMap(([parent, fields]) =>
    fields.map(f => [f, parent] as [string, string])
  )
)

// Building IDs that support paint-on-drag (hold left mouse + drag) placement
export const PAINTABLE_IDS = new Set<string>(FIELD_PARENT_MAP.keys())

