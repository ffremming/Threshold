import BankPanel from './BankPanel'
import ExtraPanel from './ExtraPanel'
import CalendarPanel from './CalendarPanel'
import InsightsPanel from './InsightsPanel'

export function buildPanelMap(props) {
  const {
    visiblePanelIds,
    movePanel,
    bankWindows,
    onCreateTemplate,
    handleAddBankWindow,
    handleRemoveBankWindow,
    loadingTemplates,
    templates,
    handleTemplateDragStart,
    handleDragEnd,
    handleAddTemplateClick,
    onEditTemplate,
    onDeleteTemplate,
    visibleActivities,
    addVisibleActivity,
    removeVisibleActivity,
    workoutLayout,
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
    weekStats,
    dailyLoadChartData,
    loadingAnalysis,
    focusTrendWeek,
    trendChartData,
    workouts,
    loadMixChartData,
    distanceDistributionChartData,
  } = props

  return {
    bank: (
      <BankPanel
        visiblePanelIds={visiblePanelIds}
        movePanel={movePanel}
        onCreateTemplate={onCreateTemplate}
        handleAddBankWindow={handleAddBankWindow}
        loadingTemplates={loadingTemplates}
        templates={templates}
        handleTemplateDragStart={handleTemplateDragStart}
        handleDragEnd={handleDragEnd}
        handleAddTemplateClick={handleAddTemplateClick}
        onEditTemplate={onEditTemplate}
        onDeleteTemplate={onDeleteTemplate}
        visibleActivities={visibleActivities}
        addVisibleActivity={addVisibleActivity}
        removeVisibleActivity={removeVisibleActivity}
      />
    ),
    extra: (
      <ExtraPanel
        bankWindows={bankWindows}
        visiblePanelIds={visiblePanelIds}
        movePanel={movePanel}
        templates={templates}
        handleTemplateDragStart={handleTemplateDragStart}
        handleDragEnd={handleDragEnd}
        handleAddTemplateClick={handleAddTemplateClick}
        handleRemoveBankWindow={handleRemoveBankWindow}
        onEditTemplate={onEditTemplate}
        onDeleteTemplate={onDeleteTemplate}
        visibleActivities={visibleActivities}
        addVisibleActivity={addVisibleActivity}
        removeVisibleActivity={removeVisibleActivity}
      />
    ),
    calendar: (
      <CalendarPanel
        workoutLayout={workoutLayout}
        visiblePanelIds={visiblePanelIds}
        movePanel={movePanel}
        loadingWorkouts={loadingWorkouts}
        groupedWorkouts={groupedWorkouts}
        sortedWorkouts={sortedWorkouts}
        dragState={dragState}
        dropTarget={dropTarget}
        handleDropTargetChange={handleDropTargetChange}
        handleDrop={handleDrop}
        onSelectWorkout={onSelectWorkout}
        onMoveWorkout={onMoveWorkout}
        handleWorkoutDragStart={handleWorkoutDragStart}
        handleDragEnd={handleDragEnd}
      />
    ),
    insights: (
      <InsightsPanel
        visiblePanelIds={visiblePanelIds}
        movePanel={movePanel}
        weekStats={weekStats}
        dailyLoadChartData={dailyLoadChartData}
        loadingAnalysis={loadingAnalysis}
        focusTrendWeek={focusTrendWeek}
        trendChartData={trendChartData}
        workouts={workouts}
        loadMixChartData={loadMixChartData}
        distanceDistributionChartData={distanceDistributionChartData}
      />
    ),
  }
}

export function buildLayoutStyle(calendarPanelWidth) {
  return {
    '--builder-side-font': calendarPanelWidth < 900 ? '0.68rem' : calendarPanelWidth < 1120 ? '0.72rem' : '0.74rem',
    '--builder-side-title-font': calendarPanelWidth < 900 ? '0.78rem' : calendarPanelWidth < 1120 ? '0.82rem' : '0.84rem',
    '--builder-calendar-day-font': calendarPanelWidth < 900 ? '0.68rem' : calendarPanelWidth < 1120 ? '0.72rem' : '0.78rem',
    '--builder-calendar-meta-font': calendarPanelWidth < 900 ? '0.58rem' : calendarPanelWidth < 1120 ? '0.6rem' : '0.62rem',
    '--builder-calendar-card-title-font': calendarPanelWidth < 900 ? '0.66rem' : calendarPanelWidth < 1120 ? '0.7rem' : '0.72rem',
    '--builder-calendar-support-font': calendarPanelWidth < 900 ? '0.56rem' : calendarPanelWidth < 1120 ? '0.58rem' : '0.6rem',
  }
}
