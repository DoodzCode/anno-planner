import { useState, useEffect, useCallback } from 'react'
import {
  type PaneWidths,
  PANE_DEFAULTS,
  redistribute,
  clampToViewport,
  saveLayout,
  loadLayout,
} from '../lib/paneLayout'

export function usePaneLayout() {
  const [widths, setWidths] = useState<PaneWidths>(() => loadLayout(window.innerWidth))

  // Proportionally clamp on viewport resize
  useEffect(() => {
    const onResize = () =>
      setWidths(w => {
        const next = clampToViewport(w, window.innerWidth)
        if (next.left !== w.left || next.right !== w.right) saveLayout(next)
        return next
      })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const adjustWidth = useCallback((side: 'left' | 'right', delta: number) => {
    setWidths(w => {
      const next = redistribute(w, delta, side, window.innerWidth)
      saveLayout(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    const next = clampToViewport(PANE_DEFAULTS, window.innerWidth)
    setWidths(next)
    saveLayout(next)
  }, [])

  return { widths, adjustWidth, reset }
}
