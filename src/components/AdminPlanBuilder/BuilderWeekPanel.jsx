import BuilderPanelHeader from './BuilderPanelHeader'
import WeekOverview from '../AdminDashboard/WeekOverview'
import { makeDropZoneProps } from './dragProps'

// Right pane of the plan builder. Renders the exact same WeekOverview used by
// the standalone Week plan tab (timetable + charts), with drag-and-drop wired
// onto the timetable via the builder's existing drag state machine.
export default function BuilderWeekPanel({
  visiblePanelIds,
  currentWeek,
  currentYear,
  loadingWorkouts,
  workouts,
  dragState,
  dropTarget,
  handleDropTargetChange,
  handleDrop,
  onSelectWorkout,
  onDeleteWorkout,
  onAddSessionToDay,
  handleWorkoutDragStart,
  handleDayDragStart,
  handleDragEnd,
}) {
  const dnd = {
    onWorkoutDragStart: handleWorkoutDragStart,
    onWorkoutDragEnd: handleDragEnd,
    onRemoveWorkout: onDeleteWorkout,
    onAddSessionToDay,
    onDayDragStart: (weekday, event) => handleDayDragStart(currentWeek, currentYear, weekday, event),
    getDayDropZoneProps: weekday =>
      makeDropZoneProps({ dragState, handleDropTargetChange, handleDrop, weekday }),
    getCellDropZoneProps: (workout, weekday) =>
      makeDropZoneProps({
        dragState, handleDropTargetChange, handleDrop,
        weekday, beforeWorkoutId: workout.id, stopPropagation: true,
      }),
    isWorkoutDragging: workout =>
      dragState?.kind === 'workout' && dragState.workoutId === workout.id,
    isCellDropTarget: (workout, weekday) =>
      dropTarget?.weekday === weekday && dropTarget?.beforeWorkoutId === workout.id,
    isDayDropTarget: weekday =>
      Boolean(dragState) && dropTarget?.weekday === weekday && !dropTarget?.beforeWorkoutId,
  }

  return (
    <main className="pb-panel pb-panel--calendar">
      <BuilderPanelHeader
        panelId="calendar"
        visiblePanelIds={visiblePanelIds}
      />

      {loadingWorkouts ? (
        <div className="pb-empty-state">Loading week…</div>
      ) : (
        <WeekOverview workouts={workouts} onSelectWorkout={onSelectWorkout} dnd={dnd} />
      )}
    </main>
  )
}
