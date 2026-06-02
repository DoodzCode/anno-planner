# Anno Planner — Development Roadmap

> Status updated: 2026-06-01

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

---

## M0 — Spike *(1–2 days)*

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

**Agent work:** scaffold the Vite skeleton; generate both React and Svelte prototypes for comparison if needed.

**Human gate:** Kaleb + Ian evaluate feel, pick stack, update CLAUDE.md.

---

## M1 — Core Canvas *(4–6 days)*

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

**Agent work:** boilerplate stores, hotkey wiring, undo/redo middleware, Vitest unit tests for state mutations.

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

**Agent work:** bulk JSON catalog ingestion, palette component, overlay render logic.

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

**Agent work:** math engine scaffold, export pipelines, serialization, library UI component.

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

**Agent work:** service worker config, manifest, tutorial blueprint scaffolding.

**Human gate:** Kaleb reviews visual polish and sprite quality; both test offline install flow.

---

## M5 — Personal Release *(0.5–1 day)* `[x]` *(completed 2026-06-01)*

**Goal:** Ship to static host, self-dogfood.

**Tasks**

- [x] Production build (`vite build`)
- [x] Deploy to chosen static host — Netlify (auto-deploy on push to `main`)
- [ ] Smoke-test all golden paths
- [ ] Tag `v1.0.0`

---

## Phase 2 (post-MVP, not in scope)

- Optimizer mode
- Diff view (compare two blueprints)
- Collaborative editing (WebRTC / Yjs CRDT)
- Mod support (community building packs via JSON manifest)
- Island templates
- Timeline mode (plan build order across eras)
