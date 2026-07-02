# Refactor Implementation Plan: AOBB

## Goals & Non-goals
**Goal:** Restructure the `anno-planner` codebase to improve maintainability, separation of concerns, and parallelization. Focus heavily on decomposing the Canvas god object, isolating state domains, and improving UI composability.
**Non-goal:** Do **not** add, remove, or modify any existing features, observable behavior, or logic. Treat the current application behavior as the absolute specification. Any functional changes must only be strictly for performance (e.g. reducing re-renders) without behavioral shifts.

## Target Architecture
### Current State
- `Canvas.tsx`: A 609-line god file handling interaction FSM, rendering, keyboard shortcuts, and domain collision math.
- `blueprintStore.ts`: A unified store mixing persistent domain state (`placements`) and transient UI state (`selectedIds`).
- `Palette.tsx`: Combines UI presentation with explicit `localStorage` queries.

### Proposed Target
1. **State Isolation:** 
   - `blueprintStore.ts` (Persistent: placements, past, future).
   - `uiStore.ts` (Transient: selectedIds, activeBuildingId).
   - `preferencesStore.ts` (Local user settings like collapsed categories and last selected variants).
2. **Canvas Decomposition:**
   - `CanvasView.tsx` (Pure Konva composition).
   - `components/canvas/GridLayer.tsx` (Grid lines).
   - `components/canvas/BuildingNode.tsx` (Individual building rendering).
   - `components/canvas/InfluenceOverlay.tsx` (Radius indicators).
3. **Interaction FSM:** 
   - Extract canvas state (panning, drawing box, painting) into a custom hook (`hooks/useCanvasInteraction.ts`) returning pure normalized events to the view layer.
4. **Shortcut Manager:**
   - Extract global keydown listeners into `hooks/useGlobalShortcuts.ts`.

---

## Phased Plan

### Phase 1: Safety Net & Contract Definitions (Sequential Gate — blocks all streams)
**Scope:** Establish the tests and interfaces required before decomposing.
**Files Touched:** `__tests__/canvasBehavior.md` (manual test script), `src/__tests__/canvasLogic.test.ts` (new unit tests), `src/types/store.ts`.
**Prerequisites:** None.
**Effort:** Medium (manual script is low; automated suite is the bulk).
**Actions:**
1. Create a documented manual test script characterizing current canvas behavior (drag, box-select, paint, pan, snap-to-grid).
2. Land an automated unit suite for the extractable pure logic — `wouldCollide`, `effectiveFootprint`, snap-to-grid, and the interaction FSM transition table. These break silently and test cleanly without Konva; they are the real regression net for the "no behavior change" goal.
3. Define the new separate interfaces for `UIState` and `BlueprintState`.
**Verification:** Unit suite green; manual verification against the test script.

### Phase 2: State Uncoupling (Sequential Gate for Canvas — owned end-to-end by Ian)
**Owner:** Ian
**Scope:** Decouple domain state from UI state and local storage.
**Files Touched:** `src/state/blueprintStore.ts`, `src/state/uiStore.ts` (new), `src/state/preferencesStore.ts` (new), `src/components/Palette.tsx`, `src/components/Inspector.tsx`, `src/App.tsx`, `src/components/Canvas.tsx`.
**Dependencies:** Phase 1 complete.
**Concurrency:** None of this is safely parallel. `Palette.tsx` carries both preferences and UI-state (see Risk R1), so preferences extraction and uiStore rewire are one combined edit, not two. The whole phase edits `Canvas.tsx` and **must complete before Phase 3 starts** — Canvas has a single writer at a time.
**Actions:**
1. Extract `selectedIds`, `activeBuildingId`, `clearSelection`, `setSelectedIds`, `toggleSelected` into `uiStore.ts`. Leave domain members (`placements`, `past`, `future`, `undo`, `redo`, `deleteSelected`, `rotateSelected`, `loadPlacements`, `blueprintName`) in `blueprintStore.ts` (autosave source via `persistence.ts`, which persists `placements` only). Follow the existing `overlayStore.ts` transient-store precedent.
2. Extract localStorage reads/writes from `Palette.tsx` into a Zustand `preferencesStore.ts` (keys `anno-planner-selected-variants`, `anno-planner-collapsed-categories`), **rewiring its `activeBuildingId` reads to `uiStore` in the same edit** — the variant-sync effect (`Palette.tsx:74-85`) depends on `activeBuildingId`.
3. Update all UI-state consumers — `Inspector.tsx`, `Canvas.tsx` (14+ sites, including imperative `useBlueprintStore.getState()` calls inside keyboard/drag handlers) — to read from the new stores. `App.tsx` only touches domain members; leave it on `blueprintStore`. **Hand `Canvas.tsx` to Kaleb on completion.**
**Verification:** Application builds successfully; clicking items still selects them; palette variant memory still syncs when the active building changes and persists across reloads; Phase 1 unit suite still green.

### Phase 3: Canvas De-Godding - Extract Utilities (Serial — single Canvas writer)
**Owner:** Kaleb
**Scope:** Remove non-rendering logic from `Canvas.tsx`.
**Files Touched:** `src/components/Canvas.tsx`, `src/hooks/useGlobalShortcuts.ts` (new), `src/hooks/useCanvasInteraction.ts` (new).
**Dependencies:** Phase 2 state split complete (hooks consume the new store API; extract against the final API once).
**Actions:**
1. Extract global keyboard event listeners (spacebar, arrows, undo/redo) into `useGlobalShortcuts.ts`.
2. Extract the interaction refs (`isManualPanning`, `isPainting`, `isDrawingBox`) into a structured state machine hook `useCanvasInteraction.ts`.
**Verification:** Keyboard shortcuts continue to operate; dragging/panning behavior remains identical.

### Phase 4: Canvas De-Godding - Extract Render Nodes (Serial — single Canvas writer)
**Owner:** Kaleb
**Scope:** Decompose the Konva stage into reusable React components.
**Files Touched:** `src/components/Canvas.tsx`, `src/components/canvas/BuildingNode.tsx` (new), `src/components/canvas/GridLayer.tsx` (new), `src/components/canvas/InfluenceOverlay.tsx` (new), `src/components/canvas/CanvasView.tsx` (new).
**Dependencies:** Phase 3 complete.
**Actions:**
1. Extract the `Group` block containing `Rect` and `Text` (lines 492-576) into `BuildingNode.tsx`. Pass necessary props (`placement`, `isSelected`).
2. Extract the grid line generation logic into `GridLayer.tsx`.
3. Extract the influence circle map into `InfluenceOverlay.tsx`.
4. Extract the top-level Konva stage/layer composition into `CanvasView.tsx`, leaving `Canvas.tsx` as the thin container.
**Verification:** Canvas renders exactly as before; performance metrics show no degradation (and likely improvement due to finer-grained memoization).

### Phase 5: Integration & Cleanup (Sequential Reconvergence)
**Scope:** Rebase streams, verify integration, remove dead code.
**Files Touched:** All modified files.
**Dependencies:** Phase 2 and Phase 4 complete.
**Actions:**
1. Reconverge branches.
2. Run `quality-check.sh` and `graph-update.sh` (as per `CONTRIBUTING.md`).
3. Clean up any unused exports or dead helper methods left behind by the extraction.
**Verification:** Complete end-to-end run of the manual canvas behavior script created in Phase 1.

---

## Sequencing & Parallelization Strategy

### The Constraint
`Canvas.tsx` is both the bottleneck *and* the convergence point. It consumes the `blueprintStore` at 14+ sites — including imperative `useBlueprintStore.getState().selectedIds` / `.clearSelection()` calls inside Konva event handlers — and it is also the file being decomposed. Therefore **any work that moves store members and any work that decomposes the file both edit `Canvas.tsx`**. They cannot run concurrently against the same file without guaranteed merge conflicts. The naive "Ian owns state, Kaleb owns view, run in parallel" split is unsafe because the seam runs straight through the largest file.

The real parallelism available is narrow: only work that touches *disjoint files* can overlap.

### Ordering Rules
1. **State migration must fully land before Canvas decomposition begins.** Kaleb's extracted hooks (`useCanvasInteraction`, `useGlobalShortcuts`) consume the exact store members Ian is moving. If decomposition starts first, Kaleb extracts against an API that is about to change, then re-edits. Sequence state-first to extract against the final API once.
2. **`Canvas.tsx` has a single writer at a time.** Phase 2's Canvas import-rewrite and Phases 3–4's Canvas decomposition are serialized, same owner handing off, never concurrent.

### Revised Streams

**Stream 0 — Phase 1 (sequential, blocks everything).** Define `UIState` / `BlueprintState` interfaces and the manual characterization script. Additionally land the automated safety net: pure-logic unit tests for the extractable helpers (`wouldCollide`, `effectiveFootprint`, snap-to-grid, FSM transition table). These are the parts most likely to break silently and they test cleanly without Konva.

**Stream A — Ian, Preferences (NOT independent — shares `Palette.tsx` with the state split).** Extract `localStorage` reads/writes from `Palette.tsx` into `preferencesStore.ts`. **Caveat:** `Palette.tsx` also consumes the UI-state members `activeBuildingId` / `setActiveBuildingId` / `clearSelection`, and its preferences effect *depends on* `activeBuildingId` (the selected-variant sync at `Palette.tsx:74-85` fires when the active building changes). So preferences and uiStore are intertwined inside this one file — Stream A and the uiStore split (Stream B) both edit `Palette.tsx`. Treat Palette as a **single combined edit owned by Ian** (preferences extraction + uiStore rewire together), not two parallel touches. The only files that read the UI-state members at all are `Canvas.tsx`, `Inspector.tsx`, `Palette.tsx` — all three are Ian's. Reconcile the new `uiStore.ts` with the existing `overlayStore.ts` transient-store precedent rather than inventing a new shape.

**Stream B — State split (Ian), gates Canvas work.** Move `selectedIds`, `activeBuildingId`, `clearSelection`, `setSelectedIds`, `toggleSelected` into `uiStore.ts`. Update **all four** consumers: `Canvas.tsx`, `Inspector.tsx`, `Palette.tsx` (combined with Stream A per above), and any imperative `useBlueprintStore.getState()` reads. Domain members that **stay** in `blueprintStore`: `placements`, `past`, `future`, `undo`, `redo`, `deleteSelected`, `rotateSelected`, `loadPlacements`, `blueprintName` (Inspector reads `past`/`future`/`undo`/`redo`; keep them domain-side). Persistence boundary: `persistence.ts` autosaves **only `placements`** (`past`/`future` are in-memory) — `blueprintStore` stays the autosave source; `uiStore` is never persisted. Stream ends with `Canvas.tsx` reading from the new stores but otherwise unchanged. **Hands `Canvas.tsx` to Kaleb on completion.**

**Stream C — Canvas decomposition (Kaleb), strictly after Stream B.** Phases 3 then 4, sequential, single writer on `Canvas.tsx`:
   - 3a `useGlobalShortcuts.ts`, 3b `useCanvasInteraction.ts` (interaction refs → hook). **Not a pure-event hook** — see Risk R2; it owns `stageRef` mutation plus the `scheduleMinimapRedraw` / `updateContextMenu` side-effect fan-out.
   - 4a `BuildingNode.tsx` (Group block ~492–576) — heavy prop surface, see Risk R4; 4b `GridLayer.tsx`, 4c `InfluenceOverlay.tsx`, 4d `CanvasView.tsx` (top-level Konva composition shell — boundary vs `Canvas.tsx` defined in Risk R8).

### What actually overlaps
**Almost nothing.** Because `Palette.tsx` carries both preferences and UI-state, Stream A collapses into Stream B (one combined Palette edit). The honest critical path is a near-pure serial chain: **Phase 1 → State split A+B (Ian) → Canvas decomposition C (Kaleb) → Integration.** The only genuinely parallel window is Kaleb prototyping `GridLayer.tsx` / `InfluenceOverlay.tsx` (low coupling, read `placements`/`overlayStore` only) against a branch while Ian finishes the state split — but those must rebase onto Ian's result before merge. Do not advertise A/B and C as concurrent.

### Reconvergence
Phase 5 is the join of Ian's state branch and Kaleb's decomposition branch. Because the state split already serialized the heavy `Canvas.tsx` edits and Palette is a single owned edit, the merge surface is small. Run the unit suite, the manual script, `quality-check.sh`, and `graph-update.sh`.

---

## Coupling Gaps & Risks (codebase audit)
Findings from reading `Canvas.tsx` (609 lines) and its consumers. Each must be handled explicitly during extraction or behavior will silently shift.

- **R1 — Palette straddles both domains.** Covered above: `Palette.tsx` reads `activeBuildingId`/`setActiveBuildingId`/`clearSelection` and its variant-sync effect depends on `activeBuildingId`. Preferences extraction and uiStore rewire happen together, owned by Ian. *Mitigation:* single combined Palette edit; verify variant memory still syncs when active building changes.

- **R2 — Interaction "FSM" is imperative, not pure.** Pan / zoom / arrow-keys mutate `stageRef.current` directly (`stage.position()`, `stage.scale()`), then call `scheduleMinimapRedraw()` + `updateContextMenu()` at 7+ sites. `useCanvasInteraction` cannot return "pure normalized events" — it must own the `stageRef` handle and the two side-effect fan-outs. *Mitigation:* design the hook signature around `stageRef`, `minimapRef`, and a `onTransformChanged` callback up front; do not model it as a reducer of pure events.

- **R3 — `contextMenu` + minimap redraw cross-cut everything.** `updateContextMenu` (reads stage + store, sets local `contextMenu` state) and `scheduleMinimapRedraw` (`rafPending` ref + `minimapRef`) are invoked from wheel, mousemove, keydown, dragmove, and minimap-nav. Neither appears in the original plan. *Mitigation:* decide their owner explicitly — keep both in `Canvas.tsx`/`CanvasView.tsx` and pass down, or co-locate in the interaction hook. The `BuildingContextMenu` element is a Stage *sibling*; it stays in the outer container, not in `CanvasView`.

- **R4 — `BuildingNode` prop surface is ~9, not 2.** Beyond `placement` / `isSelected`, the extracted node needs `stageRef`, `dragTileRef` (a `Map` shared between `dragBoundFunc` and `onDragEnd`), `movePlacement`, `setSelectedIds`, `toggleSelected`, `setActiveBuildingId`, `setGhostTile`, plus imperative `getState().placements` / `getState().selectedIds` reads inside drag handlers. *Mitigation:* decide whether `dragTileRef` moves into the node or stays hoisted (it is keyed by placement id, so a single hoisted `Map` passed as prop is simplest); enumerate the full prop list before extracting.

- **R5 — Click-suppression refs are order-dependent.** `handleStageClick` is gated by `didPaint` / `didPan` / `selBox`, all set during `mouseup`. The mouseup→click sequencing is fragile. *Mitigation:* the manual script **and** FSM unit tests must cover: drag-pan release does NOT deselect; paint-stroke release does NOT place a ghost; sub-4px box release DOES clear selection; meaningful box selects overlap set.

- **R6 — Two distinct pan mechanisms.** Stage-level Konva drag (`draggable={isPanning}`, space / middle-mouse, redraws via `onDragMove`) is separate from manual left-drag pan (`isManualPanning` ref, redraws inside `handleMouseMove`). Both must survive extraction with their distinct redraw triggers intact.

- **R7 — Test infra already exists; reuse it.** Vitest is configured; existing suites live in `src/__tests__/` (`dataIntegrity`, `migration`, `paneLayout`, `productionMath`) with `setup.ts`. New `canvasLogic.test.ts` slots there. `lib/collide.ts` and `lib/grid.ts` are already pure and isolated — the safety-net targets are testable today with no extraction needed.

- **R8 — `CanvasView` vs `Canvas` boundary must be defined.** Proposed split: `Canvas.tsx` = outer container (`<main class="canvas-pane">`, `<Minimap>`, `<BuildingContextMenu>`, the `konva-container` div + cursor, and `onStageReady` wiring); `CanvasView.tsx` = the `<Stage>` and its `<Layer>` children only. Without this line drawn, the refactor risks two ambiguous thin files and an unclear "under 150 lines" target.

- **R9 — `onStageReady` exposes `stageRef` to `App.tsx` for PNG export.** `App.tsx:137` passes `onStageReady={stage => stageRef.current = stage}` and `App` calls `exportPNG(stageRef.current, ...)`. Whichever component owns the `<Stage ref>` must still fire `onStageReady`. Constrains `stageRef` to live where the Stage is mounted (`CanvasView`) and be surfaced upward. Do not break this callback during the Stage extraction.

## Local-Model Delegation Strategy (Clyde + ollama)
This refactor is executed solely by Clyde (Claude Code) and Ian, with selective offload to local ollama models. The roster: `qwen2.5-coder:7b`, `qwen3.5:9b`, `gemma4:e4b`, `mistral:latest`, `qwen3:14b`.

### Governing Principle — the qwen lesson
Durable memory (Session 18, 2026-05-09, "Delegation Learnings"): `qwen3:14b` scaffold output was **structural reference only — NOT compilable**. It produced terminal escape codes, wrong API versions (tonic 0.7 vs 0.12), wrong trait signatures, and non-existent methods. The failure mode is output that **looks correct but is wrong**.

This refactor's prime directive is **zero behavior change**. That is the exact thing silent API drift violates. Therefore:

> **Delegation Rule:** Offload a task to a local model ONLY if its failure mode is *loud* — a compile error, a red test, or a visibly broken render. NEVER offload a task that can *silently* alter behavior. Treat every local-model output as a draft/reference, never authoritative; Clyde rewrites against codebase truth and passes a typecheck + test + visual-diff gate before anything merges.

### Model Roles
- **`qwen2.5-coder:7b`** — primary code drafter for pure, isolated TS/React boilerplate. Fast, purpose-built.
- **`qwen3.5:9b`** — behavior enumeration, test-case brainstorming.
- **`gemma4:e4b`** — prose (characterization script, docs).
- **`mistral:latest`** — commit messages, changelog, summaries.
- **`qwen3:14b`** — **demoted** (the struggler). Brainstorm/enumerate only; never codegen-to-merge.

### Offload Map
**Safe to offload (loud failure mode) — Clyde gates each:**

| Task | Phase | Model | Why safe | Gate |
|---|---|---|---|---|
| Manual characterization script (prose) | 1 | gemma4 | Prose, not code | Clyde edits for accuracy |
| Unit-test scaffolds for `lib/grid.ts` + `lib/collide.ts` (`describe`/`it` + fixtures) | 1 | qwen2.5-coder | Pure functions, red-if-wrong | **Clyde authors the expected values** — a wrong assertion passes silently; model writes structure only |
| `preferencesStore.ts` Zustand skeleton | 2 | qwen2.5-coder | Standard `create()` boilerplate, no behavior coupling | Clyde wires keys, verifies persistence |
| `GridLayer.tsx` extraction (pure gridLines loop) | 4 | qwen2.5-coder | Deterministic, zero store/coupling, visual-diffable | Clyde visual-compares render |
| Commit messages / ROADMAP changelog / PR body | 5 | mistral | Prose | Clyde reviews |

**Do NOT offload (silent behavior-drift risk) — Clyde/Ian only:**
- uiStore split + 14-site rewire (R1) — silent selection bugs.
- `useCanvasInteraction` imperative stage FSM (R2) — stage/minimap/contextMenu side effects.
- `BuildingNode.tsx` (R4) — `dragBoundFunc` collision math, 9-prop surface, shared `dragTileRef`.
- `handleStageClick` suppression logic (R5) — fragile mouseup→click ordering.
- `InfluenceOverlay.tsx` — radius math + `overlayStore` filtering is behavior.
- `CanvasView`/`Canvas` boundary (R8) and Phase 5 reconverge — judgment calls.

**Borderline — Clyde finishes:** `useGlobalShortcuts.ts` — the `isTypingTarget` helper and listener-attach boilerplate are draftable by qwen2.5-coder, but key-handling order and the `getState()` action dispatch are behavior; Clyde authors those.

### Operational Notes
- Route every offload through the `ollama-delegate` skill — it checks live VRAM via `ollama ps`, applies the decision tree, and enforces concurrency limits.
- VRAM: `gemma4:e4b` (9.6 GB) and `qwen3:14b` (9.3 GB) cannot comfortably co-reside; run offloads **sequentially**, which suits the solo Clyde+Ian flow anyway.
- No offloaded artifact merges without Clyde's typecheck + `vitest run` + (for render code) visual-diff gate. Loud failure is the whole point — let it fail loud, then Clyde fixes against codebase truth.

## Definition of Done
The refactor is considered complete when:
- `Canvas.tsx` is under 150 lines and contains strictly top-level composition; the `Canvas`/`CanvasView` boundary matches Risk R8.
- Zustand stores are strictly segregated by domain vs UI concern (`blueprintStore` = placements/history, `uiStore` = selection/active building, `preferencesStore` = localStorage settings).
- `onStageReady` → `App` PNG export still fires (Risk R9).
- The Phase 1 unit suite is green **and** the behavior characterization script passes 100% manually, explicitly including the R5 click-suppression cases (pan-release no-deselect, paint-release no-ghost, sub-4px box clears, meaningful box selects).
- No new features were added, and no existing logic was removed.
