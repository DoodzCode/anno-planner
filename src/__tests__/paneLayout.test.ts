import { describe, it, expect } from 'vitest'
import { redistribute, clampToViewport, PANE_DEFAULTS } from '../lib/paneLayout'

const VP = 1200  // comfortable viewport for most tests

describe('redistribute — left gutter', () => {
  const base = { left: 220, right: 240 }

  it('increases left by positive delta', () => {
    expect(redistribute(base, 50, 'left', VP)).toEqual({ left: 270, right: 240 })
  })

  it('decreases left by negative delta', () => {
    expect(redistribute(base, -30, 'left', VP)).toEqual({ left: 190, right: 240 })
  })

  it('clamps to LEFT_MIN on over-reduction', () => {
    const r = redistribute(base, -200, 'left', VP)
    expect(r.left).toBe(180)
    expect(r.right).toBe(240)
  })

  it('clamps to leftMax (36vw) on over-expansion', () => {
    const r = redistribute(base, 9999, 'left', VP)
    expect(r.left).toBe(Math.floor(VP * 0.36))
  })

  it('stops gutter when center would drop below CENTER_MIN', () => {
    // vpWidth=800, left=220, right=240  →  asking for +300
    // without constraint: left=520, but leftMax=288; center=800-288-240=272 < 320
    // maxLeft = 800-240-320 = 240
    const r = redistribute({ left: 220, right: 240 }, 300, 'left', 800)
    expect(r.left).toBe(240)
    expect(800 - r.left - r.right).toBeGreaterThanOrEqual(320)
  })

  it('does not mutate the input object', () => {
    const input = { ...base }
    redistribute(input, 50, 'left', VP)
    expect(input).toEqual(base)
  })
})

describe('redistribute — right gutter', () => {
  const base = { left: 220, right: 240 }

  it('increases right by positive delta', () => {
    expect(redistribute(base, 50, 'right', VP)).toEqual({ left: 220, right: 290 })
  })

  it('decreases right by negative delta', () => {
    expect(redistribute(base, -30, 'right', VP)).toEqual({ left: 220, right: 210 })
  })

  it('clamps to RIGHT_MIN on over-reduction', () => {
    const r = redistribute(base, -200, 'right', VP)
    expect(r.right).toBe(200)
  })

  it('stops gutter when center would drop below CENTER_MIN', () => {
    const r = redistribute({ left: 220, right: 240 }, 300, 'right', 800)
    expect(r.right).toBe(260)  // 800-220-320=260
    expect(800 - r.left - r.right).toBeGreaterThanOrEqual(320)
  })
})

describe('clampToViewport', () => {
  it('returns widths unchanged when viewport is generous', () => {
    expect(clampToViewport(PANE_DEFAULTS, VP)).toEqual(PANE_DEFAULTS)
  })

  it('proportionally reduces both panes on a tight viewport', () => {
    // At vp=700: maxTotal=380, LEFT_MIN+RIGHT_MIN=380, so both land at minimums
    const r = clampToViewport(PANE_DEFAULTS, 700)
    expect(r.left).toBeGreaterThanOrEqual(180)
    expect(r.right).toBeGreaterThanOrEqual(200)
    expect(r.left + r.right).toBeLessThanOrEqual(700 - 320)
  })

  it('clamps left to 36vw when stored value is too wide', () => {
    const r = clampToViewport({ left: 800, right: 240 }, VP)
    expect(r.left).toBe(Math.floor(VP * 0.36))
  })

  it('clamps right to 36vw when stored value is too wide', () => {
    const r = clampToViewport({ left: 220, right: 800 }, VP)
    expect(r.right).toBe(Math.floor(VP * 0.36))
  })

  it('returns minimums when viewport is too small to satisfy all constraints', () => {
    const r = clampToViewport(PANE_DEFAULTS, 500)
    expect(r.left).toBe(180)
    expect(r.right).toBe(200)
  })

  it('center is always >= CENTER_MIN after clamping (when geometrically possible)', () => {
    for (const vp of [750, 800, 900, 1000, 1200, 1440, 1920]) {
      const r = clampToViewport(PANE_DEFAULTS, vp)
      const center = vp - r.left - r.right
      expect(center).toBeGreaterThanOrEqual(320)
    }
  })
})
