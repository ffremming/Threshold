import AnalysisDashboard from '../AnalysisDashboard'
import TestingDashboard from '../TestingDashboard'
import AdminPlanBuilder from '../AdminPlanBuilder'
import { Page, EmptyState } from '../ui'
import PlanTab from './tabs/PlanTab'
import BibliotekTab from './tabs/BibliotekTab'

export default function TabContent(p) {
  const { tab, selectedAthleteId } = p

  if (!selectedAthleteId && (tab === 'plan' || tab === 'builder')) {
    return (
      <Page>
        <EmptyState
          title="Ingen utøver valgt"
          description={tab === 'plan' ? 'Velg en utøver for å administrere treningsplanen.' : 'Velg en utøver for å bruke planverktøyet.'}
        />
      </Page>
    )
  }

  if (tab === 'plan' && selectedAthleteId) {
    return <PlanTab {...p} />
  }

  if (tab === 'analysis') {
    if (!selectedAthleteId) {
      return <Page><EmptyState title="Ingen utøver valgt" description="Velg en utøver for å se analyse." /></Page>
    }
    if (p.loadingAnalysis) {
      return <Page><EmptyState title="Laster analyse…" /></Page>
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
      return <Page><EmptyState title="Ingen utøver valgt" description="Velg en utøver for å administrere tester." /></Page>
    }
    return (
      <TestingDashboard
        selectedAthleteId={selectedAthleteId}
        userProfile={p.userProfile}
      />
    )
  }

  if (tab === 'builder' && selectedAthleteId) {
    return (
      <AdminPlanBuilder
        currentWeek={p.currentWeek}
        currentYear={p.currentYear}
        monday={p.monday}
        sunday={p.sunday}
        isThisWeek={p.isThisWeek}
        workoutLayout={p.workoutLayout}
        workouts={p.workouts}
        loadingWorkouts={p.loadingWorkouts}
        templates={p.templates}
        loadingTemplates={p.loadingTemplates}
        overviewWeeks={p.overviewWeeks}
        overviewWorkoutsByWeekKey={p.overviewWorkoutsByWeekKey}
        loadingOverview={p.loadingOverview}
        onWeekChange={p.onWeekChange}
        onSelectWorkout={p.setSelectedWorkout}
        onDeleteWorkout={p.handleDeleteWorkout}
        onToggleComplete={p.handleToggleComplete}
        onMoveWorkout={p.moveWorkout}
        onMoveWorkoutByDrag={p.moveWorkoutByDrag}
        onAddTemplateToDay={p.handleAddTemplateToDay}
        onEditTemplate={p.startEditTemplate}
        onCreateTemplate={p.startNewTemplate}
        onDeleteTemplate={p.handleDeleteTemplate}
      />
    )
  }

  if (tab === 'oktbank') {
    return <BibliotekTab {...p} />
  }

  return null
}
