import { GripVertical } from 'lucide-react'
import {
  ACTIVITY_TAG_MAP,
  TYPE_ICONS,
  formatWorkoutSchedule,
  formatWorkoutTime,
} from '../../utils'
import ActivityIcon from '../ActivityIcon'
import SystemIcon from '../SystemIcon'

export default function AdminWorkoutSlot({
  workout,
  index,
  total,
  onClick,
  onDelete,
  onReplace,
  onToggleComplete,
  onMoveUp,
  onMoveDown,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) {
  const icon = TYPE_ICONS[workout.type] || 'AN'
  const activityTag = workout.activityTag ? ACTIVITY_TAG_MAP[workout.activityTag] : null
  const scheduleLabel = formatWorkoutTime(workout) || formatWorkoutSchedule(workout, { includeWeekday: false })

  return (
    <div
      className={`pb-slot${workout.completed ? ' is-completed' : ''}${isDragging ? ' is-dragging' : ''}${isDropTarget ? ' is-target' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="pb-slot-top">
        <span className="pb-card-icon"><ActivityIcon name={icon} className="tag-icon-svg" /></span>
        <div className="pb-slot-actions">
          <span className="pb-card-grip" title="Drag to move" aria-hidden="true">
            <GripVertical size={16} strokeWidth={1.9} />
          </span>
          <button
            type="button"
            className="pb-slot-reorder"
            onClick={onMoveUp}
            disabled={index === 0}
            title="Move up"
            aria-label="Move session up"
          >
            <SystemIcon name="up" className="system-icon" />
          </button>
          <button
            type="button"
            className="pb-slot-reorder"
            onClick={onMoveDown}
            disabled={index === total - 1}
            title="Move down"
            aria-label="Move session down"
          >
            <SystemIcon name="down" className="system-icon" />
          </button>
        </div>
      </div>

      <button type="button" className="pb-slot-main" onClick={() => onClick(workout)}>
        {scheduleLabel && <span className="pb-slot-time">{scheduleLabel}</span>}
        <span className="pb-slot-title">{workout.title}</span>
        {workout.description && (
          <span className="pb-slot-desc">{workout.description}</span>
        )}
        {activityTag && <span className="pb-slot-zone">{activityTag.label}</span>}
      </button>

      <div className="pb-slot-footer">
        <button
          type="button"
          className="pb-slot-reorder"
          onClick={() => onReplace(workout)}
          title="Swap from session bank"
          aria-label="Swap session from session bank"
        >
          <SystemIcon name="replace" className="system-icon" />
        </button>
        <button
          type="button"
          className={`pb-slot-check${workout.completed ? ' is-checked' : ''}`}
          onClick={() => onToggleComplete(workout)}
          aria-pressed={workout.completed}
          aria-label={workout.completed ? 'Mark as not completed' : 'Mark as completed'}
        >
          {workout.completed ? <SystemIcon name="check" className="system-icon" /> : null}
        </button>
        <button
          type="button"
          className="pb-slot-reorder pb-slot-reorder--danger"
          onClick={() => onDelete(workout)}
          title="Delete"
          aria-label="Delete session"
        >
          <SystemIcon name="delete" className="system-icon" />
        </button>
      </div>
    </div>
  )
}
