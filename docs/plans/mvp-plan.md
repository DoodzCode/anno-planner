# Anno 1800 Blueprint Builder — MVP Build Plan

> Status: proposed · 2026-05-29 · supersedes the open M0 stack questions in `ROADMAP.md`
> Source inputs: `CLAUDE.md`, `Anno_1800_Offline_Blueprint_Builder.md`, `mvp.research.md`,
> `research/konva-evaluation.md`, `research/pixijs-evaluation.md`

## 1. What "MVP" means here

Two scopes live in the docs. This plan delivers the first and is structured to grow into the second.

- **Meeting-notes MVP** (`mvp.research.md`): three-pane layout, a left palette of footprint-sized
  blocks, a center canvas, drag-and-drop placement, an empty right panel, placeholder shapes.
- **Roadmap MVP** (`ROADMAP.md`, M0–M5): the polished personal v1 — catalog, influence overlays,
  production math, library, export/share, PWA.

The strategy is a **vertical slice first** (a working, persistent place-and-drag editor) then widen
along the existing roadmap.

## 2. Stack decision (resolves the M0 blockers)

| Layer | Pick | Rationale |
|---|---|---|
| Framework | React + Vite + TypeScript | Team-decided in `mvp.research.md`; TS pays off for the domain model |
| Canvas renderer | **Konva** via `react-konva` | Research-recommended over PixiJS — see below |
| State | Zustand + Immer | Roadmap-specified; Immer enables undo/redo history |
| Persistence | Dexie (IndexedDB) | Decided in `CLAUDE.md` |
| Testing | Vitest (unit) + Playwright (e2e) | Decided in `CLAUDE.md` |

**Why Konva, not PixiJS or raw Canvas 2D:**
- `research/pixijs-evaluation.md` verdict: *"Don't start with PixiJS"* — it pulls in a full
  WebGL renderer (~120 kB gzipped) the MVP won't use.
- `research/konva-evaluation.md` verdict: *"Recommend with caveats"* — its scene graph maps cleanly
  onto draggable, hit-tested, grid-snapped sprites; pan/zoom/drag/snap/transform are all first-party.
- Raw Canvas 2D is the lightest but forces us to hand-roll drag, snapping, hit-testing, and zoom.
  Konva's ~55 kB buys exactly those interactions, which are the heart of this tool.

> **Action when greenlit:** flip the M0 renderer/framework checkboxes in `ROADMAP.md` and update the
> Stack table in `CLAUDE.md` from "Undecided — M0 spike" to "React + Vite" / "Konva".

## 3. Domain types (from CLAUDE.md, lock these first)

```ts
type Footprint = { w: number; h: number };          // in Anno tiles, 1:1

interface Building {
  id: string; name: string; tier: string;
  footprint: Footprint; category: string;
  inputs?: string[]; outputs?: string[];
  productionTime?: number; influenceRadius?: number;
  roadRequired?: boolean; dlc?: string;
}

interface Placement {
  id: string; buildingId: string;
  x: number; y: number;                              // top-left tile coords
  rotation: 0 | 90 | 180 | 270;
  tier?: string; notes?: string;
}

interface Blueprint {
  id: string; name: string; gridSize: { w: number; h: number };
  placements: Placement[];
  metadata: { author?: string; version: string; dlcs: string[] };
  createdAt: number; updatedAt: number;
}
```

## 4. Phased plan

### Phase A — Scaffold & decision (≈ M0, 1–2 days)
1. `npm create vite@latest` → React + TS. Add `react-konva konva zustand immer dexie`; dev: `vitest`.
2. Three-pane shell as a CSS grid: **palette (left) · canvas (center) · inspector (right, placeholder)**.
3. Konva `Stage` + grid `Layer` drawing tile lines (1 tile = 1 Anno tile; pick a base px/tile, e.g. 24).
4. Record the Konva + React decision in `docs/` and flip the M0 checkboxes in `ROADMAP.md`.

**Exit criteria:** app boots, three panes render, a tile grid is visible.

### Phase B — Core placement loop (the meeting-notes MVP, ≈ early M1)
5. Define the domain types above in `src/types/`.
6. Hardcode a tiny catalog (~5 buildings at real footprints: e.g. 3×3, 4×3, 2×2, 5×4, 1×1) as
   colored placeholder rectangles — no sprites yet.
7. Palette renders footprint-shaped blocks; **click-or-drag** to place onto the snapped grid.
8. Select a placement; **move** it (drag, snapped); **delete** (Del); **rotate** (R — swaps w/h).
9. Zustand store holds `placements`; Dexie auto-saves on change so reload restores the layout.

**Exit criteria:** place several buildings, move/rotate/delete them, reload the page, layout persists.

### Phase C — Make it feel real (≈ rest of M1 + a taste of M2)
10. Pan/zoom (wheel zoom-to-pointer + drag-pan), undo/redo via Immer history, multi-select (shift / box).
11. Inspector pane shows selected building's stats and a live placement count.

**Exit criteria:** Kaleb signs off on canvas feel and snap accuracy (the M1 human gate).

### Then: existing roadmap continues
- **M2** catalog ingestion + influence overlays + DLC badges (Ian lead).
- **M3** production math + blueprint library + PNG/URL/JSON export (Ian lead).
- **M4** Workbox PWA + dark mode + onboarding + sprite pass.
- **M5** static-host deploy, tag v1.0.0.

## 5. Proposed initial structure

```
src/
  main.tsx, App.tsx
  components/
    Palette.tsx          # left: footprint blocks, drag source
    Canvas.tsx           # center: Konva Stage, grid, placements
    Inspector.tsx        # right: selection stats (placeholder in Phase A)
  state/
    blueprintStore.ts    # Zustand + Immer: placements, selection, undo/redo
    persistence.ts       # Dexie schema + auto-save subscription
  data/
    catalog.ts           # hardcoded placeholder buildings (Phase B)
  types/
    domain.ts            # Building / Placement / Blueprint
  lib/
    grid.ts              # tile<->pixel math, snapping, rotation
```

## 6. Testing & gates
- Vitest on pure logic first: `lib/grid.ts` (snap, rotate, tile↔pixel), store mutations.
- Playwright golden path in Phase C: place → move → reload → still there.
- Human gates per `CLAUDE.md`: Kaleb reviews canvas feel/snap; Ian reviews data/math accuracy later.

## 7. Explicitly out of scope (Phase 2 — do not build without sign-off)
Optimizer, multiplayer (WebRTC/Yjs), mod support, island templates, diff/timeline modes,
real sprite art, and the full Old World catalog. Phases A–C use placeholder shapes and a stub catalog.

## 8. Open questions to settle during M0/M2
- Canonical building data source (Anno wiki / community dataset / manual) — still open in `ROADMAP.md`.
- Default grid size and px-per-tile baseline.
- Building data versioning strategy (game patches drift stats — noted as a risk).
