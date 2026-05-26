import { GripVertical } from 'lucide-react'
import {
  ACTIVITY_TAG_MAP,
  TYPE_ICONS,
  formatIntensityZoneLabel,
  formatWorkoutSchedule,
  formatWorkoutTime,
  normalizeIntensityZones,
} from '../../utils'
import ActivityIcon from '../ActivityIcon'
import SystemIcon from '../SystemIcon'

// Flat list row used inside WeekCalendarList. No background/border by
// default so the week reads as a single continuous list — only a
// hairline between rows. Actions are optional so the same row works
// for both Week plan (delete/replace/complete) and Plan builder (none).
export default function WorkoutRow({
  workout,
  index,
  total,
  isDragging,
  isDropTarget,
  onClick,
  onMoveUp,
  onMoveDown,
  onReplace,
  onToggleComplete,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) {
  const icon = TYPE_ICONS[workout.type] || 'AN'
  const activityTag = workout.activityTag ? ACTIVITY_TAG_MAP[workout.activityTag] : null
  const intensityLabel = formatIntensityZoneLabel(normalizeIntensityZones(workout.type, workout.intensityZone))
  const scheduleLabel = formatWorkoutTime(workout) || formatWorkoutSchedule(workout, { includeWeekday: false })
  const tagLabel = activityTag?.label || intensityLabel

  return (
    <div
      className={`pb-week-row${workout.completed ? ' is-completed' : ''}${isDragging ? ' is-dragging' : ''}${isDropTarget ? ' is-target' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <span className="pb-week-row-grip" aria-hidden="true" title="Drag to move">
        <GripVertical size={14} strokeWidth={1.9} />
      </span>

      <span className="pb-week-row-icon">
        <ActivityIcon name={icon} className="tag-icon-svg" />
      </span>

      <button type="button" className="pb-week-row-main" onClick={() => onClick(workout)}>
        {scheduleLabel && <span className="pb-week-row-time">{scheduleLabel}</span>}
        <span className="pb-week-row-title">{workout.title}</span>
        {tagLabel && <span className="pb-week-row-tag">{tagLabel}</span>}
      </button>

      <div className="pb-week-row-actions">
        <button
          type="button"
          className="pb-week-row-btn"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label="Move up"
          title="Move up"
        >
          <SystemIcon name="up" className="system-icon" />
        </button>
        <button
          type="button"
          className="pb-week-row-btn"
          onClick={onMoveDown}
          disabled={index === total - 1}
          aria-label="Move down"
          title="Move down"
        >
          <SystemIcon name="down" className="system-icon" />
        </button>
        {onReplace && (
          <button
            type="button"
            className="pb-week-row-btn"
            onClick={() => onReplace(workout)}
            aria-label="Swap from session bank"
            title="Swap from session bank"
          >
            <SystemIcon name="replace" className="system-icon" />
          </button>
        )}
        {onToggleComplete && (
          <button
            type="button"
            className={`pb-week-row-check${workout.completed ? ' is-checked' : ''}`}
            onClick={() => onToggleComplete(workout)}
            aria-pressed={workout.completed}
            aria-label={workout.completed ? 'Mark as not completed' : 'Mark as completed'}
          >
            {workout.completed ? <SystemIcon name="check" className="system-icon" /> : null}
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="pb-week-row-btn pb-week-row-btn--danger"
            onClick={() => onDelete(workout)}
            aria-label="Delete"
            title="Delete"
          >
            <SystemIcon name="delete" className="system-icon" />
          </button>
        )}
      </div>
    </div>
  )
}
