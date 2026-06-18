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

### Phase 1: Safety Net & Contract Definitions (Sequential Botttleneck)
**Scope:** Establish the tests and interfaces required before decomposing.
**Files Touched:** `__tests__/canvasBehavior.md` (manual test script), `src/types/store.ts`.
**Prerequisites:** None.
**Effort:** Low.
**Actions:**
1. Create a documented manual test script characterizing current canvas behavior (drag, box-select, paint, pan, snap-to-grid).
2. Define the new separate interfaces for `UIState` and `BlueprintState`.
**Verification:** Manual verification against the test script.

### Phase 2: State Uncoupling (Parallelizable Stream A)
**Owner:** Ian
**Scope:** Decouple domain state from UI state and local storage.
**Files Touched:** `src/state/blueprintStore.ts`, `src/state/uiStore.ts` (new), `src/state/preferencesStore.ts` (new), `src/components/Palette.tsx`.
**Dependencies:** Phase 1 complete.
**Actions:**
1. Extract `selectedIds`, `activeBuildingId`, and `clearSelection` into `uiStore.ts`.
2. Extract localStorage reads/writes from `Palette.tsx` into a Zustand `preferencesStore.ts`.
3. Update imports across `Inspector.tsx`, `App.tsx`, and `Canvas.tsx` to read from the new stores.
**Verification:** Application builds successfully; clicking items still selects them; palette memory persists across reloads.

### Phase 3: Canvas De-Godding - Extract Utilities (Parallelizable Stream B)
**Owner:** Kaleb
**Scope:** Remove non-rendering logic from `Canvas.tsx`.
**Files Touched:** `src/components/Canvas.tsx`, `src/hooks/useGlobalShortcuts.ts` (new), `src/hooks/useCanvasInteraction.ts` (new).
**Dependencies:** Phase 1 complete.
**Actions:**
1. Extract global keyboard event listeners (spacebar, arrows, undo/redo) into `useGlobalShortcuts.ts`.
2. Extract the interaction refs (`isManualPanning`, `isPainting`, `isDrawingBox`) into a structured state machine hook `useCanvasInteraction.ts`.
**Verification:** Keyboard shortcuts continue to operate; dragging/panning behavior remains identical.

### Phase 4: Canvas De-Godding - Extract Render Nodes (Parallelizable Stream B)
**Owner:** Kaleb
**Scope:** Decompose the Konva stage into reusable React components.
**Files Touched:** `src/components/Canvas.tsx`, `src/components/canvas/BuildingNode.tsx` (new), `src/components/canvas/GridLayer.tsx` (new).
**Dependencies:** Phase 3 complete.
**Actions:**
1. Extract the `Group` block containing `Rect` and `Text` (lines 491-576) into `BuildingNode.tsx`. Pass necessary props (`placement`, `isSelected`).
2. Extract the grid line generation logic into `GridLayer.tsx`.
3. Extract the influence circle map into `InfluenceOverlay.tsx`.
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
The true bottleneck is the `Canvas.tsx` file due to its size and coupling to the `blueprintStore`. 
To allow parallel execution by two teams (Ian and Kaleb):
- **Phase 1** must be executed sequentially to define the interface boundaries.
- **Ian** will take ownership of the State layer (**Phase 2**). He will split the Zustand stores. The interface contract for Kaleb is that `uiStore` will handle selections, and `blueprintStore` will handle placements.
- **Kaleb** will take ownership of the View layer (**Phases 3 & 4**). He will rip the interaction logic out of `Canvas.tsx` and componentize the Konva nodes. He will temporarily mock or directly update import paths as Ian's store changes merge.
- The seam between the teams is the boundary between the Store APIs and the Canvas Hook inputs.

## Definition of Done
The refactor is considered complete when:
- `Canvas.tsx` is under 150 lines and contains strictly top-level composition.
- Zustand stores are strictly segregated by domain vs UI concern.
- The behavior characterization script passes 100% manually.
- No new features were added, and no existing logic was removed.
