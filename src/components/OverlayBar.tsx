import { OVERLAY_DEFS, useOverlayStore } from '../state/overlayStore'
import { FAMILIES } from '../data/catalog'

const AVAILABLE_OVERLAYS = new Set(
  FAMILIES.flatMap(f => f.variants)
    .filter(v => v.overlayType)
    .map(v => v.overlayType as string)
)

export default function OverlayBar() {
  const active = useOverlayStore((s) => s.active)
  const toggle = useOverlayStore((s) => s.toggle)

  const defs = OVERLAY_DEFS.filter(d => AVAILABLE_OVERLAYS.has(d.id))

  return (
    <div className="overlay-bar">
      <span className="overlay-bar-label">Overlays</span>
      {defs.map((d) => {
        const on = active.has(d.id)
        return (
          <button
            key={d.id}
            className={`overlay-btn${on ? ' overlay-btn--on' : ''}`}
            style={on ? { borderColor: d.color, color: d.color, background: `${d.color}22` } : {}}
            onClick={() => toggle(d.id)}
            title={`Toggle ${d.label} radius`}
          >
            <span
              className="overlay-dot"
              style={{ background: on ? d.color : '#3a3a5a' }}
            />
            {d.label}
          </button>
        )
      })}
    </div>
  )
}
