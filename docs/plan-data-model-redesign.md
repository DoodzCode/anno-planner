# Plan: Building Data Model Redesign
> Branch: `m4-b` | Phase: Schema first, data second

## Goal

Replace the flat `Building` type with a `BuildingFamily` + `BuildingVariant` model that:
- Collapses upgrade-tier duplicates and icon-only skins into one palette entry per family
- Encodes `BuildingCategory` as the single color/grouping dimension
- Preserves every legacy `Building.id` as a `BuildingVariant.id` (back-compat hard constraint)
- Accepts optional production fields on variants (populated in Plan 2 after catalog merge)

---

## Files changed

| File | Action | Notes |
|---|---|---|
| `src/types/domain.ts` | MODIFY | Add new types; keep `Building` as deprecated alias |
| `src/data/catalog.ts` | MODIFY | Add `FAMILIES`, `FAMILY_MAP`, `VARIANT_MAP`; alias `BUILDING_MAP` |
| `src/constants/categoryColors.ts` | CREATE | Single `categoryColors` map, ~12 lines |

`productionMath.ts`, component files, and JSON data files are **not touched** in this plan.

---

## Step 1 — Extend `src/types/domain.ts`

Add above the existing `Building` interface:

```ts
// ── New canonical types (M4-B) ─────────────────────────────────────────────

export type BuildingCategory =
  | 'residence'
  | 'production'
  | 'public_service'
  | 'infrastructure'

export type Region = 'old_world' | 'new_world' | 'arctic' | 'enbesa'

export interface ProductionStats {
  requiresElectricity: boolean
  baseCycleSeconds: number
  outputPerMin: number
  output: { good: string; perMin: number }
  inputs: { good: string; perMin: number }[]
  workforce?: { tier: string; count: number }[]
  verify?: boolean
}

export interface BuildingVariant {
  id: string                    // legacy Building.id — public contract, never change
  name: string
  iconFile?: string
  size: { w: number; h: number }  // footprint — never null
  tier?: string
  order: number                 // 0 = base/lowest = default placement
  overlayType?: string
  workRadius?: number
  influenceRadius?: number
  roadRequired?: boolean
  production?: ProductionStats  // absent on non-producing buildings
}

export interface BuildingFamily {
  id: string                    // family key — stable slug derived from group
  name: string                  // display name (usually lowest-tier variant name)
  category: BuildingCategory
  region: Region
  dlc?: string
  defaultVariantId: string      // = variant with order === 0
  variants: BuildingVariant[]
}
```

Mark old `Building` as deprecated with a single-line JSDoc (`@deprecated use BuildingVariant`).
Keep it as a type alias so existing code compiles without changes:

```ts
/** @deprecated use BuildingVariant */
export type Building = BuildingVariant
```

---

## Step 2 — Create `src/constants/categoryColors.ts`

```ts
import type { BuildingCategory } from '../types/domain'

export const categoryColors: Record<BuildingCategory, string> = {
  residence:       '#c8a96e',  // Anno gold
  production:      '#5b7a99',  // steel blue
  public_service:  '#5a9e6f',  // green
  infrastructure:  '#6b7280',  // neutral gray
}
```

This is the single source of truth. Palette, minimap, and tile tints all derive from here.

---

## Step 3 — Update `src/data/catalog.ts`

Add exports alongside the existing ones. Do **not** remove `BUILDING_MAP` or `TIERS` — existing callers still compile.

```ts
import type { Building, BuildingFamily, BuildingVariant } from '../types/domain'
import rawFamilies from './building-catalog.json'   // populated in Plan 2

// ── Family catalog (M4-B) ──────────────────────────────────────────────────
export const FAMILIES: BuildingFamily[] = rawFamilies as BuildingFamily[]
export const FAMILY_MAP  = new Map(FAMILIES.map(f => [f.id, f]))
export const VARIANT_MAP = new Map(
  FAMILIES.flatMap(f => f.variants).map(v => [v.id, v])
)

// Back-compat alias: code that calls BUILDING_MAP.get(buildingId) keeps working
// because variant ids === legacy building ids.
export const BUILDING_MAP: Map<string, BuildingVariant> = VARIANT_MAP

// ── Updated CATEGORIES (replaces old string literals) ─────────────────────
export const CATEGORIES = [
  { id: 'all',            label: 'All' },
  { id: 'residence',      label: 'Residences' },
  { id: 'production',     label: 'Production' },
  { id: 'public_service', label: 'Public Service' },
  { id: 'infrastructure', label: 'Infrastructure' },
] as const
```

**While `building-catalog.json` doesn't exist yet** (Plan 2 produces it), keep the old import active and gate on an env/feature flag, or split the export into a separate file that Plan 2 wires in. Recommended: stub `building-catalog.json` as `[]` so the TypeScript build never breaks during development.

---

## Step 4 — Stub `building-catalog.json`

Create `src/data/building-catalog.json` with an empty array so `catalog.ts` compiles:

```json
[]
```

Plan 2 overwrites this with the real merged data.

---

## Step 5 — TypeScript verification

```bash
cd /home/ideans/data/projects/anno-planner
npx tsc -b --noEmit
npm run test:run
```

Expected: zero type errors, all 47 existing tests still green.  
If `Building` alias causes TS warnings, suppress with `// eslint-disable-next-line @typescript-eslint/no-deprecated` rather than removing the alias.

---

## Acceptance criteria

- [ ] `tsc -b` clean
- [ ] All 47 existing tests pass
- [ ] `BuildingFamily`, `BuildingVariant`, `BuildingCategory`, `ProductionStats` exported from `domain.ts`
- [ ] `categoryColors` exported from `src/constants/categoryColors.ts`
- [ ] `FAMILY_MAP`, `VARIANT_MAP` exported from `catalog.ts`; `BUILDING_MAP` still resolves (alias)
- [ ] `Building` deprecated alias present so no existing call sites break
- [ ] `building-catalog.json` stub exists (empty array, valid JSON)

---

## What this plan does NOT do

- Does not change any component (palette, inspector, minimap) — that's UI work gated on Plan 2 data
- Does not repoint `productionMath.ts` — repoint happens in Plan 2 after catalog merge validates
- Does not touch `migration.ts` or `LEGACY_ID_MAP`
- Does not author any building data
