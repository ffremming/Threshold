import WorkoutRow from './WorkoutRow'

// One flat week list shared by Ukeplan (PlanTab) and Planverktøy
// (AdminPlanBuilder). Day labels are inline divider rows inside a
// single list with an invisible drop-line at each day's end. Rows
// have no card chrome — only a hairline separator — so the whole
// week reads as one continuous list, not a stack of bubbles.
export default function WeekCalendarList({
  days,
  isWorkoutDragging,
  isWorkoutDropTarget,
  isDayEndTarget,
  getDayDropZoneProps,
  getWorkoutDropZoneProps,
  onSelectWorkout,
  onMoveWorkout,
  onWorkoutDragStart,
  onWorkoutDragEnd,
  onReplaceWorkout,
  onToggleCompleteWorkout,
  onDeleteWorkout,
}) {
  return (
    <div className="pb-week-list">
      {days.flatMap(day => {
        const dropProps = getDayDropZoneProps(day.value)
        const countLabel = day.workouts.length > 0
          ? `${day.workouts.length} økt${day.workouts.length > 1 ? 'er' : ''}`
          : 'Ingen økter'
        return [
          <div key={`head-${day.value}`} className="pb-week-day-head" {...dropProps}>
            <span className="pb-week-day-label">{day.label}</span>
            <span className="pb-week-day-meta">{countLabel}</span>
          </div>,
          ...day.workouts.map((workout, idx) => (
            <WorkoutRow
              key={workout.id}
              workout={workout}
              index={idx}
              total={day.workouts.length}
              isDragging={isWorkoutDragging(workout)}
              isDropTarget={isWorkoutDropTarget(workout, day.value)}
              onClick={onSelectWorkout}
              onMoveUp={() => onMoveWorkout(workout, -1)}
              onMoveDown={() => onMoveWorkout(workout, 1)}
              onReplace={onReplaceWorkout}
              onToggleComplete={onToggleCompleteWorkout}
              onDelete={onDeleteWorkout}
              onDragStart={event => onWorkoutDragStart(workout, event)}
              onDragEnd={onWorkoutDragEnd}
              {...getWorkoutDropZoneProps(workout, day.value)}
            />
          )),
          <div
            key={`end-${day.value}`}
            className={`pb-week-day-end${isDayEndTarget(day.value) ? ' is-target' : ''}`}
            aria-hidden="true"
            {...dropProps}
          />,
        ]
      })}
    </div>
  )
}
