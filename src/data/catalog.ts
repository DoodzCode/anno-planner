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

