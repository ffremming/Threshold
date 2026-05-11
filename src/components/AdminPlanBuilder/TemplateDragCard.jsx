import {
  TYPE_ICONS,
  formatIntensityZoneLabel,
  normalizeIntensityZones,
} from '../../utils'
import ActivityIcon from '../ActivityIcon'
import SystemIcon from '../SystemIcon'

export default function TemplateDragCard({ session, onDragStart, onDragEnd, onAdd, onEdit, onDelete }) {
  const icon = TYPE_ICONS[session.type] || 'AN'
  const intensityLabel = formatIntensityZoneLabel(normalizeIntensityZones(session.type, session.intensityZone))
  const isCustomTemplate = session.source === 'custom'

  return (
    <div
      className="pb-card"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="pb-card-top">
        <span className="pb-card-icon"><ActivityIcon name={icon} className="tag-icon-svg" /></span>
        <div className="pb-card-actions">
          {onAdd ? (
            <button
              type="button"
              className="pb-card-action pb-card-action--add"
              onClick={event => { event.preventDefault(); event.stopPropagation(); onAdd(session) }}
              draggable={false}
              title="Legg til i plan"
              aria-label={`Legg ${session.title} til i plan`}
            >+</button>
          ) : null}
          {isCustomTemplate && onEdit ? (
            <button
              type="button"
              className="pb-card-action"
              onClick={event => { event.preventDefault(); event.stopPropagation(); onEdit(session) }}
              draggable={false}
              title="Rediger mal"
              aria-label={`Rediger malen ${session.title}`}
            >
              <SystemIcon name="edit" className="system-icon" />
            </button>
          ) : null}
          {isCustomTemplate && onDelete ? (
            <button
              type="button"
              className="pb-card-action pb-card-action--danger"
              onClick={event => { event.preventDefault(); event.stopPropagation(); onDelete(session) }}
              draggable={false}
              title="Slett mal"
              aria-label={`Slett malen ${session.title}`}
            >
              <SystemIcon name="delete" className="system-icon" />
            </button>
          ) : null}
          <span className="pb-card-grip" title="Dra inn i kalender" aria-hidden="true">⋮⋮</span>
        </div>
      </div>
      <div className="pb-card-meta">
        <span className="pb-card-title">{session.title}</span>
        {intensityLabel && <span className="pb-card-zone">{intensityLabel}</span>}
      </div>
    </div>
  )
}
