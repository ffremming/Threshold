import { useRef, useState } from 'react'
import BuilderPanelHeader from './BuilderPanelHeader'
import WeekOverview from '../AdminDashboard/WeekOverview'
import { makeDropZoneProps } from './dragProps'
import PlanAnnotations from './PlanAnnotations'
import PlanEditors from './editors/PlanEditors'
import WeekAnnotationMenu from './WeekAnnotationMenu'
import AddSessionMenu from './AddSessionMenu'
import { usePlanAnnotations } from './usePlanAnnotations'
import { useBandGesture } from './useBandGesture'
import { useWeekDayRange } from './useWeekDayRange'
import { getWeekDates } from '../../utils'
import { formatDate } from '../../utils/planGeometry'

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
  onAddTemplateToDay,
  templates,
  visibleActivities,
  addVisibleActivity,
  removeVisibleActivity,
  handleWorkoutDragStart,
  handleDayDragStart,
  handleDragEnd,
  plan,
  planActions,
  noteAuthor,
}) {
  const panelRef = useRef(null)
  const [menu, setMenu] = useState(null) // { x, y } annotation menu, or null
  const [addMenu, setAddMenu] = useState(null) // { weekday, at: {x,y} } or null
  const ann = usePlanAnnotations({ planActions, noteAuthor })
  // Band edge-resize (commits directly) and drag-to-draw (opens a prefilled
  // editor) for the week view. The day cells inside WeekOverview carry data-date,
  // so the panel itself is the hit-test surface for the cursor's day.
  const bandGesture = useBandGesture({
    gridRef: panelRef,
    onResizeBand: band => ann.saveBand(band),
    onDraw: (dayRange, at) => ann.addBandForRange(dayRange, at),
  })
  const range = useWeekDayRange(panelRef)
  const { monday } = getWeekDates(currentWeek, currentYear)
  const today = formatDate(new Date())

  // Right-click with a selected day-range opens the add-annotation menu at the
  // cursor. The range is orthogonal to sessions: a range swept over days that
  // contain sessions is still placeable, so we open the menu even when the
  // right-click lands on a session card — only the annotation leaves (pills /
  // post-its, which own their own clicks) and the open menu are excluded.
  function onContextMenu(event) {
    if (event.target.closest?.('.pb-band-pill, .pb-goal-marker, .pb-postit, .pb-month-context-menu')) return
    if (!range.dayRange) return
    event.preventDefault()
    ann.close()
    setMenu({ x: event.clientX, y: event.clientY })
  }

  const dnd = {
    onWorkoutDragStart: handleWorkoutDragStart,
    onWorkoutDragEnd: handleDragEnd,
    onRemoveWorkout: onDeleteWorkout,
    onAddSessionToDay: (weekday, event) =>
      setAddMenu({ weekday, at: { x: event.clientX, y: event.clientY } }),
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
    <main
      className="pb-panel pb-panel--calendar"
      ref={panelRef}
      onPointerDown={range.begin}
      onContextMenu={onContextMenu}
    >
      <BuilderPanelHeader
        panelId="calendar"
        visiblePanelIds={visiblePanelIds}
      />

      {loadingWorkouts ? (
        <div className="pb-empty-state">Loading week…</div>
      ) : (
        <>
          {plan && (
            <PlanAnnotations
              weekMonday={monday}
              bands={plan.bands}
              goals={plan.goals}
              notes={plan.notes}
              sessions={workouts}
              view="week"
              viewer={noteAuthor}
              selectedRange={range.dayRange}
              bandPreview={bandGesture.preview}
              today={today}
              onEditBand={ann.editBand}
              onResizeBandHandle={bandGesture.beginResize}
              onDrawBand={bandGesture.beginDraw}
              onEditGoal={ann.editGoal}
              onEditNote={ann.editNote}
              onMoveNote={ann.moveNote}
            />
          )}
          <WeekOverview workouts={workouts} onSelectWorkout={onSelectWorkout} dnd={dnd} weekMonday={monday} />
        </>
      )}

      {range.marquee && (
        <div className="pb-month-marquee" style={range.marquee} aria-hidden="true" />
      )}

      <WeekAnnotationMenu
        menu={menu}
        onClose={() => setMenu(null)}
        onAddBand={() => { ann.addBandForRange(range.dayRange, menu); setMenu(null); range.clear() }}
        onAddNote={() => { ann.addNoteForRange(range.dayRange, menu); setMenu(null); range.clear() }}
        onAddGoal={() => { ann.addGoalForRange(range.dayRange, menu); setMenu(null); range.clear() }}
      />

      {addMenu && (
        <AddSessionMenu
          at={addMenu.at}
          templates={templates}
          visibleActivities={visibleActivities}
          onAddActivity={addVisibleActivity}
          onRemoveActivity={removeVisibleActivity}
          onCreateNew={() => onAddSessionToDay(addMenu.weekday)}
          onPickTemplate={template => onAddTemplateToDay(template, addMenu.weekday)}
          onClose={() => setAddMenu(null)}
        />
      )}

      <PlanEditors ann={ann} />
    </main>
  )
}
