# Plan: Catalog Build — Merge & Produce `building-catalog.json`
> Branch: `m4-b` | Depends on: plan-data-model-redesign.md (schema must exist first)

## Goal

Produce `src/data/building-catalog.json` — the single unified catalog — by auditing, reconciling, and merging `buildings-1800.json` (156 buildings, footprints + icons) with `production-chains.json` (35 chain buildings, recipes + workforce). Output a clean reconciliation report. Archive, not delete, the source files.

---

## Source files

| File | Records | Authoritative for |
|---|---|---|
| `src/data/buildings-1800.json` | 156 buildings | `id`, `name`, `footprint`, `iconFile`, `group`, `tier`, `dlc`, `overlayType`, `workRadius` |
| `src/data/production-chains.json` | 35 chain buildings | `baseCycleSeconds`, `outputPerMin`, `output`, `inputs[]`, `requiresElectricity`, `workforce[]`, `verify` |
| `src/data/chainNameMap.ts` | 35 entries | Ground-truth name→chain-id mapping (existing hand-authored link table) |

Footprints come exclusively from `buildings-1800.json`. Production data comes exclusively from `production-chains.json`. The 121 catalog buildings with no chain entry are non-producing and remain valid (no production field on their variant).

---

## Deliverables

| Path | Description |
|---|---|
| `src/data/building-catalog.json` | New unified catalog — array of `BuildingFamily` |
| `docs/reconciliation-report.md` | Audit findings: matches, unmatched, orphan chain entries, edge calls |
| `src/data/archive/buildings-1800.json` | Source file archived (not deleted) |
| `src/data/archive/production-chains.json` | Source file archived (not deleted) |

---

## Script

**Location:** `scripts/build-catalog.ts`  
**Runtime:** `npx tsx scripts/build-catalog.ts`  
**Add to package.json:** `"build:catalog": "tsx scripts/build-catalog.ts"`

The script is pure: reads inputs, writes outputs, exits non-zero if unresolved orphans or data-loss detected.

---

## Phase A — Audit & Reconciliation

### A1. Load both sources

```
buildings-1800.json → catalogBuildings[]  (156)
production-chains.json → chainBuildings[] (35)
chainNameMap.ts → NAME_TO_CHAIN_ID        (35 hand-authored links)
```

### A2. Match catalog → chain

For each catalog building:
1. Look up `catalogBuilding.name` in `NAME_TO_CHAIN_ID` → direct match
2. If not found, attempt case-insensitive name comparison → fuzzy candidate (flag for human review)
3. If no fuzzy match → non-producing (no chain data; expected for 121 entries)

Track three buckets:
- **matched** — catalog entry + chain entry joined (expected: ~35)
- **unmatched catalog** — no chain data (expected: ~121, all valid)
- **orphan chain** — chain building with no catalog match (expected: 0; any found = blocker, flag in report)

### A3. Cross-check ids

For every matched pair: verify `catalogBuilding.id` is not already in `LEGACY_ID_MAP` (migration.ts). If it is, log the alias in the report so the migration shim can be reviewed.

### A4. Write reconciliation report

`docs/reconciliation-report.md` sections:
1. Summary table (matched / unmatched-catalog / orphan counts)
2. Matched table: `catalog.name | catalog.id | chain.id | verify flag`
3. Unmatched catalog entries (non-producing, no action needed)
4. Orphan chain entries (chain buildings not found in catalog — must be zero for clean pass)
5. Category edge calls (see Phase B)

Script exits non-zero if orphan count > 0.

---

## Phase B — Category Assignment

Assign `BuildingCategory` to every catalog building using these rules in order:

| Priority | Condition | Category |
|---|---|---|
| 1 | `catalog.category === 'residence'` | `residence` |
| 2 | Has chain entry (has `output`) **OR** `catalog.category === 'production'` | `production` |
| 3 | Has `overlayType` OR is in the 13-building overlay set in `overlayStore.ts` | `public_service` |
| 4 | `catalog.category === 'public'` AND no `overlayType` | `public_service` (buff-radius: trade union, town hall) |
| 5 | Everything else (harbor, military, ornamental, monument, road) | `infrastructure` |

**Edge calls — pre-resolved (log in report, don't silently default):**
- Power plants (`electricity-03-gas-power-plant`, etc.) → `public_service` (radius is primary function)
- Trade Union / Town Hall → `public_service`
- Harbor buildings (`cat === 'harbor'`) → `infrastructure`
- Palace / Palace modules → `infrastructure` (monument)
- Military towers → `infrastructure`

Any building whose category assignment is ambiguous: log in report under "Edge calls reviewed" with reason. Script does NOT silently default ambiguous buildings.

**Region assignment:**
- `tier === 'all'` and group contains "New World" → `new_world`
- group contains "Arctic" → `arctic`
- group contains "Enbesa" → `enbesa`
- Default → `old_world`

---

## Phase C — Family Grouping

Group catalog buildings into `BuildingFamily` entries.

### C1. Grouping key

Primary key = `building.group` field (already exists in catalog). Buildings sharing the same `group` value are family candidates.

### C2. Variant guard

Before collapsing into one family, verify the footprint-AND-role guardrail:
- All buildings in the family share the same `category` assignment (from Phase B)
- OR are explicitly different (→ split into sub-families, documented in report)

Footprint need not match (residence tiers can differ — Farmer 3×3, Scholar 4×4 — they still form one family because the role is identical). The guardrail protects against merging different building types that happen to share a group label.

### C3. Assign family id

Family id = slugified `group` value:
- Strip leading ordinal prefixes: `"(1) Old World"` → `old-world`
- Lowercase + replace spaces/special chars with `-`
- If two groups slug to the same id, append a suffix to disambiguate

### C4. Variant ordering

Within a family, assign `order` by tier using the canonical sequence:
```
farmers=0, workers=1, artisans=2, engineers=3, investors=4, scholars=5, harbor=6, all=7
```
Non-tier buildings default to `order: 0`.

`defaultVariantId` = the variant with `order === 0`.

### C5. Standalone buildings

Buildings with unique `group` values or that fail the footprint-AND-role check stay as families of one variant. This is expected and correct.

---

## Phase D — Merge Production Data

For each matched building (Phase A):

1. Build `ProductionStats` from chain entry:
   ```
   {
     requiresElectricity,
     baseCycleSeconds,
     outputPerMin,
     output,
     inputs,
     workforce,      // may be absent if not populated
     verify          // flag if chain entry has verify: true
   }
   ```
2. Attach as `variant.production` on the correct `BuildingVariant` (matched by id)

Non-producing buildings: `variant.production` is omitted (not `null`, just absent).

### Regression anchor

After merge, verify the Furnace → Steelworks → Weapons ratio holds:
```
Furnace: baseCycleSeconds=30, outputPerMin=2  → iron × 2/min
Steelworks: inputs=[iron@2,coal@2], outputPerMin=2  → steel_beams × 2/min
Weapons Factory: inputs=[steel_beams@1], outputPerMin=1 → weapons × 1/min
```
Script asserts this chain resolves correctly before writing output.

---

## Phase E — Write Output

### E1. Write `src/data/building-catalog.json`

Array of `BuildingFamily[]` objects in the new schema.  
Sorted by: `region` → `category` → `family.name`.

### E2. Validate output

Before writing, run assertions:
- Every legacy building id appears as a `variant.id` somewhere in the output (zero data loss)
- No duplicate `family.id`
- No duplicate `variant.id`
- Every `defaultVariantId` resolves to a variant in the same family
- All 35 chain buildings are accounted for (either merged or in orphan report)

If any assertion fails: print failure + exit non-zero. Do not write partial output.

### E3. Archive source files

```bash
mkdir -p src/data/archive
cp src/data/buildings-1800.json src/data/archive/buildings-1800.json
cp src/data/production-chains.json src/data/archive/production-chains.json
```

Do NOT delete or modify the originals until the new catalog is validated by tests (next step).

---

## Phase F — Wire & Validate

### F1. Update `catalog.ts`

Replace the stub import:
```ts
// Before (stub):
import rawFamilies from './building-catalog.json'
// After: same line — file now has real data
```

Update `TIERS` and `CATEGORIES` to match the new schema (already planned in plan-data-model-redesign.md Step 3).

### F2. Repoint `productionMath.ts`

Replace the `chainNameMap` indirection in `computeTallies`:

```ts
// Old: catalogBuilding.name → chainNameMap → chainBuildingMap → ChainBuilding
// New: VARIANT_MAP.get(p.buildingId)?.production → ProductionStats
```

Adapter shim: write a `variantToChainBuilding(v: BuildingVariant): ChainBuilding | null` helper that reads `v.production` and returns a `ChainBuilding`-shaped object for `buildingFlows`. This keeps `productionMath.ts` pure and unchanged; only the resolve function in `computeTallies` changes.

### F3. Run test suite

```bash
npm run test:run
```

Regression anchor: Furnace ratio test must stay green. All 47 existing tests must pass.

### F4. Update data-integrity tests

Add to the existing integrity test suite:
- Every `variant.id` in the catalog matches a known legacy id (or LEGACY_ID_MAP entry)
- Zero duplicate `family.id` and `variant.id` values
- Every `defaultVariantId` resolves within its family

### F5. Delete source files (only after tests pass)

```bash
rm src/data/buildings-1800.json
rm src/data/production-chains.json
rm src/data/chainNameMap.ts
```

Archived copies remain in `src/data/archive/`. Delete only after full test run passes.

---

## Migration shim review

After Phase E, diff the full set of variant ids against the current `BUILDING_MAP` keys. Any id that changed or was dropped must be added to `LEGACY_ID_MAP` in `migration.ts`. Expected: no new entries needed (every legacy id survives as a variant id).

---

## Acceptance criteria

- [ ] `npm run build:catalog` runs clean with exit code 0
- [ ] `docs/reconciliation-report.md` exists with zero orphan chain entries
- [ ] `src/data/building-catalog.json` contains all 156 legacy building ids as variant ids
- [ ] All 35 chain buildings merged onto correct variants (verify flags preserved)
- [ ] `productionMath.ts` reads from unified catalog; Furnace ratio test green
- [ ] All 47 (+ new integrity) tests pass
- [ ] Source files archived in `src/data/archive/`
- [ ] `LEGACY_ID_MAP` reviewed — no silent breakage of saved blueprints

---

## Sequencing note

Run Phase A (audit) and produce the reconciliation report **before** writing any code. The report de-risks everything downstream — it surfaces mismatches while they're cheap to fix.

Do not start Phase C (family grouping) until Phase B (category assignment) is locked. Category is the primary guard against over-collapsing.

Do not start Phase F (wire & validate) until the Furnace regression assertion in Phase D passes in the script dry run.
