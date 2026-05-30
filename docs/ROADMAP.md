# Anno Planner — Development Roadmap

> Status updated: 2026-05-15

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
| M0 | Spike | 1–2 | `[~]` | Both |
| M1 | Core canvas | 4–6 | `[ ]` | Kaleb (lead) |
| M2 | Building catalog | 3–5 | `[ ]` | Ian (lead) |
| M3 | Math, library & export | 3–5 | `[ ]` | Ian (lead) |
| M4 | PWA polish | 2–3 | `[ ]` | Both |
| M5 | Personal release | 0.5–1 | `[ ]` | Both |

---

## M0 — Spike *(1–2 days)*

**Goal:** Pick stack, render a grid, place one building.

**Open decisions (blockers)**

- [x] Framework: React + Vite + TypeScript (decided 2026-05-29)
- [x] Canvas renderer: Konva via react-konva (decided 2026-05-29)
- [ ] Canonical building data source (Anno wiki / community dataset / manual)
- [ ] Three-pane wireframe sketch

**Tasks**

- [x] Scaffold Vite project with chosen framework
- [x] Render a tile grid on screen
- [ ] Place one hardcoded building on the grid
- [x] Record stack decision in `docs/`

**Agent work:** scaffold the Vite skeleton; generate both React and Svelte prototypes for comparison if needed.

**Human gate:** Kaleb + Ian evaluate feel, pick stack, update CLAUDE.md.

---

## M1 — Core Canvas *(4–6 days)*

**Goal:** Fully interactive canvas with persistence.

**Tasks**

- [ ] Pan and zoom (mouse wheel + drag)
- [ ] Place building (click from palette)
- [ ] Rotate building (R key)
- [ ] Delete building (Del key)
- [ ] Multi-select (shift-click, drag-box)
- [ ] Snap-to-grid
- [ ] Undo / redo (Ctrl+Z / Ctrl+Y) via Immer history
- [ ] IndexedDB persistence (auto-save on change)
- [ ] Basic keyboard shortcut set

**Agent work:** boilerplate stores, hotkey wiring, undo/redo middleware, Vitest unit tests for state mutations.

**Human gate:** Kaleb reviews canvas feel and snap accuracy before merge to `dev`.

---

## M2 — Building Catalog *(3–5 days)*

**Goal:** Full Old World building set with palette and overlays.

**Tasks**

- [ ] Finalize building JSON schema
- [ ] Ingest Old World buildings (residential, production, public)
- [ ] Categorized, searchable building palette (left pane)
- [ ] DLC badges on buildings
- [ ] Influence overlay system (toggleable radii per type)
- [ ] Overlay toggle bar at top of canvas

**Agent work:** bulk JSON catalog ingestion, icon wiring, palette component, overlay render logic.

**Human gate:** Ian spot-checks 10% of building stats against the Anno 1800 wiki; Kaleb reviews palette UX.

---

## M3 — Math, Library & Export *(3–5 days)*

**Goal:** Production math, blueprint library, and sharing.

**Tasks**

- [ ] Production math engine (pure functions, unit-tested)
- [ ] Live input/output tallies in inspector pane (right)
- [ ] Blueprint library (IndexedDB): save, load, rename, duplicate, delete
- [ ] JSON export / import
- [ ] PNG export (canvas snapshot)
- [ ] Compressed URL share (LZ-string → URL fragment)
- [ ] File System Access API (power users)

**Agent work:** math engine scaffold, export pipelines, serialization, library UI component.

**Human gate:** Ian verifies math ratios against known Anno 1800 values before merge.

---

## M4 — PWA Polish *(2–3 days)*

**Goal:** Offline-capable, installable, polished.

**Tasks**

- [ ] Workbox service worker (offline asset caching)
- [ ] Installable PWA manifest
- [ ] Dark mode + Anno-themed palette
- [ ] First-run onboarding tutorial blueprint
- [ ] Minimap for large islands
- [ ] Top-down sprite pass (replace placeholder icons)

**Agent work:** service worker config, manifest, tutorial blueprint scaffolding.

**Human gate:** Kaleb reviews visual polish and sprite quality; both test offline install flow.

---

## M5 — Personal Release *(0.5–1 day)*

**Goal:** Ship to static host, self-dogfood.

**Tasks**

- [ ] Production build (`vite build`)
- [ ] Deploy to chosen static host (GitHub Pages / Cloudflare Pages / Netlify)
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
