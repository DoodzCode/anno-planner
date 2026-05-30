import type { Footprint, Rotation } from '../types/domain'

export const TILE_PX = 24
export const GRID_COLS = 60
export const GRID_ROWS = 40

export function tileToPx(tile: number): number {
  return tile * TILE_PX
}

export function pxToTile(px: number): number {
  return Math.floor(px / TILE_PX)
}

/** Snap a pixel value to the nearest tile edge (for drag snapping). */
export function snapToGrid(px: number): number {
  return Math.round(px / TILE_PX) * TILE_PX
}

/** Effective footprint after rotation: 90° and 270° swap w and h. */
export function effectiveFootprint(fp: Footprint, rotation: Rotation): Footprint {
  return rotation === 90 || rotation === 270
    ? { w: fp.h, h: fp.w }
    : { w: fp.w, h: fp.h }
}

export function nextRotation(r: Rotation): Rotation {
  const cycle: Record<Rotation, Rotation> = { 0: 90, 90: 180, 180: 270, 270: 0 }
  return cycle[r]
}
