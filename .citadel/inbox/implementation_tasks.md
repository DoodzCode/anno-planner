# Implementation Tasks: Code Quality & Performance Fixes

> [!IMPORTANT]
> **Consumable by:** Any coding agent (Claude Code, Clyde, Antigravity, etc.)  
> **Repository:** `anno-planner`  
> **Tech Stack:** React, TypeScript, Konva (`react-konva`), Zustand, Dexie  

This document provides explicit, copy-pasteable, and highly precise task definitions to fix the code smells and performance bottlenecks identified in the audit and code review.

---

## 🗂️ Task Backlog Overview

| Task ID | Component/File | Title | Priority |
| :--- | :--- | :--- | :--- |
| **TASK-01** | `Onboarding.tsx` | Fix Keyboard Event Listener Lifecycle | High (Correctness) |
| **TASK-02** | `Canvas.tsx` | Fix Infinite Stage Exposure Render Loop | High (Correctness) |
| **TASK-03** | `App.tsx` | Refactor Toast Stacking & Clear Memory Leak | High (Correctness) |
| **TASK-04** | `exportImport.ts` | Implement Strict JSON Shape Validation | High (Safety) |
| **TASK-05** | `Canvas.tsx`, `blueprintStore.ts` | Optimize Selection Lookup via Sets ($O(1)$) | Medium (Performance) |
| **TASK-06** | `Minimap.tsx` | Bind Minimap to Native Stage Pan/Zoom Events | Medium (Performance) |

---

## 🛠️ Detailed Task Specifications

### TASK-01: Fix Keyboard Event Listener Lifecycle in `Onboarding.tsx`
* **Affected File:** [Onboarding.tsx](file:///mnt/c/Users/Kaleb/dev/projects/anno-planner/src/components/Onboarding.tsx#L24-L28)
* **Problem:** The keydown `useEffect` hook does not have a dependency array, meaning the listener is removed and re-added to `window` on every render.
* **Proposed Code Modification:**
```diff
   useEffect(() => {
     const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleSkip() }
     window.addEventListener('keydown', handler)
     return () => window.removeEventListener('keydown', handler)
-  })
+  }, [])
```
* **Verification:** Open console, verify no mounting/unmounting side-effects occur inside other visual layers when keys are pressed in the onboarding modal.

---

### TASK-02: Fix Infinite Stage Exposure Render Loop in `Canvas.tsx`
* **Affected File:** [Canvas.tsx](file:///mnt/c/Users/Kaleb/dev/projects/anno-planner/src/components/Canvas.tsx#L84-L86)
* **Problem:** The `useEffect` exposing `stageRef.current` has no dependency array and triggers on every render. Because the `onStageReady` prop is passed as an inline arrow function from `App.tsx`, it forces constant execution.
* **Proposed Code Modification:**
```diff
   // Expose stage to parent for PNG export
   useEffect(() => {
     if (stageRef.current && onStageReady) onStageReady(stageRef.current)
-  })
+  }, [onStageReady])
```
* **Verification:** Place a console log in `onStageReady` inside `App.tsx`. Move the cursor across the grid. The console log should **not** fire repeatedly on cursor movement.

---

### TASK-03: Refactor Toast Stacking & Clear Memory Leak in `App.tsx`
* **Affected File:** [App.tsx](file:///mnt/c/Users/Kaleb/dev/projects/anno-planner/src/App.tsx#L46-L49)
* **Problem:** Consecutive `showToast` triggers overlap, causing new messages to be cut off by older timers. Also, unmounting can trigger detached state updates.
* **Proposed Code Modification:**
```typescript
  // At top of App component:
  const toastTimerRef = useRef<number | NodeJS.Timeout | null>(null)

  // Refactor showToast callback:
  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current as number)
    setToast(msg)
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 2200)
  }, [])

  // Add cleanup effect:
  useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current as number) }
  }, [])
```
* **Verification:** Trigger toast messages in quick succession (e.g., clicking Copy Share link repeatedly). Ensure that the toast message stays visible for exactly 2.2 seconds following the *last* click and does not flicker or disappear early.

---

### TASK-04: Implement Strict JSON Shape Validation in `exportImport.ts`
* **Affected File:** [exportImport.ts](file:///mnt/c/Users/Kaleb/dev/projects/anno-planner/src/lib/exportImport.ts#L41-L62)
* **Problem:** Direct casting of raw parsed JSON as `Blueprint` can result in state corruptions if missing or non-numeric coordinate values are written to Zustand/Dexie.
* **Proposed Code Modification:**
```typescript
// Replace lines 41-62 in exportImport.ts with:
  if (typeof data !== 'object' || data === null || !('placements' in data)) {
    throw new Error('File does not look like an Anno Planner blueprint.')
  }

  const raw = data as Partial<Blueprint>
  const rawPlacements = Array.isArray(raw.placements) ? raw.placements : []

  // Clean type guard validating the shape of each individual placement
  const isValidPlacement = (p: any): p is Placement =>
    p &&
    typeof p.id === 'string' &&
    typeof p.buildingId === 'string' &&
    typeof p.x === 'number' && isFinite(p.x) &&
    typeof p.y === 'number' && isFinite(p.y) &&
    [0, 90, 180, 270].includes(p.rotation ?? 0)

  const validPlacements = rawPlacements.filter(
    (p): p is Placement => isValidPlacement(p) && buildingMap.has(p.buildingId)
  )

  const skipped = rawPlacements.length - validPlacements.length
  if (skipped > 0) {
    console.warn(`importJSON: skipped ${skipped} invalid or unknown placement(s)`)
  }

  return {
    id: raw.id ?? crypto.randomUUID(),
    name: String(raw.name ?? 'Imported Blueprint'),
    gridSize: raw.gridSize ?? { w: 60, h: 40 },
    placements: validPlacements,
    metadata: raw.metadata ?? { version: '0.1.0', dlcs: [] },
    createdAt: raw.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  }
```
* **Verification:** Try to import a JSON with corrupt coordinates or non-numeric placements. Verify that they are safely stripped out during validation and the import continues cleanly or throws an error.

---

### TASK-05: Optimize Selection Lookup via Sets ($O(1)$)
* **Affected Files:** [Canvas.tsx](file:///mnt/c/Users/Kaleb/dev/projects/anno-planner/src/components/Canvas.tsx#L294-L300) and [blueprintStore.ts](file:///mnt/c/Users/Kaleb/dev/projects/anno-planner/src/state/blueprintStore.ts#L62-L81)
* **Problem:** Array `.includes()` lookup in placements loops results in quadratic overhead during renders and multi-object operations.
* **Proposed Code Modification:**

#### In `Canvas.tsx` (Render Phase):
```typescript
  // Before Layer return:
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  // In the placements.map loop on line 300:
  const isSelected = selectedSet.has(p.id)
```

#### In `blueprintStore.ts` (State Mutations):
```typescript
    deleteSelected: () => {
      const { selectedIds, placements } = get()
      if (selectedIds.length === 0) return
      set((state) => {
        pushHistory(state, placements)
        const selectedSet = new Set(selectedIds)
        state.placements = state.placements.filter((p) => !selectedSet.has(p.id))
        state.selectedIds = []
      })
    },

    rotateSelected: () => {
      const { selectedIds, placements } = get()
      if (selectedIds.length === 0) return
      set((state) => {
        pushHistory(state, placements)
        const selectedSet = new Set(selectedIds)
        state.placements.forEach((p) => {
          if (selectedSet.has(p.id)) p.rotation = nextRotation(p.rotation)
        })
      })
    },
```
* **Verification:** Build layout with over 200 placements, box-select a group, and verify drag latency. The FPS should remain smooth with no lagging or stutter.

---

### TASK-06: Bind Minimap to Native Stage Pan/Zoom Events
* **Affected File:** [Minimap.tsx](file:///mnt/c/Users/Kaleb/dev/projects/anno-planner/src/components/Minimap.tsx#L18-L69)
* **Problem:** The stage position and scale are updated imperatively via native Konva calls to prevent React renders. Consequently, the Minimap viewport rect is frozen during dragging or scaling.
* **Proposed Code Modification:**
```typescript
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const worldCols = stage ? stage.width()  / TILE_PX : MAP_W
      const worldRows = stage ? stage.height() / TILE_PX : MAP_H

      const scaleX = MAP_W / worldCols
      const scaleY = MAP_H / worldRows

      ctx.clearRect(0, 0, MAP_W, MAP_H)

      ctx.fillStyle = 'rgba(10,10,22,0.6)'
      ctx.fillRect(0, 0, MAP_W, MAP_H)

      // Grid lines every 10 tiles
      ctx.strokeStyle = 'rgba(200,169,110,0.12)'
      ctx.lineWidth = 0.5
      for (let c = 0; c <= worldCols; c += 10) {
        ctx.beginPath(); ctx.moveTo(c * scaleX, 0); ctx.lineTo(c * scaleX, MAP_H); ctx.stroke()
      }
      for (let r = 0; r <= worldRows; r += 10) {
        ctx.beginPath(); ctx.moveTo(0, r * scaleY); ctx.lineTo(MAP_W, r * scaleY); ctx.stroke()
      }

      // Placements
      for (const p of placements) {
        const building = BUILDING_MAP.get(p.buildingId)
        if (!building) continue
        const fp = effectiveFootprint(building.footprint, p.rotation)
        ctx.fillStyle = building.color + 'cc'
        ctx.fillRect(p.x * scaleX, p.y * scaleY, fp.w * scaleX, fp.h * scaleY)
      }

      // Viewport rectangle
      if (stage) {
        const stagePos   = stage.position()
        const stageScale = stage.scaleX()

        const vx = -stagePos.x / stageScale / TILE_PX
        const vy = -stagePos.y / stageScale / TILE_PX
        const vw = stage.width()  / stageScale / TILE_PX
        const vh = stage.height() / stageScale / TILE_PX

        ctx.strokeStyle = 'rgba(200,169,110,0.7)'
        ctx.lineWidth = 1.2
        ctx.strokeRect(vx * scaleX, vy * scaleY, vw * scaleX, vh * scaleY)
      }
    }

    // Initial draw
    draw()

    if (stage) {
      // Connect native event listeners to draw at 60fps on stage manipulation
      stage.on('dragmove xChange yChange scaleXChange scaleYChange', draw)
    }

    return () => {
      if (stage) {
        stage.off('dragmove xChange yChange scaleXChange scaleYChange', draw)
      }
    }
  }, [placements, stage])
```
* **Verification:** Drag the canvas around to pan, or zoom in and out with the mouse wheel. The yellow viewport rectangle in the minimap should slide and scale in perfect synchronization with your actions.
