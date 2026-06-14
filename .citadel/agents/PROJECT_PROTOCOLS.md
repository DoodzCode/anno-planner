# Anno Planner — Project Agent Protocols

This document contains project-scoped protocols, tech stack, architecture, and collaboration guidelines shared by all developers and agent constructs working in this repository.

---

## 1. Local Agent Setup Guide

To prevent configuration collisions and git branch pollution, the root identity routing files (`GEMINI.md`, `AGENTS.md`, `CLAUDE.md`) are gitignored and treated as machine-local configuration anchors.

Every developer and agent harness must set up their own local configuration anchors copied from the templates:

```bash
# Copy templates to the workspace root
cp .citadel/agents/GEMINI.md.template GEMINI.md
cp .citadel/agents/AGENTS.md.template AGENTS.md
cp .citadel/agents/CLAUDE.md.template CLAUDE.md
```

Once copied, open the root files and customize the placeholders (e.g. `[AGENT_NAME]`, `[PATH_TO_LOCAL_VAULT]`, etc.) to point to your local agent profile vault and system hydration commands.

---

## 2. Project Overview

**Anno 1800 Offline Blueprint Builder** — offline-capable PWA for designing, optimizing, and sharing city/island blueprints without running the game. Personal use only (no public release).

Brainstorm doc: [docs/Anno_1800_Offline_Blueprint_Builder.md](file:///home/ideans/windata/projects/anno-planner/docs/Anno_1800_Offline_Blueprint_Builder.md)

---

## 3. Technology Stack

| Layer | Decisions |
|---|---|
| **Frontend** | React + Vite + TypeScript |
| **Canvas/render** | Konva via `react-konva` |
| **State** | Zustand + Immer |
| **Persistence** | IndexedDB via Dexie; File System Access API for exporting files |
| **PWA** | Workbox service worker |
| **Sharing** | LZ-string compressed state → URL fragment (serverless) |
| **Deploy** | Netlify static hosting |
| **Testing** | Vitest + Playwright |

---

## 4. Domain Model (Core Entities)

*   **Building:** `id`, `name`, `tier`, `footprint(w×h)`, `category`, `inputs[]`, `outputs[]`, `productionTime`, `influenceRadius`, `roadRequired`, `dlc`
*   **Blueprint:** `id`, `name`, `gridSize`, `placements[]`, `metadata(author, version, dlcs)`, `createdAt`, `updatedAt`
*   **Placement:** `buildingId`, `x`, `y`, `rotation`, `tier?`, `notes?`

*Note: Tile units map 1:1 to in-game tiles. Blueprints are standalone. App manages a local library (browse, rename, duplicate, delete).*

---

## 5. Architecture

Three-pane layout: **palette (left) · canvas (center) · inspector/stats (right)**

*   **Canvas layer:** Konva-based rendering, top-down building grids, snap-to-grid, pan/zoom, performance target: 1000+ placements.
*   **Influence overlay system:** Toggleable radius circles for service buildings (market, pub, church, fire station, etc.).
*   **Production math engine:** Signed resource flow model (`good:` and `workforce:` namespaces) generating live per-good and per-tier workforce tallies in Inspector.
*   **Blueprint library:** IndexedDB backend; JSON export/import; File System Access API.
*   **Sharing:** LZ-string compressed blueprint state in URL `#bp=` fragment.
*   **PWA shell:** Workbox service worker caching static assets for offline usage.

---

## 6. Branch Strategy

```
origin/main   ← production; receives merges from dev only via PR
origin/dev    ← integration branch; all feature work targets here
origin/kaleb  ← Kaleb's personal branch (cut from dev)
origin/ian    ← Ian's personal branch (cut from dev)
```

Agents operate in **git worktrees on the human's personal branch** — never push directly to `dev` or `main`.
See `CONTRIBUTING.md` for the full PR workflow and guardrails.

---

## 7. Agent Collaboration

### Division of Labor

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

### Spawning Agents
*   Parallelize independent work across milestones with `superpowers:dispatching-parallel-agents`.
*   Before any feature implementation, invoke `superpowers:brainstorming`.
*   Before touching code, invoke `superpowers:writing-plans` if scope spans >2 files.
*   Verify before claiming done: `superpowers:verification-before-completion`.

### Scope Guard
Optimizer, multiplayer (WebRTC/Yjs), mod support, and island templates are **Phase 2**. Agents must not implement stretch features during MVP milestones without explicit human approval.

---

## 8. Human Collaboration

1.  Decisions land in `docs/Anno_1800_Offline_Blueprint_Builder.md` before they harden into code.
2.  PRs: one human reviews before merge. Agent-generated PRs require human sign-off on UX and math correctness.
