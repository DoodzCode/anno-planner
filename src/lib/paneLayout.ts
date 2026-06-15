export interface PaneWidths { left: number; right: number }

export const PANE_DEFAULTS: PaneWidths = { left: 220, right: 240 }

const STORAGE_KEY = 'anno-pane-layout'
const LEFT_MIN   = 180
const RIGHT_MIN  = 200
const CENTER_MIN = 320

function leftMax(vp: number)  { return Math.floor(vp * 0.36) }
function rightMax(vp: number) { return Math.floor(vp * 0.36) }

/**
 * Adjust one pane by delta px; the center column absorbs the change.
 * Gutter stops when center would drop below CENTER_MIN.
 */
export function redistribute(
  widths: PaneWidths,
  delta: number,
  side: 'left' | 'right',
  vpWidth: number,
): PaneWidths {
  const lMax = leftMax(vpWidth)
  const rMax = rightMax(vpWidth)

  if (side === 'left') {
    const raw     = Math.max(LEFT_MIN, Math.min(widths.left + delta, lMax))
    const center  = vpWidth - raw - widths.right
    if (center < CENTER_MIN) {
      const capped = Math.max(LEFT_MIN, Math.min(vpWidth - widths.right - CENTER_MIN, lMax))
      return { ...widths, left: capped }
    }
    return { ...widths, left: raw }
  } else {
    const raw     = Math.max(RIGHT_MIN, Math.min(widths.right + delta, rMax))
    const center  = vpWidth - widths.left - raw
    if (center < CENTER_MIN) {
      const capped = Math.max(RIGHT_MIN, Math.min(vpWidth - widths.left - CENTER_MIN, rMax))
      return { ...widths, right: capped }
    }
    return { ...widths, right: raw }
  }
}

/**
 * Proportionally reduce left/right to fit viewport.
 * Called on mount and on window resize.
 */
export function clampToViewport(widths: PaneWidths, vpWidth: number): PaneWidths {
  const lMax     = leftMax(vpWidth)
  const rMax     = rightMax(vpWidth)
  const maxTotal = vpWidth - CENTER_MIN

  let left  = Math.max(LEFT_MIN,  Math.min(widths.left,  lMax))
  let right = Math.max(RIGHT_MIN, Math.min(widths.right, rMax))

  if (left + right <= maxTotal) return { left, right }

  const reducibleLeft  = left  - LEFT_MIN
  const reducibleRight = right - RIGHT_MIN
  const reducibleTotal = reducibleLeft + reducibleRight
  const excess         = left + right - maxTotal

  if (reducibleTotal <= 0 || excess > reducibleTotal) {
    return { left: LEFT_MIN, right: RIGHT_MIN }
  }

  const takeLeft  = Math.round(excess * reducibleLeft / reducibleTotal)
  const takeRight = excess - takeLeft

  return {
    left:  Math.max(LEFT_MIN,  left  - takeLeft),
    right: Math.max(RIGHT_MIN, right - takeRight),
  }
}

export function saveLayout(widths: PaneWidths): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(widths)) } catch { /* storage unavailable */ }
}

export function loadLayout(vpWidth: number): PaneWidths {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as unknown
      if (p && typeof p === 'object' && typeof (p as Record<string, unknown>).left === 'number' && typeof (p as Record<string, unknown>).right === 'number') {
        return clampToViewport(p as PaneWidths, vpWidth)
      }
    }
  } catch { /* corrupt storage — fall through */ }
  return clampToViewport(PANE_DEFAULTS, vpWidth)
}
