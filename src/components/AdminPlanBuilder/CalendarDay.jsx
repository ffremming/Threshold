import BuilderWorkoutSlot from './BuilderWorkoutSlot'

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
  return (
    <section
      className={`pb-day${dropTarget?.weekday === day.value ? ' is-target' : ''}`}
      onDragOver={event => {
        if (!dragState) return
        event.preventDefault()
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = dragState.kind === 'template' ? 'copy' : 'move'
        }
        handleDropTargetChange(day.value)
      }}
      onDrop={async event => {
        event.preventDefault()
        await handleDrop(day.value)
      }}
    >
      <header className="pb-day-head">
        <div className="pb-day-titles">
          <h3 className="pb-day-title">{day.label}</h3>
          <div className="pb-day-meta">
            {day.workouts.length > 0 ? `${day.workouts.length} økt${day.workouts.length > 1 ? 'er' : ''}` : 'Ingen økter'}
          </div>
        </div>
      </header>

      <div className="pb-day-slots">
        {day.workouts.length === 0 ? (
          <div
            className={`pb-empty-slot${dropTarget?.weekday === day.value && !dropTarget?.beforeWorkoutId ? ' is-target' : ''}`}
            onDragOver={event => {
              if (!dragState) return
              event.preventDefault()
              event.stopPropagation()
              if (event.dataTransfer) {
                event.dataTransfer.dropEffect = dragState.kind === 'template' ? 'copy' : 'move'
              }
              handleDropTargetChange(day.value)
            }}
            onDrop={async event => {
              event.preventDefault()
              event.stopPropagation()
              await handleDrop(day.value)
            }}
          >
            Slipp økt her
          </div>
        ) : (
          day.workouts.map((workout, index) => (
            <BuilderWorkoutSlot
              key={workout.id}
              workout={workout}
              index={index}
              total={day.workouts.length}
              isDragging={dragState?.kind === 'workout' && dragState.workoutId === workout.id}
              isDropTarget={dropTarget?.weekday === day.value && dropTarget?.beforeWorkoutId === workout.id}
              onClick={() => onSelectWorkout(workout)}
              onMoveUp={() => onMoveWorkout(workout, -1)}
              onMoveDown={() => onMoveWorkout(workout, 1)}
              onDragStart={event => handleWorkoutDragStart(workout, event)}
              onDragEnd={handleDragEnd}
              onDragOver={event => {
                if (!dragState) return
                event.preventDefault()
                event.stopPropagation()
                if (event.dataTransfer) {
                  event.dataTransfer.dropEffect = dragState.kind === 'template' ? 'copy' : 'move'
                }
                handleDropTargetChange(day.value, workout.id)
              }}
              onDrop={async event => {
                event.preventDefault()
                event.stopPropagation()
                await handleDrop(day.value, workout.id)
              }}
            />
          ))
        )}
      </div>
    </section>
  )
}
