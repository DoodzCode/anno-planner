# Session 3 — Phase 4: Building Consolidation

**Branch:** `dev`  
**Prerequisite:** Session 2 commit `6802272` (Phase 3 workforce) must be present.  
**Status:** Complete.

---

## What was done in Session 2

- `src/data/production-chains.json` has workforce arrays on all 35 buildings.
- `src/lib/productionMath.ts` emits workforce flows; `workforceTotals` selector ready.
- `src/components/Inspector.tsx` renders a Workforce panel.

---

## What was done in Session 3

### 4A — Fix duplicate building ids in buildings-1800.json

The five "Small Warehouse" entries shared two ids:
- `logistic-02-warehouse-i` (Farmers — unique, but inconsistent naming)
- `logistic-02-warehouse-i-1010371` (Workers / Artisans / Engineers / Investors — 4 entries, same id; `BUILDING_MAP` silently dropped all but the last)

**Fix:** Each entry now has a unique, deterministic id and a tier-labelled name:

| Old id | New id | Name |
|---|---|---|
| `logistic-02-warehouse-i` | `logistic-02-warehouse-farmers` | Small Warehouse (Farmers) |
| `logistic-02-warehouse-i-1010371` | `logistic-02-warehouse-workers` | Small Warehouse (Workers) |
| `logistic-02-warehouse-i-1010371` | `logistic-02-warehouse-artisans` | Small Warehouse (Artisans) |
| `logistic-02-warehouse-i-1010371` | `logistic-02-warehouse-engineers` | Small Warehouse (Engineers) |
| `logistic-02-warehouse-i-1010371` | `logistic-02-warehouse-investors` | Small Warehouse (Investors) |

### 4B — Migration layer

New file `src/lib/migration.ts`:
- `LEGACY_ID_MAP` — maps old ids to new ids.
  - `logistic-02-warehouse-i` → `logistic-02-warehouse-farmers`
  - `logistic-02-warehouse-i-1010371` → `logistic-02-warehouse-investors` (the entry BUILDING_MAP kept)
- `migratePlacements(placements)` — pure function, returns a new array; passes unknown ids through unchanged; idempotent.

### 4C — Migration wired at all three load paths

1. **IndexedDB** (`persistence.ts`) — Dexie v1 → v2 upgrade rewrites all stored blueprints. Also applied defensively in `loadCurrentBlueprint` and `loadFromLibrary`.
2. **JSON import** (`exportImport.ts`) — `migratePlacements` applied before filtering by BUILDING_MAP.
3. **Share URL** (`share.ts`) — `migratePlacements` applied after decoding.

### 4D — Data integrity test un-skipped

`dataIntegrity.test.ts`: the `.todo` for duplicate building ids is now a live assertion. Passes.

### 4E — Migration tests

New `src/__tests__/migration.test.ts` — 9 tests:
- `LEGACY_ID_MAP` keys/values correct
- farmers id rewritten
- duplicate id rewritten to investors
- unknown ids pass through
- all placement fields preserved
- mixed blueprint (legacy + already-migrated + other)
- empty input → empty output
- idempotent

---

## Definition of Done

- [x] No duplicate building ids in `buildings-1800.json`
- [x] `LEGACY_ID_MAP` + `migratePlacements` in `src/lib/migration.ts`
- [x] Migration applied at IndexedDB load, JSON import, and share-URL decode
- [x] Duplicate-id integrity test passes (un-skipped)
- [x] 47 tests passing; `migration.ts` and `productionMath.ts` at 100% coverage
- [x] `npx tsc -b` clean

## Key files

| File | Change |
|---|---|
| `src/data/buildings-1800.json` | Fix warehouse ids; add tier labels to names |
| `src/lib/migration.ts` | New — `LEGACY_ID_MAP` + `migratePlacements` |
| `src/state/persistence.ts` | Dexie v2 upgrade; migration on load |
| `src/lib/exportImport.ts` | Migration before import filter |
| `src/lib/share.ts` | Migration after URL decode |
| `src/__tests__/dataIntegrity.test.ts` | Un-skip duplicate-id test |
| `src/__tests__/migration.test.ts` | New — 9 migration tests |
