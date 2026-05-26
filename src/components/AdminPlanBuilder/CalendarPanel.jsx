import BuilderPanelHeader from './BuilderPanelHeader'
import BuilderWorkoutSlot from './BuilderWorkoutSlot'
import WeekCalendarList from './WeekCalendarList'
import { makeDropZoneProps } from './dragProps'

function buildDayDropZone(dragState, handleDropTargetChange, handleDrop, weekday) {
  return makeDropZoneProps({ dragState, handleDropTargetChange, handleDrop, weekday })
}

function buildWorkoutDropZone(dragState, handleDropTargetChange, handleDrop, weekday, workoutId) {
  return makeDropZoneProps({
    dragState, handleDropTargetChange, handleDrop, weekday, beforeWorkoutId: workoutId, stopPropagation: true,
  })
}

// List view places everything against weekday 1 since order is purely
// schedule-driven; beforeWorkoutId still controls insertion position.
const LIST_WEEKDAY = 1

export default function CalendarPanel({
  workoutLayout,
  visiblePanelIds,
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
        title={isCalendar ? 'Calendar' : 'List'}
        copy={isCalendar
          ? 'Drop sessions on the desired day. Existing sessions can also be dragged between days.'
          : 'Sorted by day and time. Drag sessions to move them, or drop in front of a session to place it in the list.'}
        panelId="calendar"
        visiblePanelIds={visiblePanelIds}
      />

      {loadingWorkouts ? (
        <div className="pb-empty-state">Loading week…</div>
      ) : isCalendar ? (
        <WeekCalendarList
          days={groupedWorkouts}
          isWorkoutDragging={w => dragState?.kind === 'workout' && dragState.workoutId === w.id}
          isWorkoutDropTarget={(w, day) => dropTarget?.weekday === day && dropTarget?.beforeWorkoutId === w.id}
          isDayEndTarget={day => dropTarget?.weekday === day && !dropTarget?.beforeWorkoutId}
          getDayDropZoneProps={day => buildDayDropZone(dragState, handleDropTargetChange, handleDrop, day)}
          getWorkoutDropZoneProps={(w, day) => buildWorkoutDropZone(dragState, handleDropTargetChange, handleDrop, day, w.id)}
          onSelectWorkout={onSelectWorkout}
          onMoveWorkout={onMoveWorkout}
          onWorkoutDragStart={handleWorkoutDragStart}
          onWorkoutDragEnd={handleDragEnd}
        />
      ) : sortedWorkouts.length === 0 ? (
        <div
          className={`pb-empty-state pb-empty-slot${dragState && !dropTarget?.beforeWorkoutId ? ' is-target' : ''}`}
          {...makeDropZoneProps({ dragState, handleDropTargetChange, handleDrop, weekday: LIST_WEEKDAY, stopPropagation: true })}
        >
          {dragState ? 'Drop session here' : 'No sessions this week'}
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
