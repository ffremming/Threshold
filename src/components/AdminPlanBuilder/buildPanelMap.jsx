import BankPanel from './BankPanel'
import BuilderWeekPanel from './BuilderWeekPanel'
import MonthGridPanel from './MonthGridPanel'
import PlanGridPanel from './PlanGridPanel'

export function buildPanelMap(props) {
  const {
    view,
    visiblePanelIds,
    currentWeek,
    currentYear,
    onCreateTemplate,
    loadingTemplates,
    templates,
    handleTemplateDragStart,
    handleDragEnd,
    handleAddTemplateClick,
    visibleActivities,
    addVisibleActivity,
    removeVisibleActivity,
    loadingWorkouts,
    workouts,
    overviewWeeks,
    overviewWorkoutsByWeekKey,
    selectedWeekKey,
    loadingOverview,
    dragState,
    dropTarget,
    handleDropTargetChange,
    handleDrop,
    onSelectWorkout,
    onDeleteWorkout,
    onAddSessionToDay,
    onAddSessionToDayAcross,
    onAddTemplateToDay,
    onAddTemplateToDayAcross,
    onAddManySessions,
    onMoveMany,
    onDeleteMany,
    onPlacementChange,
    modalOpen,
    onJumpToWeek,
    handleWorkoutDragStart,
    handleDayDragStart,
    plan,
    planActions,
    noteAuthor,
  } = props

  return {
    bank: (
      <BankPanel
        visiblePanelIds={visiblePanelIds}
        onCreateTemplate={onCreateTemplate}
        loadingTemplates={loadingTemplates}
        templates={templates}
        handleTemplateDragStart={handleTemplateDragStart}
        handleDragEnd={handleDragEnd}
        handleAddTemplateClick={handleAddTemplateClick}
        visibleActivities={visibleActivities}
        addVisibleActivity={addVisibleActivity}
        removeVisibleActivity={removeVisibleActivity}
      />
    ),
    calendar: view === 'plan' ? (
      <PlanGridPanel
        visiblePanelIds={visiblePanelIds}
        currentWeek={currentWeek}
        currentYear={currentYear}
        overviewWeeks={overviewWeeks}
        overviewWorkoutsByWeekKey={overviewWorkoutsByWeekKey}
        selectedWeekKey={selectedWeekKey}
        loadingOverview={loadingOverview}
        dragState={dragState}
        dropTarget={dropTarget}
        handleDropTargetChange={handleDropTargetChange}
        handleDrop={handleDrop}
        onSelectWorkout={onSelectWorkout}
        onDeleteWorkout={onDeleteWorkout}
        onAddSessionToDay={onAddSessionToDayAcross}
        onAddTemplateToDayAcross={onAddTemplateToDayAcross}
        templates={templates}
        visibleActivities={visibleActivities}
        addVisibleActivity={addVisibleActivity}
        removeVisibleActivity={removeVisibleActivity}
        onAddManySessions={onAddManySessions}
        onMoveMany={onMoveMany}
        onDeleteMany={onDeleteMany}
        onPlacementChange={onPlacementChange}
        modalOpen={modalOpen}
        onJumpToWeek={onJumpToWeek}
        handleWorkoutDragStart={handleWorkoutDragStart}
        handleDragEnd={handleDragEnd}
        plan={plan}
        planActions={planActions}
        noteAuthor={noteAuthor}
        resolveMuscles={undefined}
      />
    ) : view === 'month' ? (
      <MonthGridPanel
        visiblePanelIds={visiblePanelIds}
        currentWeek={currentWeek}
        currentYear={currentYear}
        overviewWeeks={overviewWeeks}
        overviewWorkoutsByWeekKey={overviewWorkoutsByWeekKey}
        selectedWeekKey={selectedWeekKey}
        loadingOverview={loadingOverview}
        dragState={dragState}
        dropTarget={dropTarget}
        handleDropTargetChange={handleDropTargetChange}
        handleDrop={handleDrop}
        onSelectWorkout={onSelectWorkout}
        onDeleteWorkout={onDeleteWorkout}
        onAddSessionToDay={onAddSessionToDayAcross}
        onAddTemplateToDayAcross={onAddTemplateToDayAcross}
        templates={templates}
        visibleActivities={visibleActivities}
        addVisibleActivity={addVisibleActivity}
        removeVisibleActivity={removeVisibleActivity}
        onAddManySessions={onAddManySessions}
        onMoveMany={onMoveMany}
        onDeleteMany={onDeleteMany}
        onPlacementChange={onPlacementChange}
        modalOpen={modalOpen}
        onJumpToWeek={onJumpToWeek}
        handleWorkoutDragStart={handleWorkoutDragStart}
        handleDragEnd={handleDragEnd}
        plan={plan}
        planActions={planActions}
        noteAuthor={noteAuthor}
      />
    ) : (
      <BuilderWeekPanel
        visiblePanelIds={visiblePanelIds}
        currentWeek={currentWeek}
        currentYear={currentYear}
        loadingWorkouts={loadingWorkouts}
        workouts={workouts}
        dragState={dragState}
        dropTarget={dropTarget}
        handleDropTargetChange={handleDropTargetChange}
        handleDrop={handleDrop}
        onSelectWorkout={onSelectWorkout}
        onDeleteWorkout={onDeleteWorkout}
        onAddSessionToDay={onAddSessionToDay}
        onAddTemplateToDay={onAddTemplateToDay}
        templates={templates}
        visibleActivities={visibleActivities}
        addVisibleActivity={addVisibleActivity}
        removeVisibleActivity={removeVisibleActivity}
        handleWorkoutDragStart={handleWorkoutDragStart}
        handleDayDragStart={handleDayDragStart}
        handleDragEnd={handleDragEnd}
        plan={plan}
        planActions={planActions}
        noteAuthor={noteAuthor}
      />
    ),
  }
}

export function buildLayoutStyle(calendarPanelWidth) {
  return {
    '--builder-side-font': calendarPanelWidth < 900 ? '0.68rem' : calendarPanelWidth < 1120 ? '0.72rem' : '0.74rem',
    '--builder-side-title-font': calendarPanelWidth < 900 ? '0.78rem' : calendarPanelWidth < 1120 ? '0.82rem' : '0.84rem',
  }
}
