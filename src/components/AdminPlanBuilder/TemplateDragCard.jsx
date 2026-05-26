import { GripVertical, Plus } from 'lucide-react'
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
              title="Add to plan"
              aria-label={`Add ${session.title} to plan`}
            >
              <Plus className="pb-btn-icon" aria-hidden="true" strokeWidth={2.2} />
            </button>
          ) : null}
          {isCustomTemplate && onEdit ? (
            <button
              type="button"
              className="pb-card-action"
              onClick={event => { event.preventDefault(); event.stopPropagation(); onEdit(session) }}
              draggable={false}
              title="Edit template"
              aria-label={`Edit template ${session.title}`}
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
              title="Delete template"
              aria-label={`Delete template ${session.title}`}
            >
              <SystemIcon name="delete" className="system-icon" />
            </button>
          ) : null}
          <span className="pb-card-grip" title="Drag into calendar" aria-hidden="true">
            <GripVertical className="pb-btn-icon" strokeWidth={1.9} />
          </span>
        </div>
      </div>
      <div className="pb-card-meta">
        <span className="pb-card-title">{session.title}</span>
        {intensityLabel && <span className="pb-card-zone">{intensityLabel}</span>}
      </div>
    </div>
  )
}
