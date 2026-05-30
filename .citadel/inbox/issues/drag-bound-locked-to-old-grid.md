# Issue: Building drag locked to 60×40 grid after dynamic grid expansion

**Reported:** 2026-05-30  
**Status:** Open  
**Severity:** Medium — core canvas interaction broken for placements outside the original bounds

---

## Description

Buildings can be placed anywhere on the (now dynamic) grid, but dragging an existing building constrains it to the original 60×40 working area. Any building placed outside that boundary snaps back to the edge when the user tries to move it.

## Root cause

`dragBoundFunc` in `src/components/Canvas.tsx` (lines ~315–318) hard-codes the movement ceiling against `GRID_COLS` (60) and `GRID_ROWS` (40):

```ts
const maxX = tileToPx(GRID_COLS - fp.w)
const maxY = tileToPx(GRID_ROWS - fp.h)
const sx = Math.max(0, Math.min(maxX, snapToGrid(cx)))
const sy = Math.max(0, Math.min(maxY, snapToGrid(cy)))
```

The grid was expanded in M4 to fill the full canvas pane dynamically (`size.w / TILE_PX` cols, `size.h / TILE_PX` rows), but `dragBoundFunc` was never updated to match. Placement (`addPlacement`) has no equivalent clamp, which is why initial placement works anywhere while dragging does not.

## Fix

Replace the hardcoded `GRID_COLS`/`GRID_ROWS` ceiling in `dragBoundFunc` with values derived from the canvas `size`:

```ts
// In Canvas.tsx, inside the dragBoundFunc closure:
const maxX = tileToPx(Math.ceil(size.w / TILE_PX) - fp.w)
const maxY = tileToPx(Math.ceil(size.h / TILE_PX) - fp.h)
```

`size` is already in scope as component state (`const [size, setSize] = useState(...)`), so no new data flow is needed. The `dragBoundFunc` is recreated on every render, so `size` is always current.

## Affected file

`src/components/Canvas.tsx` — `dragBoundFunc` inside the building `<Group>` map (~line 308)

## Notes

- The minimum bound (`Math.max(0, ...)`) can stay — buildings should not drag to negative tile coordinates.
- `addPlacement` in `blueprintStore.ts` has no bounds check at all; the fix above keeps drag and placement consistent without adding a separate store-level clamp.
