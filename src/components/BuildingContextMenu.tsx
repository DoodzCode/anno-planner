import { getBuilding } from '../data/catalog'

interface Props {
  buildingName: string
  fieldIds: string[]
  /** Screen x relative to .canvas-pane (center of farm building) */
  x: number
  /** Screen y relative to .canvas-pane (top edge of farm building) */
  y: number
  onSelectField: (fieldId: string) => void
}

export default function BuildingContextMenu({ buildingName, fieldIds, x, y, onSelectField }: Props) {
  return (
    <div className="building-context-menu" style={{ left: x, top: y }}>
      <div className="bcm-header">{buildingName}</div>
      {fieldIds.map(id => {
        const building = getBuilding(id)
        if (!building) return null
        return (
          <button
            key={id}
            className="bcm-item"
            onMouseDown={e => e.stopPropagation()}
            onClick={() => onSelectField(id)}
          >
            {building.name}
            <span className="bcm-hint">hold &amp; drag to paint</span>
          </button>
        )
      })}
    </div>
  )
}
