import { cx } from './index'
import { ZoneDot, ZoneBadge } from './Zone'
import { ActivityPill } from './ActivityPill'
import {
  ACTIVITY_TAG_MAP,
  formatWorkoutTime,
  formatWorkoutSchedule,
  getIntensityZoneLabel,
  normalizeIntensityZone,
} from '../../utils'
import './workout-card.css'

/* ── WorkoutCard
 * One row in either calendar or list views. Click handler optional.
 * Variants:
 *   - compact (default): for week list, planner slots
 *   - detailed: shows description
 * ───────────────────────────────────────────────────────────────── */
export function WorkoutCard({
  workout,
  onClick,
  onToggleComplete,
  showSchedule = true,
  showDescription = true,
  trailing,
  className,
  draggable = false,
  onDragStart,
  onDragEnd,
}) {
  const tag = workout.activityTag ? ACTIVITY_TAG_MAP[workout.activityTag] : null
  const zone = normalizeIntensityZone(workout.type, workout.intensityZone)
  const zoneLabel = getIntensityZoneLabel(workout)
  const scheduleLabel = formatWorkoutTime(workout) || formatWorkoutSchedule(workout, { includeWeekday: false })

  const interactive = Boolean(onClick)

  return (
    <article
      className={cx('tp-workout-card', workout.completed && 'is-completed', interactive && 'is-interactive', className)}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } }) : undefined}
    >
      <div className="tp-workout-card-side">
        <ZoneDot zone={zone} />
      </div>

      <div className="tp-workout-card-body">
        <div className="tp-workout-card-head">
          <div className="tp-workout-card-titles">
            {showSchedule && scheduleLabel && (
              <span className="tp-workout-card-time">{scheduleLabel}</span>
            )}
            <h4 className="tp-workout-card-title">{workout.title}</h4>
          </div>
          <div className="tp-workout-card-meta">
            {tag && <ActivityPill tag={tag} />}
            {zone && zoneLabel && <ZoneBadge zone={zone} label={zoneLabel} />}
          </div>
        </div>

        {showDescription && workout.description && (
          <p className="tp-workout-card-desc">{workout.description}</p>
        )}
      </div>

      {(onToggleComplete || trailing) && (
        <div className="tp-workout-card-trailing">
          {trailing}
          {onToggleComplete && (
            <button
              type="button"
              className={cx('tp-workout-check', workout.completed && 'is-checked')}
              onClick={e => { e.stopPropagation(); onToggleComplete() }}
              aria-label={workout.completed ? 'Marker som ikke fullført' : 'Marker som fullført'}
            >
              {workout.completed ? '✓' : ''}
            </button>
          )}
        </div>
      )}
    </article>
  )
}
