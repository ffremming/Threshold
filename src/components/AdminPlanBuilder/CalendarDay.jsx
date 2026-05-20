import BuilderWorkoutSlot from './BuilderWorkoutSlot'
import { makeDropZoneProps } from './dragProps'

export default function CalendarDay({
  day,
  dragState,
  dropTarget,
  handleDropTargetChange,
  handleDrop,
  onSelectWorkout,
  onMoveWorkout,
  handleWorkoutDragStart,
  handleDragEnd,
}) {
  const isDayTarget = dropTarget?.weekday === day.value
  const workoutCount = day.workouts.length

  return (
    <section
      className={`pb-day${isDayTarget ? ' is-target' : ''}`}
      {...makeDropZoneProps({ dragState, handleDropTargetChange, handleDrop, weekday: day.value })}
    >
      <header className="pb-day-head">
        <div className="pb-day-titles">
          <h3 className="pb-day-title">{day.label}</h3>
          <div className="pb-day-meta">
            {workoutCount > 0 ? `${workoutCount} økt${workoutCount > 1 ? 'er' : ''}` : 'Ingen økter'}
          </div>
        </div>
      </header>

      <div className="pb-day-slots">
        {workoutCount === 0 ? (
          <div
            className={`pb-empty-slot${isDayTarget && !dropTarget?.beforeWorkoutId ? ' is-target' : ''}`}
            {...makeDropZoneProps({ dragState, handleDropTargetChange, handleDrop, weekday: day.value, stopPropagation: true })}
          >
            {dragState ? 'Slipp økt her' : 'Ingen økter'}
          </div>
        ) : (
          day.workouts.map((workout, index) => (
            <BuilderWorkoutSlot
              key={workout.id}
              workout={workout}
              index={index}
              total={workoutCount}
              isDragging={dragState?.kind === 'workout' && dragState.workoutId === workout.id}
              isDropTarget={dropTarget?.weekday === day.value && dropTarget?.beforeWorkoutId === workout.id}
              onClick={() => onSelectWorkout(workout)}
              onMoveUp={() => onMoveWorkout(workout, -1)}
              onMoveDown={() => onMoveWorkout(workout, 1)}
              onDragStart={event => handleWorkoutDragStart(workout, event)}
              onDragEnd={handleDragEnd}
              {...makeDropZoneProps({
                dragState,
                handleDropTargetChange,
                handleDrop,
                weekday: day.value,
                beforeWorkoutId: workout.id,
                stopPropagation: true,
              })}
            />
          ))
        )}
      </div>
    </section>
  )
}
