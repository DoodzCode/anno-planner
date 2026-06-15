import { useRef } from 'react'

interface Props {
  side: 'left' | 'right'
  onDelta: (delta: number) => void
  onReset: () => void
}

export default function PaneGutter({ side, onDelta, onReset }: Props) {
  const lastX = useRef(0)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    lastX.current = e.clientX
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.buttons & 1) === 0) return
    const raw   = e.clientX - lastX.current
    const delta = side === 'right' ? -raw : raw
    lastX.current = e.clientX
    if (delta !== 0) onDelta(delta)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const step   = e.shiftKey ? 32 : 8
    // ArrowRight on left gutter → grow left; ArrowLeft on right gutter → grow right
    const grow   = side === 'left' ? 'ArrowRight' : 'ArrowLeft'
    onDelta(e.key === grow ? step : -step)
  }

  return (
    <div
      className={`pane-gutter pane-gutter-${side}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${side} panel`}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
    />
  )
}
