# Anno Planner — Development Roadmap

> Status updated: 2026-06-03 (M6 Phase 5 complete; M4-B Phases 1+2 complete)

## Status legend

| Symbol | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Done |
| `[!]` | Blocked |

---

## Milestone Overview

| Milestone | Name | Est. days | Status | Owner |
|---|---|---|---|---|
| M0 | Spike | 1–2 | `[x]` | Both |
| M1 | Core canvas | 4–6 | `[x]` | Kaleb (lead) |
| M2 | Building catalog | 3–5 | `[x]` | Ian (lead) |
| M3 | Math, library & export | 3–5 | `[x]` | Ian (lead) |
| M4 | PWA polish | 2–3 | `[x]` | Both |
| M5 | Personal release | 0.5–1 | `[x]` | Both |
| M6 | Engine & hardening | Ongoing | `[~]` (6/7 phases) | frank |
| M4-B | Data model & consolidation *(side quest)* | Ongoing | `[~]` (2/5 phases) | Clyde |

---

## M0 — Spike *(1–2 days)* `[x]`

**Goal:** Pick stack, render a grid, place one building.

**Open decisions (blockers)**

- [x] Framework: React + Vite + TypeScript (decided 2026-05-29)
- [x] Canvas renderer: Konva via react-konva (decided 2026-05-29)
- [x] Canonical building data source — `resources/presets.json` (community layout tool dataset, v5.1, 2026-05-30)
- [ ] Three-pane wireframe sketch

**Tasks**

- [x] Scaffold Vite project with chosen framework
- [x] Render a tile grid on screen
- [x] Place one hardcoded building on the grid
- [x] Record stack decision in `docs/`

**Human gate:** Kaleb + Ian evaluate feel, pick stack, update CLAUDE.md.

---

## M1 — Core Canvas *(4–6 days)* `[x]`

**Goal:** Fully interactive canvas with persistence.

**Tasks**

- [x] Pan and zoom (mouse wheel zoom-to-pointer + space/middle-drag pan)
- [x] Place building (click from palette)
- [x] Rotate building (R key)
- [x] Delete building (Del key)
- [x] Multi-select (shift-click + drag box-select)
- [x] Snap-to-grid
- [x] Undo / redo (Ctrl+Z / Ctrl+Y) via Immer history
- [x] IndexedDB persistence (auto-save on change)
- [x] Basic keyboard shortcut set (R, Del, Esc, Ctrl+Z/Y)

**Human gate:** Kaleb reviews canvas feel and snap accuracy before merge to `dev`.

---

## M2 — Building Catalog *(3–5 days)* `[x]` *(completed 2026-05-30)*

**Goal:** Full Old World building set with palette and overlays.

**Tasks**

- [x] Finalize building JSON schema (`src/types/domain.ts` — added `iconFile`, `workRadius`, `overlayType`, `group`)
- [x] Ingest Old World buildings — 156 buildings (farmers → investors + harbor + all-worlds) extracted from `resources/presets.json` into `src/data/buildings-1800.json`
- [x] Categorized, searchable building palette — tier filter tabs + live search + grouped by category
- [x] DLC badges on buildings (Seat of Power, Docklands, Empire of the Skies, Seeds of Change)
- [x] Influence overlay system — `src/state/overlayStore.ts`; 13 service buildings with overlay types (market, pub, church, fire, police, education, health, bank, culture, power)
- [x] Overlay toggle bar at top of canvas — `src/components/OverlayBar.tsx`

**Human gate:** Ian spot-checks 10% of building stats against the Anno 1800 wiki; Kaleb reviews palette UX.

---

## M3 — Math, Library & Export *(3–5 days)* `[x]` *(completed 2026-05-30)*

**Goal:** Production math, blueprint library, and sharing.

**Tasks**

- [x] Production math engine — `src/lib/productionMath.ts`; 32 buildings, 47 goods; 13 Vitest tests (Furnace ratio validated)
- [x] Live t/min tallies in Inspector — green surplus / red deficit, memoized on placements
- [x] Blueprint library — save/load/rename/duplicate/delete; `BlueprintLibrary.tsx` modal; Dexie 'current' + UUID slots
- [x] JSON export / import — validates buildingIds, skips unknowns
- [x] PNG export — `stage.toDataURL({ pixelRatio: 2 })` via Konva stage ref
- [x] Compressed URL share — LZ-string → `#bp=` fragment; clipboard copy + toast; decoded on mount
- [x] File System Access API — `showSaveFilePicker`/`showOpenFilePicker` with blob/input fallback

**Human gate:** Ian verifies math ratios against known Anno 1800 values before merge.

---

## M4 — PWA Polish *(2–3 days)* `[x]` *(completed 2026-05-30)*

**Goal:** Offline-capable, installable, polished.

**Tasks**

- [x] Workbox service worker — `vite-plugin-pwa` with `autoUpdate`, caches all static assets
- [x] Installable PWA manifest — name, icons (SVG 192+512), `display: standalone`, theme `#0a0a16`
- [x] Anno-themed palette — CSS custom properties (`--accent: #c8a96e`, `--accent-dim`, etc.) replacing all blue/purple tones
- [x] First-run onboarding — `Onboarding.tsx` modal (localStorage flag); "Load tutorial layout" pre-places a Farmers production chain
- [x] Minimap — `Minimap.tsx` plain-canvas overlay (160×100) in canvas bottom-right; shows placements + viewport rect
- [x] Sprite pass — category accent band, shadow on labels, Anno gold selection highlight; `/public/icons/` ready for real sprites

**Human gate:** Kaleb reviews visual polish and sprite quality; both test offline install flow.

---

## M5 — Personal Release *(0.5–1 day)* `[x]` *(completed 2026-06-01)*

**Goal:** Ship to static host, self-dogfood.

**Tasks**

- [x] Production build (`vite build`)
- [x] Deploy to Netlify — `netlify.toml`; auto-deploy on push to `main`
- [x] Smoke-test all golden paths
- [x] Personal release marked complete; `.claude/` guarded from git

---

## M6 — Engine & Hardening `[~]` *(started 2026-06-02)*

**Goal:** Workforce calculation, data gaps, building consolidation, resizable panes, and full test coverage.

**Scope:** Workforce (#1), Missing outputs — Red Pepper / Cattle (#2), Flour Mill grain display (#3), Building consolidation (#4), Unit testing (#5), Resizable panes (#6).

### Phase 0 — Test & data foundation `[x]` *(commit 5480719)*

- [x] Add `@vitest/coverage-v8`; wire `test:run` and `test:coverage` scripts; set coverage gate for `src/lib/**`
- [x] Add `jsdom` + `@testing-library/react` for component tests; split Vitest config (node vs jsdom environments)
- [x] Data-integrity test suite — no duplicate ids, every chain mapping resolves, every good and input/output exists
- [x] CI wired: `tsc -b` → `test:run` → `build`

### Phase 1 — Generalize the engine `[x]` *(commit 5480719)*

- [x] Introduce `ResourceFlow` / `buildingFlows` / `aggregateFlows` — unified signed flow model (`good:` and `workforce:` namespaced ids)
- [x] `goodsTallies` and `workforceTotals` convenience selectors
- [x] Re-express `computeTallies` on top of `aggregateFlows`; public API backward-compatible
- [x] `productionMath.ts` at 100% line/branch coverage

### Phase 2 — Fill data gaps `[x]` *(commit 5480719)*

Fixes #2 (Red Pepper / Cattle) and #3 (Flour Mill grain display).

- [x] Add chain rows + id-based mappings for Red Pepper Farm and Cattle Farm (New World tier, Artisans)
- [x] Inspector updated to show produced / consumed / net per good — Flour Mill grain consumption now visible even when net-balanced
- [x] Data-driven tests: pepper output, cattle output, flour-mill grain consumption, mixed blueprint

### Phase 3 — Workforce `[x]` *(commit 6802272)*

Fixes #1 (workforce calculation).

- [x] `WorkforceRequirement[]` schema added to `ChainBuilding` in `productionChain.ts`
- [x] `buildingFlows` emits workforce flows as negative demand; `aggregateFlows` totals by tier
- [x] All 35 production buildings populated with workforce data in `production-chains.json`
- [x] Inspector Workforce panel — required headcount per tier, only shown when `consumed > 0`
- [x] Data-integrity test covers workforce tier validity and positive counts
- [x] 37 tests passing; `productionMath.ts` stays at 100% coverage

**Human gate:** Workforce numbers for artisans/engineers buildings (marked `verify: true` in `production-chains.json`) should be cross-checked against the Anno 1800 wiki before Phase 4 ships.

### Phase 4 — Building consolidation `[x]` *(commit 668855a)*

Fixes #4 (duplicate-id bug; Small Warehouse tier variants now have unique ids).

- [x] Assign unique ids to all 5 Small Warehouse tier entries in `buildings-1800.json`; add tier labels to names
- [x] `LEGACY_ID_MAP` + `migratePlacements()` in `src/lib/migration.ts` — pure, idempotent, drops nothing
- [x] Migration wired at all three load paths: Dexie v1→v2 upgrade, `importJSON`, `decodeShareURL`
- [x] Duplicate-id integrity test un-skipped and passing
- [x] 9 migration tests; `migration.ts` at 100% coverage; 47 total tests green

### Phase 5 — Resizable panes `[x]`

Fixes #6 (hard-coded 3-column grid in `App.css`).

- [x] `--col-left` / `--col-right` CSS vars drive a 5-column grid; `PaneGutter` handles pointer drag, keyboard (±8px / ±32px Shift), double-click reset, and `role="separator"` a11y
- [x] `localStorage` persistence for `{left, right}` px widths; restored on mount with viewport clamping
- [x] Konva stage re-measures via existing `ResizeObserver` in `Canvas.tsx` — canvas never clips
- [x] 16 unit tests for pure `redistribute()` and `clampToViewport()` math; 63 total tests green
- [x] Palette building list reflows into 2- or 3-column card grid via CSS container queries as palette widens

### Phase 6 — Hardening `[ ]`

- [ ] Playwright E2E: place → compute → save → reload → migrate golden path
- [ ] Enforce coverage gate in CI; PWA cache bump for data changes
- [ ] Update `CLAUDE.md` / `CONTRIBUTING.md` / docs to reflect M6 completion

---

## M4-B — Data Model & Consolidation *(side quest)* `[~]` *(started 2026-06-03)*

**Goal:** Replace flat `Building` catalog with `BuildingFamily` / `BuildingVariant` model. Merge production chain data into unified `building-catalog.json`. Enable variant-selector palette UX.

**Branch:** `m4-b` · Full detail: `docs/M4B-PROGRESS.html`

### Phase 1 — Schema redesign `[x]` *(commit c279259)*

- [x] `domain.ts` — `BuildingCategory`, `Region`, `ProductionStats`, `BuildingVariant`, `BuildingFamily` types; `Building` kept as `@deprecated`
- [x] `categoryColors.ts` — single `Record<BuildingCategory, string>` color map
- [x] `catalog.ts` — `FAMILIES`, `FAMILY_MAP`, `VARIANT_MAP`, `FAMILY_CATEGORIES`, `getBuilding()` bridge
- [x] `building-catalog.json` — empty stub; TypeScript build never breaks
- [x] 7 code-review findings fixed (footprint field alignment, outputPerMin dropped, CATEGORIES deprecated)
- [x] `tsc` clean · 47 / 47 tests green

### Phase 2 — Catalog build `[x]` *(commit f4a8394)*

- [x] `scripts/build-catalog.ts` — 5-phase pipeline: audit → categorise → group → merge → validate
- [x] `building-catalog.json` — 133 families, 156 variants (all legacy ids preserved), 34 with production stats
- [x] `goods.json` — 49 goods extracted from production-chains archive
- [x] `productionMath.ts` — `variantToChainBuilding()` adapter; `computeTallies` checks `VARIANT_MAP` first
- [x] `Inspector.tsx` — chain lookup repointed to `VARIANT_MAP` + `goods.json`
- [x] `dataIntegrity.test.ts` — rewritten against `building-catalog.json` + `goods.json`
- [x] Source files archived in `src/data/archive/`; `tsc` clean · 47 / 47 tests green

### Phase 3 — Component integration `[ ]`

- [ ] `Palette.tsx` — use `FAMILIES`; group by `BuildingCategory`; replace hard-coded `CATEGORY_ORDER`
- [ ] `Canvas.tsx` + `Minimap.tsx` — switch to `getBuilding()`; replace `building.color` with `categoryColors` lookup
- [ ] **Human gate:** Kaleb reviews canvas/palette rendering before merge to `dev`

### Phase 4 — Variant selector UI `[ ]`

- [ ] Palette shows one card per family; variant dropdown for families with `variants.length > 1`
- [ ] `selectedVariantId: Record<familyId, variantId>` state; persisted to localStorage
- [ ] Quick-select tier tabs for residences and warehouses
- [ ] **Human gate:** Ian + Kaleb review UX before merge

### Phase 5 — Finish & merge `[ ]`

- [ ] Wire `categoryColors` to all render components (replace `building.color`)
- [ ] Remove `BUILDINGS` back-compat array once all consumers use `VARIANT_MAP` / `FAMILY_MAP`
- [ ] Update `ROADMAP.md` + `ROADMAP.html` to mark M4-B complete
- [ ] Open PR: `m4-b` → `dev`; both humans review before merge

---

## Phase 2 (post-MVP, not in scope)

- Optimizer mode
- Diff view (compare two blueprints)
- Collaborative editing (WebRTC / Yjs CRDT)
- Mod support (community building packs via JSON manifest)
- Island templates
- Timeline mode (plan build order across eras)
