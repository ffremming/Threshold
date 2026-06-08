import { GripVertical, Plus } from 'lucide-react'
import {
  ACTIVITY_TAG_MAP,
  TYPE_ICONS,
  formatIntensityZoneLabel,
  normalizeIntensityZones,
  workoutHasZones,
} from '../../utils'
import ActivityIcon from '../ActivityIcon'

export default function TemplateDragCard({ session, onDragStart, onDragEnd, onAdd }) {
  // Prefer the sport's own icon (running figure, XC skier, …); fall back to the
  // generic interval/easy type icon only when no activity tag is set.
  const activityTag = session.activityTag ? ACTIVITY_TAG_MAP[session.activityTag] : null
  const icon = activityTag?.icon || TYPE_ICONS[session.type] || 'AN'
  const intensityLabel = workoutHasZones(session.activityTag)
    ? formatIntensityZoneLabel(normalizeIntensityZones(session.type, session.intensityZone))
    : null

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
          <span className="pb-card-grip" title="Drag into the week" aria-hidden="true">
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
