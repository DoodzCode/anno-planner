# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Anno 1800 Offline Blueprint Builder** — offline-capable PWA for designing, optimizing, and sharing city/island blueprints without running the game. Personal use only (no public release).

Brainstorm doc: `docs/Anno_1800_Offline_Blueprint_Builder.md`

## Stack (decided or pending decision)

| Layer | Candidates | Status |
|---|---|---|
| Frontend | React+Vite **or** Svelte/SvelteKit | **Undecided — M0 spike** |
| Canvas/render | PixiJS (2D WebGL) **or** Konva | **Undecided — M0 spike** |
| State | Zustand/Jotai (React) or Svelte stores; Immer for undo/redo | Follows framework choice |
| Persistence | IndexedDB via Dexie; File System Access API for power users | Decided |
| PWA | Workbox | Decided |
| Sharing | LZ-string → URL fragment, no server | Decided |
| Deploy | Static host (GitHub Pages / Cloudflare Pages / Netlify) | Decided |
| Testing | Vitest + Playwright | Decided |

## Domain Model (core entities)

```
Building   id, name, tier, footprint(w×h), category, inputs[], outputs[],
           productionTime, influenceRadius, roadRequired, dlc
Blueprint  id, name, gridSize, placements[], metadata(author,version,dlcs),
           createdAt, updatedAt
Placement  buildingId, x, y, rotation, tier?, notes?
```

Tile units map 1:1 to in-game tiles. Blueprints are standalone (not tied to a specific island). App manages a local library (browse, rename, duplicate, delete).

## Architecture

Three-pane layout: **palette (left) · canvas (center) · inspector/stats (right)**

- **Canvas layer** — PixiJS or Konva; top-down sprites; pan/zoom/snap; 1000+ building performance target
- **Influence overlay system** — toggleable radii (market, pub, church, fire…); heatmap scoring stretch
- **Production math engine** — live input/output tallies per chain; pure functions, unit-testable
- **Blueprint library** — IndexedDB backed; JSON export/import; File System Access API for power users
- **Sharing** — LZ-string compress blueprint state into URL fragment
- **PWA shell** — Workbox service worker; offline asset caching; installable

## Milestones

- **M0** Spike — pick stack, render grid, place one building (1–2 days)
- **M1** Core canvas — pan/zoom, place/delete/rotate, undo/redo, IndexedDB (4–6 days)
- **M2** Catalog — Old World buildings, influence overlays, DLC badges (3–5 days)
- **M3** Math, library, export — production tallies, blueprint library, PNG + URL share (3–5 days)
- **M4** PWA polish — offline install, onboarding, dark mode, sprite pass (2–3 days)
- **M5** Personal release — static host or fully local (0.5–1 day)

## Open Decisions (blockers before M0)

- [ ] Framework: React+Pixi vs Svelte+Konva
- [ ] Canonical building data source (Anno wiki, community dataset, manual)
- [ ] Three-pane wireframe sketch

---

## Agent Collaboration

This project pairs 2 human developers with Citadel Coding Agents. Agents compress calendar time ~2–3×.

### Division of labor

| Domain | Owner |
|---|---|
| Canvas interaction model, UX feel | Human |
| Production math correctness | Human |
| Visual polish, sprite/icon review | Human |
| Stack scaffolding, Vite/build config | Agent |
| Boilerplate stores, hotkey wiring | Agent |
| Unit + Playwright test generation | Agent |
| JSON catalog ingestion + icon wiring | Agent |
| Export pipelines (PNG, URL, JSON serialize) | Agent |
| Service worker / PWA config | Agent |
| Onboarding tutorial scaffolding | Agent |

### Spawning agents

- Parallelize independent work across milestones with `superpowers:dispatching-parallel-agents`.
- Before any feature implementation, invoke `superpowers:brainstorming`.
- Before touching code, invoke `superpowers:writing-plans` if scope spans >2 files.
- Verify before claiming done: `superpowers:verification-before-completion`.

### Data entry work

Building catalog data entry (100s of buildings) is high-volume, parallelizable, and error-prone. Agents handle bulk ingestion; humans spot-check 10% for stat accuracy against the Anno 1800 wiki.

### Scope guard

Optimizer, multiplayer (WebRTC/Yjs), mod support, and island templates are **Phase 2**. Agents must not implement stretch features during MVP milestones without explicit human approval.

---

## Human Collaboration

**Team:** 2 developers. One leads canvas/UX, one leads data/math. Both review agent output.

### Workflow

1. Decisions land in `docs/Anno_1800_Offline_Blueprint_Builder.md` before they harden into code.
2. M0 spike output determines final stack choice — no implementation before that decision.
3. PRs: one human reviews before merge. Agent-generated PRs require human sign-off on UX and math correctness.

### Review priorities for humans

- Canvas feel: pan/zoom responsiveness, snap accuracy, rotate behavior
- Production math: ratio correctness against known Anno 1800 values
- Influence radius accuracy: cross-reference wiki tile values
- Building stat accuracy: flag any agent-ingested data that diverges from wiki

### Communication

Drop notes and counter-proposals in the brainstorm doc under the relevant section. Promote stable decisions to dedicated subpages in `docs/`.
