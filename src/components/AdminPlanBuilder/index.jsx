import { useState } from 'react'
import './styles/index.css'
import { getWeekKey } from '../../utils'
import './chartOptions'
import { DEFAULT_PANEL_SIZES } from './constants'
import { useBuilderLayout } from './useBuilderLayout'
import { useDragHandlers } from './useDragHandlers'
import { useEdgeScroll } from './useEdgeScroll'
import { useWeekData } from './useWeekData'
import { usePlanCallbacks } from './usePlanCallbacks'
import { buildLayoutStyle, buildPanelMap } from './buildPanelMap'
import BuilderHeader from './BuilderHeader'
import TrashZone from './TrashZone'

export default function AdminPlanBuilder({
  currentWeek,
  currentYear,
  monday,
  sunday,
  isThisWeek,
  workoutLayout = 'calendar',
  selectedAthleteName,
  workouts,
  loadingWorkouts,
  templates,
  loadingTemplates,
  overviewWeeks,
  overviewWorkoutsByWeekKey,
  loadingOverview,
  analysisWeeks,
  analysisWorkoutsByWeekKey,
  loadingAnalysis,
  onWeekChange,
  onSelectWorkout,
  onDeleteWorkout,
  onToggleComplete,
  onMoveWorkout,
  onMoveWorkoutByDrag,
  onAddTemplateToDay,
  onEditTemplate,
  onCreateTemplate,
  onDeleteTemplate,
}) {
  const [showOverview, setShowOverview] = useState(false)

  const layout = useBuilderLayout()
  const drag = useDragHandlers({ workouts, onAddTemplateToDay, onMoveWorkoutByDrag, onDeleteWorkout })
  useEdgeScroll(drag.dragState)

  const callbacks = usePlanCallbacks({
    currentWeek,
    currentYear,
    onWeekChange,
    isThisWeek,
    onAddTemplateToDay,
    panelOrder: layout.panelOrder,
    setPanelOrder: layout.setPanelOrder,
  })

  const isDesktopBuilder = layout.viewportWidth >= 1280
  const calendarPanelWidth = layout.panelSizes.calendar || DEFAULT_PANEL_SIZES.calendar
  const builderLayoutStyle = buildLayoutStyle(calendarPanelWidth)
  const selectedWeekKey = getWeekKey(currentWeek, currentYear)

  const weekData = useWeekData({ workouts, analysisWeeks, analysisWorkoutsByWeekKey, currentWeek, currentYear })

  function getPanelShellStyle(panelId) {
    if (!isDesktopBuilder) return undefined
    return { width: `${layout.panelSizes[panelId] || DEFAULT_PANEL_SIZES[panelId]}px` }
  }

  const panelMap = buildPanelMap({
    visiblePanelIds: callbacks.visiblePanelIds,
    movePanel: callbacks.movePanel,
    bankWindows: callbacks.bankWindows,
    onCreateTemplate,
    handleAddBankWindow: callbacks.handleAddBankWindow,
    handleRemoveBankWindow: callbacks.handleRemoveBankWindow,
    loadingTemplates,
    templates,
    handleTemplateDragStart: drag.handleTemplateDragStart,
    handleDragEnd: drag.handleDragEnd,
    handleAddTemplateClick: callbacks.handleAddTemplateClick,
    onEditTemplate,
    onDeleteTemplate,
    visibleActivities: layout.visibleActivities,
    addVisibleActivity: layout.addVisibleActivity,
    removeVisibleActivity: layout.removeVisibleActivity,
    workoutLayout,
    loadingWorkouts,
    groupedWorkouts: weekData.groupedWorkouts,
    sortedWorkouts: weekData.sortedWorkouts,
    dragState: drag.dragState,
    dropTarget: drag.dropTarget,
    handleDropTargetChange: drag.handleDropTargetChange,
    handleDrop: drag.handleDrop,
    onSelectWorkout,
    onMoveWorkout,
    handleWorkoutDragStart: drag.handleWorkoutDragStart,
    weekStats: weekData.weekStats,
    dailyLoadChartData: weekData.dailyLoadChartData,
    loadingAnalysis,
    focusTrendWeek: weekData.focusTrendWeek,
    trendChartData: weekData.trendChartData,
    workouts,
    loadMixChartData: weekData.loadMixChartData,
    distanceDistributionChartData: weekData.distanceDistributionChartData,
  })

  return (
    <div className="pb-shell">
      {selectedAthleteName && (
        <div className="pb-athlete-banner">
          Planbygger for <strong>{selectedAthleteName}</strong>
        </div>
      )}

      <BuilderHeader
        currentWeek={currentWeek}
        currentYear={currentYear}
        monday={monday}
        sunday={sunday}
        isThisWeek={isThisWeek}
        prevWeek={callbacks.prevWeek}
        nextWeek={callbacks.nextWeek}
        onWeekChange={onWeekChange}
        showOverview={showOverview}
        setShowOverview={setShowOverview}
        loadingOverview={loadingOverview}
        overviewWeeks={overviewWeeks}
        overviewWorkoutsByWeekKey={overviewWorkoutsByWeekKey}
        selectedWeekKey={selectedWeekKey}
      />

      <div className={`pb-layout${isDesktopBuilder ? ' is-desktop' : ''}`} style={builderLayoutStyle}>
        {callbacks.visiblePanelIds.map(panelId => (
          <section
            key={panelId}
            className={`pb-panel-shell pb-panel-${panelId}`}
            style={getPanelShellStyle(panelId)}
          >
            {panelMap[panelId]}
            {isDesktopBuilder && (
              <button
                type="button"
                className="pb-resize-handle"
                aria-label={`Juster bredde for panel: ${panelId}. Bruk piltastene venstre og høyre.`}
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
