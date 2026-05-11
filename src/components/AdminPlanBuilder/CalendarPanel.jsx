import BuilderPanelHeader from './BuilderPanelHeader'
import BuilderWorkoutSlot from './BuilderWorkoutSlot'
import CalendarDay from './CalendarDay'

export default function CalendarPanel({
  workoutLayout,
  visiblePanelIds,
  movePanel,
  loadingWorkouts,
  groupedWorkouts,
  sortedWorkouts,
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
    <main className="pb-panel pb-panel--calendar">
      <BuilderPanelHeader
        title={workoutLayout === 'calendar' ? 'Kalender' : 'Liste'}
        copy={workoutLayout === 'calendar'
          ? 'Slipp økter på ønsket dag. Eksisterende økter kan også dras mellom dager.'
          : 'Sortert etter dag og tidspunkt. Dra økter for å flytte eller slipp foran en økt for å plassere den i listen.'}
        panelId="calendar"
        visiblePanelIds={visiblePanelIds}
        onMove={movePanel}
      />

      {loadingWorkouts ? (
        <div className="pb-empty-state">Laster uke…</div>
      ) : workoutLayout === 'calendar' ? (
        <div className="pb-calendar-days">
          {groupedWorkouts.map(day => (
            <CalendarDay
              key={day.value}
              day={day}
              dragState={dragState}
              dropTarget={dropTarget}
              handleDropTargetChange={handleDropTargetChange}
              handleDrop={handleDrop}
              onSelectWorkout={onSelectWorkout}
              onMoveWorkout={onMoveWorkout}
              handleWorkoutDragStart={handleWorkoutDragStart}
              handleDragEnd={handleDragEnd}
            />
          ))}
        </div>
      ) : sortedWorkouts.length === 0 ? (
        <div className="pb-empty-state">Ingen økter denne uken</div>
      ) : (
        <div className="pb-workout-list">
          {sortedWorkouts.map((workout, index) => (
            <BuilderWorkoutSlot
              key={workout.id}
              workout={workout}
              index={index}
              total={sortedWorkouts.length}
              isDragging={dragState?.kind === 'workout' && dragState.workoutId === workout.id}
              isDropTarget={dropTarget?.weekday === workout.weekday && dropTarget?.beforeWorkoutId === workout.id}
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
                handleDropTargetChange(workout.weekday, workout.id)
              }}
              onDrop={async event => {
                event.preventDefault()
                event.stopPropagation()
                await handleDrop(workout.weekday, workout.id)
              }}
            />
          ))}
        </div>
      )}
    </main>
  )
}
