import BuilderPanelHeader from './BuilderPanelHeader'
import BuilderWorkoutSlot from './BuilderWorkoutSlot'
import CalendarDay from './CalendarDay'
import { makeDropZoneProps } from './dragProps'

// List view places everything against weekday 1 since order is purely
// schedule-driven; beforeWorkoutId still controls insertion position.
const LIST_WEEKDAY = 1

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
  const isCalendar = workoutLayout === 'calendar'

  return (
    <main className="pb-panel pb-panel--calendar">
      <BuilderPanelHeader
        title={isCalendar ? 'Kalender' : 'Liste'}
        copy={isCalendar
          ? 'Slipp økter på ønsket dag. Eksisterende økter kan også dras mellom dager.'
          : 'Sortert etter dag og tidspunkt. Dra økter for å flytte, eller slipp foran en økt for å plassere den i listen.'}
        panelId="calendar"
        visiblePanelIds={visiblePanelIds}
        onMove={movePanel}
      />

      {loadingWorkouts ? (
        <div className="pb-empty-state">Laster uke…</div>
      ) : isCalendar ? (
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
        <div
          className={`pb-empty-state pb-empty-slot${dragState && !dropTarget?.beforeWorkoutId ? ' is-target' : ''}`}
          {...makeDropZoneProps({ dragState, handleDropTargetChange, handleDrop, weekday: LIST_WEEKDAY, stopPropagation: true })}
        >
          {dragState ? 'Slipp økt her' : 'Ingen økter denne uken'}
        </div>
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
              {...makeDropZoneProps({
                dragState,
                handleDropTargetChange,
                handleDrop,
                weekday: workout.weekday,
                beforeWorkoutId: workout.id,
                stopPropagation: true,
              })}
            />
          ))}
        </div>
      )}
    </main>
  )
}
