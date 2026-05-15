# Anno 1800 Offline Blueprint Builder

<aside>
🧭

**Purpose.** Collaborative brainstorm space for an offline, browser-based blueprint builder for *Anno 1800*. This page is a living guide — capture ideas, open questions, and decisions here before they harden into specs.

</aside>

## 1. Vision & North Star

- **One-line pitch:** A fast, offline-capable webapp where Anno 1800 players design, optimize, and share city/island blueprints without booting the game.
- **Why offline / webapp?**
    - No install friction — share by URL, run on any device.
    - Offline-first via PWA so it works on second monitor, tablet, or steam deck without a network.
    - Local-first data ownership — blueprints live in the user's browser/file system, not a server.
- **Success looks like:**
    - A player can plan an Old World residential tier + production stack in <10 minutes.
    - Layouts can be exported as image / JSON / shareable URL.
    - Community can publish blueprints without a backend dependency.

## 2. Target Users & Use Cases

- **The Min-Maxer** — wants tile-perfect production chain ratios and road optimization.
- **The Aesthete** — wants ornamental city planning, symmetry tools, screenshot-ready exports.
- **The Returning Player** — wants to plan their next session without launching the game.
- **The Content Creator** — wants embeddable / shareable blueprints for guides and YouTube.

### Primary use cases

1. Sketch a residential block (farmer → engineer → investor tiers) with influence radii visible.
2. Plan a production chain (e.g., Sausage, Beer, Steel) with throughput math.
3. Lay out an island shoreline with harbor buildings.
4. Browse a local **library of standalone blueprints** — save, version, rename, duplicate, and re-open.
5. Export to PNG / shareable link / JSON.

## 3. Core Feature Set (MVP)

| **Feature** | **MVP scope** | **Stretch** |
| --- | --- | --- |
| Grid canvas | Square tile grid, pan/zoom, snap-to-grid | Hex overlay for influence, isometric render |
| Building catalog | Old World buildings (residential, production, public) | New World, Arctic, Enbesa, Cape Trelawney DLCs |
| Placement | Click-drag to place, rotate, delete, multi-select | Stamps / copy-paste regions, mirror/flip |
| Roads | Dirt + paved, auto-connect | Train tracks, bridges, quay |
| Influence overlays | Toggle radii (market, pub, church, fire, etc.) | Heatmap coverage scoring |
| Production math | Live tally of inputs/outputs per chain | Auto-suggest missing tier buildings |
| Save/Load | IndexedDB local saves, JSON export/import | File System Access API for direct file editing |
| Sharing | Compressed URL share (state in fragment) | Public gallery (later, requires backend) |

## 4. Stretch / Phase 2 Ideas

- **Optimizer mode** — given a target population or output, auto-suggest building counts and footprints.
- **Diff view** — compare two blueprint versions side-by-side.
- **Collaborative editing** — WebRTC / Yjs CRDT for two-player co-design (still no central server).
- **Mod support** — load community building packs via JSON manifest.
- **In-game accuracy validator** — flag illegal placements (overlap, water tiles, missing road access).
- **Island templates** — import known Anno 1800 island shapes as a backdrop.
- **Timeline mode** — plan build order across game eras (Farmer → Investor).

## 5. Data & Domain Model

- **Building entity**
    - `id`, `name`, `tier`, `footprint` (w×h), `category`, `inputs[]`, `outputs[]`, `productionTime`, `influenceRadius`, `roadRequired`, `dlc`
- **Blueprint entity**
    - `id`, `name`, `gridSize`, `placements[]`, `metadata` (author, version, DLCs used), `createdAt`, `updatedAt`
- **Placement**
    - `buildingId`, `x`, `y`, `rotation`, `tier?`, `notes?`
- **Open data questions**
    - Where do we source canonical building stats? (Anno 1800 wiki, community datasets, manual entry?)
    - License/attribution for icons and stats?

## 6. Tech Stack Candidates

- **Frontend framework:** React + Vite, or Svelte/SvelteKit (lighter), or SolidJS.
- **Canvas/render:** PixiJS (2D WebGL) or Konva — both handle thousands of sprites cleanly. Fallback: plain Canvas2D.
- **State:** Zustand / Jotai / Svelte stores. Use immer for undo/redo history.
- **Persistence:** IndexedDB (via Dexie), File System Access API for power users.
- **PWA:** Workbox for service worker + offline asset caching.
- **Sharing:** LZ-string compress → URL fragment; no server needed.
- **Build/deploy:** Static host (GitHub Pages, Cloudflare Pages, Netlify).
- **Testing:** Vitest + Playwright for end-to-end placement flows.

## 7. UX & Interaction Notes

- **Three-pane layout:** building palette (left) · canvas (center) · inspector / stats (right).
- **Keyboard-first:** hotkeys for rotate (R), delete (Del), copy (C), paste (V), undo (Ctrl+Z).
- **Influence toggle bar** at top of canvas — one click per overlay type.
- **Minimap** for large islands.
- **Dark mode** + Anno-themed color palette.
- **Onboarding:** first-run tutorial blueprint that walks through placement, road, influence overlay.

## 8. Open Questions

- [x]  Tile dimensions — **match Anno's actual grid** (1 tile = 1 in-game tile). Footprints, road widths, and influence radii will be expressed in real Anno tile units so layouts transfer 1:1.
- [x]  **Visuals — stylized top-down sprites.** Go beyond pure icons; render buildings as top-down sprites for readable, screenshot-friendly layouts.
- [x]  **Blueprint scope — standalone, library-managed.** Blueprints are *not* tied to a specific island. Each blueprint is its own standalone plan, and the app manages a local library of them (browse, rename, duplicate, delete).
- [x]  **Platform — desktop only for v1.** Touch / tablet gestures are deferred to v2 or later.
- [x]  **Licensing — N/A.** This is a personal-use tool and will not be published, so Ubisoft/Anno fan-content policy is not a blocker.
- [x]  **DLC handling — both.** Buildings carry DLC badges, and the blueprint palette + library support filtered views by DLC.

## 9. Risks & Unknowns

- **Data accuracy drift** — game patches change stats; need a versioned building dataset.
- **Performance at scale** — large blueprints (1000+ buildings) on the canvas.
- **IP / trademark** — using Anno building names and icons; safer to use generic terms + community-art icons.
- **Scope creep** — optimizer, multiplayer, mods can all balloon; protect MVP.

## 10. Milestones (rough)

<aside>
⚡

**Team assumption:** 2 human developers paired with **Citadel Coding Agents**. Agents parallelize scaffolding, catalog data entry, test generation, and routine refactors, so calendar time is compressed roughly 2–3× vs. solo-human estimates. Estimates below are elapsed working days, not raw effort.

</aside>

1. **M0 — Spike (1–2 days):** Pick stack, render a grid, place one building. Agents scaffold the Vite/Pixi (or Svelte/Konva) skeleton in parallel while humans evaluate.
2. **M1 — Core canvas (4–6 days):** Pan/zoom, place/delete/rotate, undo/redo, IndexedDB persistence. Humans drive interaction model; agents generate boilerplate stores, hotkey wiring, and unit tests.
3. **M2 — Catalog (3–5 days):** Old World building set, categorized palette, influence overlays, DLC badges. Agents handle the bulk JSON catalog ingestion + icon wiring; humans review accuracy and UX.
4. **M3 — Math, library & export (3–5 days):** Production tallies, blueprint library (save/load/rename/duplicate), PNG export, compressed URL share. Agents own export pipelines and serialization; humans tune math correctness.
5. **M4 — PWA polish (2–3 days):** Offline install, onboarding tutorial, dark mode, top-down sprite pass. Agents generate service worker config and tutorial scaffolding; humans handle visual polish.
6. **M5 — Personal release (0.5–1 day):** Build, deploy to static host (or run fully local), self-dogfood. No public gallery — personal use only.

**Total elapsed:** ~13–22 working days (≈3–4.5 calendar weeks) end-to-end for a polished personal v1.

## 11. Inspiration & Reference

- Anno Designer (existing desktop tool) — what it does well, where it falls short.
- Factorio Blueprint editors (online + offline).
- Cities: Skylines layout planners.
- Tinkercad / Figma — drag/drop and selection UX patterns.

## 12. Next Actions

- [ ]  Pin down MVP scope vs stretch (cut list).
- [ ]  Decide canonical building data source.
- [ ]  Stack decision: React+Pixi vs Svelte+Konva.
- [ ]  Sketch the three-pane layout (wireframe).
- [ ]  Stand up a repo + Vite skeleton.
- [ ]  Verify Anno fan-content licensing before naming/branding.

---

<aside>
💬

Drop notes, links, and counter-proposals inline under any section. When a section stabilizes, promote it to a dedicated subpage.

</aside>