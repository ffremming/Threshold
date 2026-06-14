import { useState } from 'react'
import './styles/index.css'
import { getWeekKey } from '../../utils'
import { Tabs } from '../ui'
import { DEFAULT_PANEL_SIZES } from './constants'
import { useBuilderLayout } from './useBuilderLayout'
import { useDragHandlers } from './useDragHandlers'
import { useEdgeScroll } from './useEdgeScroll'
import { usePlanCallbacks } from './usePlanCallbacks'
import { buildLayoutStyle, buildPanelMap } from './buildPanelMap'
import BuilderHeader from './BuilderHeader'
import TrashZone from './TrashZone'

const VIEW_TABS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'plan', label: 'Quick build' },
]

export default function AdminPlanBuilder({
  currentWeek,
  currentYear,
  monday,
  sunday,
  isThisWeek,
  workouts,
  loadingWorkouts,
  templates,
  loadingTemplates,
  globalTemplates,
  loadingGlobalTemplates,
  athleteSessions,
  loadingAthleteSessions,
  hasAthlete,
  overviewWeeks,
  overviewWorkoutsByWeekKey,
  overviewWorkouts,
  loadingOverview,
  onWeekChange,
  onSelectWorkout,
  onDeleteWorkout,
  onMoveWorkoutByDrag,
  onMoveWorkoutAcross,
  onAddTemplateToDay,
  onAddTemplateToDayAcross,
  onAddSessionToDay,
  onAddSessionToDayAcross,
  onAddManySessions,
  onMoveMany,
  onDeleteMany,
  onCreateTemplate,
  plan,
  planActions,
  noteAuthor,
}) {
  const [view, setView] = useState('week')
  // True while the month view holds Copy/Cut sessions "in hand" awaiting a place.
  // While armed, the bank's template actions are suppressed so the user must
  // place or discard first.
  const [placementArmed, setPlacementArmed] = useState(false)

  const layout = useBuilderLayout()
  const drag = useDragHandlers({
    currentWeek,
    currentYear,
    workouts,
    overviewWorkouts,
    onAddTemplateToDay,
    onAddTemplateToDayAcross,
    onMoveWorkoutByDrag,
    onMoveWorkoutAcross,
    onMoveMany,
    onDeleteWorkout,
  })
  useEdgeScroll(drag.dragState)

  const callbacks = usePlanCallbacks({
    currentWeek,
    currentYear,
    onWeekChange,
    isThisWeek,
    onAddTemplateToDay,
    view,
  })

  const isDesktopBuilder = layout.viewportWidth >= 1280
  const calendarPanelWidth = layout.panelSizes.calendar || DEFAULT_PANEL_SIZES.calendar
  const builderLayoutStyle = buildLayoutStyle(calendarPanelWidth)
  const selectedWeekKey = getWeekKey(currentWeek, currentYear)

  function getPanelShellStyle(panelId) {
    if (!isDesktopBuilder) return undefined
    // Calendar is the splitter target — it absorbs whatever space bank/extra
    // leave behind. Bank and extra keep explicit pixel widths.
    if (panelId === 'calendar') return { flex: '1 1 0', minWidth: '480px' }
    const width = layout.panelSizes[panelId] || DEFAULT_PANEL_SIZES[panelId]
    return { flex: `0 1 ${width}px`, width: `${width}px`, minWidth: '280px' }
  }

  function jumpToWeek(week, year) {
    onWeekChange(week, year)
    setView('week')
  }

  const panelMap = buildPanelMap({
    view,
    visiblePanelIds: callbacks.visiblePanelIds,
    currentWeek,
    currentYear,
    // While placement is armed, suppress template create/add/drag so the user
    // can't start new work before placing or discarding the sessions in hand.
    onCreateTemplate: placementArmed ? undefined : onCreateTemplate,
    loadingTemplates,
    templates,
    globalTemplates,
    loadingGlobalTemplates,
    athleteSessions,
    loadingAthleteSessions,
    hasAthlete,
    handleTemplateDragStart: placementArmed ? () => {} : drag.handleTemplateDragStart,
    handleDragEnd: drag.handleDragEnd,
    handleAddTemplateClick: placementArmed ? () => {} : callbacks.handleAddTemplateClick,
    visibleActivities: layout.visibleActivities,
    addVisibleActivity: layout.addVisibleActivity,
    removeVisibleActivity: layout.removeVisibleActivity,
    loadingWorkouts,
    workouts,
    overviewWeeks,
    overviewWorkoutsByWeekKey,
    selectedWeekKey,
    loadingOverview,
    dragState: drag.dragState,
    dropTarget: drag.dropTarget,
    handleDropTargetChange: drag.handleDropTargetChange,
    handleDrop: drag.handleDrop,
    onSelectWorkout,
    onDeleteWorkout,
    onAddSessionToDay,
    onAddSessionToDayAcross,
    onAddTemplateToDay,
    onAddTemplateToDayAcross,
    onAddManySessions,
    onMoveMany,
    onDeleteMany,
    onPlacementChange: setPlacementArmed,
    onJumpToWeek: jumpToWeek,
    handleWorkoutDragStart: drag.handleWorkoutDragStart,
    handleDayDragStart: drag.handleDayDragStart,
    plan,
    planActions,
    noteAuthor,
  })

  return (
    <div className="pb-shell">
      <div className="pb-view-tabs">
        <Tabs value={view} onChange={setView} items={VIEW_TABS} ariaLabel="Plan builder view" />
      </div>

      <BuilderHeader
        currentWeek={currentWeek}
        currentYear={currentYear}
        monday={monday}
        sunday={sunday}
        isThisWeek={isThisWeek}
        prevWeek={callbacks.prevWeek}
        nextWeek={callbacks.nextWeek}
        onWeekChange={onWeekChange}
      />

      <div className={`pb-layout${isDesktopBuilder ? ' is-desktop' : ''}`} style={builderLayoutStyle}>
        {callbacks.visiblePanelIds.map(panelId => (
          <section
            key={panelId}
            className={`pb-panel-shell pb-panel-${panelId}`}
            style={getPanelShellStyle(panelId)}
          >
            {panelMap[panelId]}
            {isDesktopBuilder && panelId !== 'calendar' && (
              <button
                type="button"
                className="pb-resize-handle"
                aria-label={`Adjust width for panel: ${panelId}. Use left and right arrow keys.`}
                onPointerDown={event => layout.startResize(panelId, event)}
                onKeyDown={event => {
                  if (event.key === 'ArrowLeft') {
                    event.preventDefault()
                    layout.nudgeResize(panelId, -32)
                  } else if (event.key === 'ArrowRight') {
                    event.preventDefault()
                    layout.nudgeResize(panelId, 32)
                  }
                }}
              />
            )}
          </section>
        ))}
      </div>

      <TrashZone dragState={drag.dragState} handleTrashDrop={drag.handleTrashDrop} />
    </div>
  )
}
