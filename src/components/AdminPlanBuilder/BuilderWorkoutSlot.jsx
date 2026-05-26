import { GripVertical } from 'lucide-react'
import {
  TYPE_ICONS,
  formatIntensityZoneLabel,
  formatWorkoutSchedule,
  formatWorkoutTime,
  normalizeIntensityZones,
} from '../../utils'
import ActivityIcon from '../ActivityIcon'
import SystemIcon from '../SystemIcon'

export default function BuilderWorkoutSlot({
  workout,
  index,
  total,
  isDragging,
  isDropTarget,
  onClick,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) {
  const icon = TYPE_ICONS[workout.type] || 'AN'
  const scheduleLabel = formatWorkoutTime(workout) || formatWorkoutSchedule(workout, { includeWeekday: false })
  const intensityLabel = formatIntensityZoneLabel(normalizeIntensityZones(workout.type, workout.intensityZone))

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
          <span className="pb-slot-grip" title="Drag to move" aria-hidden="true">
            <GripVertical className="pb-btn-icon" strokeWidth={1.9} />
          </span>
          <button type="button" className="pb-slot-reorder" onClick={onMoveUp} disabled={index === 0} title="Move up" aria-label="Move up"><SystemIcon name="up" className="system-icon" /></button>
          <button type="button" className="pb-slot-reorder" onClick={onMoveDown} disabled={index === total - 1} title="Move down" aria-label="Move down"><SystemIcon name="down" className="system-icon" /></button>
        </div>
      </div>

      <button type="button" className="pb-slot-main" onClick={onClick}>
        {scheduleLabel && <span className="pb-slot-time">{scheduleLabel}</span>}
        <span className="pb-slot-title">{workout.title}</span>
        {intensityLabel && <span className="pb-slot-zone">{intensityLabel}</span>}
      </button>
    </div>
  )
}
