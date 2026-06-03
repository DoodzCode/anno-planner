import type { Building, BuildingCategory, BuildingFamily, BuildingVariant } from '../types/domain'
import rawFamilies from './building-catalog.json'

// ── Family catalog ─────────────────────────────────────────────────────────
export const FAMILIES: BuildingFamily[] = rawFamilies as unknown as BuildingFamily[]
export const FAMILY_MAP  = new Map(FAMILIES.map(f => [f.id, f]))
export const VARIANT_MAP = new Map(
  FAMILIES.flatMap(f => f.variants).map(v => [v.id, v])
)

// Maps new BuildingCategory values back to the legacy category strings that
// components and palette filters currently expect.
const LEGACY_CATEGORY: Record<BuildingCategory, string> = {
  residence:      'residence',
  production:     'production',
  public_service: 'public',
  infrastructure: 'harbor',
}

// Derive flat Building[] from variant data so legacy component call sites keep working.
function variantToBuilding(family: BuildingFamily, variant: BuildingVariant): Building {
  return {
    id:               variant.id,
    name:             variant.name,
    tier:             variant.tier ?? 'all',
    footprint:        variant.footprint,
    category:         LEGACY_CATEGORY[family.category],
    color:            '',         // components will migrate to categoryColors; not used in logic
    group:            family.id,
    ...(variant.iconFile        && { iconFile:        variant.iconFile }),
    ...(variant.overlayType     && { overlayType:     variant.overlayType }),
    ...(variant.workRadius      && { workRadius:      variant.workRadius }),
    ...(variant.influenceRadius && { influenceRadius: variant.influenceRadius }),
    ...(variant.roadRequired    && { roadRequired:    variant.roadRequired }),
    ...(family.dlc              && { dlc:             family.dlc }),
  }
}

export const BUILDINGS: Building[] = FAMILIES.flatMap(f => f.variants.map(v => variantToBuilding(f, v)))
export const BUILDING_MAP: Map<string, Building> = new Map(BUILDINGS.map(b => [b.id, b]))

/** Unified building lookup — returns the variant (preferred) or legacy-adapted Building. */
export function getBuilding(id: string): BuildingVariant | Building | undefined {
  return VARIANT_MAP.get(id) ?? BUILDING_MAP.get(id)
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

