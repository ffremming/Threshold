import AnalysisDashboard from '../AnalysisDashboard'
import TestingDashboard from '../TestingDashboard'
import AdminPlanBuilder from '../AdminPlanBuilder'
import { Page, EmptyState } from '../ui'
import PlanTab from './tabs/PlanTab'
import BibliotekTab from './tabs/BibliotekTab'
import { EMPTY_TEMPLATE } from './constants'

export default function TabContent(p) {
  const { tab, selectedAthleteId } = p

  if (!selectedAthleteId && (tab === 'plan' || tab === 'builder')) {
    return (
      <Page>
        <EmptyState
          title="No athlete selected"
          description={tab === 'plan' ? 'Select an athlete to manage the training plan.' : 'Select an athlete to use the plan builder.'}
        />
      </Page>
    )
  }

  if (tab === 'plan' && selectedAthleteId) {
    return <PlanTab {...p} />
  }

  if (tab === 'analysis') {
    if (!selectedAthleteId) {
      return <Page><EmptyState title="No athlete selected" description="Select an athlete to view analysis." /></Page>
    }
    if (p.loadingAnalysis) {
      return <Page><EmptyState title="Loading analysis…" /></Page>
    }
    return (
      <AnalysisDashboard
        weeks={p.analysisWeeks}
        workoutsByWeekKey={p.analysisWorkoutsByWeekKey}
        currentWeek={p.currentWeek}
        currentYear={p.currentYear}
      />
    )
  }

  if (tab === 'tests') {
    if (!selectedAthleteId) {
      return <Page><EmptyState title="No athlete selected" description="Select an athlete to manage tests." /></Page>
    }
    return (
      <TestingDashboard
        selectedAthleteId={selectedAthleteId}
        userProfile={p.userProfile}
      />
    )
  }

  if (tab === 'builder' && selectedAthleteId) {
    // Per-day "+": open the custom-session form preset to that weekday (week
    // view) or week+weekday (month view), reusing the toolbar's creation flow.
    const onAddSessionToDay = weekday => {
      p.setCustomForm({ ...EMPTY_TEMPLATE, weekday: String(weekday) })
      p.setShowCustomForm(true)
    }
    const onAddSessionToDayAcross = (week, year, weekday) => {
      p.onWeekChange(week, year)
      p.setCustomForm({ ...EMPTY_TEMPLATE, weekday: String(weekday) })
      p.setShowCustomForm(true)
    }
    return (
      <AdminPlanBuilder
        currentWeek={p.currentWeek}
        currentYear={p.currentYear}
        monday={p.monday}
        sunday={p.sunday}
        isThisWeek={p.isThisWeek}
        workouts={p.workouts}
        loadingWorkouts={p.loadingWorkouts}
        templates={p.templates}
        loadingTemplates={p.loadingTemplates}
        overviewWeeks={p.overviewWeeks}
        overviewWorkoutsByWeekKey={p.overviewWorkoutsByWeekKey}
        overviewWorkouts={p.overviewWorkouts}
        loadingOverview={p.loadingOverview}
        onWeekChange={p.onWeekChange}
        onSelectWorkout={p.setSelectedWorkout}
        onDeleteWorkout={p.handleDeleteWorkout}
        onMoveWorkoutByDrag={p.moveWorkoutByDrag}
        onMoveWorkoutAcross={p.moveWorkoutAcross}
        onMoveMany={p.moveManyWorkouts}
        onDeleteMany={p.deleteManyWorkouts}
        onAddTemplateToDay={p.handleAddTemplateToDay}
        onAddTemplateToDayAcross={p.addTemplateToDayAcross}
        onAddManySessions={p.addManySessions}
        onAddSessionToDay={onAddSessionToDay}
        onAddSessionToDayAcross={onAddSessionToDayAcross}
        onCreateTemplate={p.startNewTemplate}
      />
    )
  }

  if (tab === 'oktbank') {
    return <BibliotekTab {...p} />
  }

  return null
}
