import Login from '../components/Login'
import BirdsEyeOverview from '../components/BirdsEyeOverview'
import {
  IconButton,
  PageShell,
  ShellBrand,
  Page,
  Section,
  WeekNav,
  AthletePicker,
  LayoutToggle,
} from '../components/ui'
import ShellActions from './ShellActions'
import WorkoutList from './WorkoutList'
import WorkoutDetailModal from './WorkoutDetailModal'
import TemplatePickerModal from './TemplatePickerModal'
import WeekNote from '../components/WeekNote'

export default function MainShell(props) {
  const {
    isSuperadmin, canManageWorkouts, activeHomeAthlete,
    currentWeek, currentYear, monday, sunday, isThisWeek,
    prevWeek, nextWeek, goToToday, handleWeekChange,
    showOverview, setShowOverview, overviewLoading, overviewWeeks, overviewByWeekKey, selectedWeekKey,
    athletes, selectedAthleteId, setSelectedAthleteId, userProfile,
    homeWorkoutLayout, handleWorkoutLayoutChange,
    loading, workouts, doneCount, workoutDays,
    selectedWorkout, setSelectedWorkout,
    handleToggleComplete, handleSaveComment, handleStartReplaceWorkout,
    replacementTarget, templates, loadingTemplates, closeTemplatePicker, handleReplaceWithTemplate,
    showLogin, setShowLogin,
    setShowUserManagement, setShowAthleteOverview, setShowAdmin, handleLogout,
    viewedAthleteId, weekNote,
  } = props

  return (
    <PageShell
      brand={
        <ShellBrand
          eyebrow="Training Planner"
          title={canManageWorkouts && activeHomeAthlete?.displayName ? `Plan: ${activeHomeAthlete.displayName}` : 'Treningsplan'}
        />
      }
      actions={
        <ShellActions
          isSuperadmin={isSuperadmin}
          canManageWorkouts={canManageWorkouts}
          setShowUserManagement={setShowUserManagement}
          setShowAthleteOverview={setShowAthleteOverview}
          setShowAdmin={setShowAdmin}
          handleLogout={handleLogout}
        />
      }
    >
      <Page>
        <WeekNav
          week={currentWeek}
          year={currentYear}
          monday={monday}
          sunday={sunday}
          isThisWeek={isThisWeek}
          onPrev={prevWeek}
          onNext={nextWeek}
          onToday={goToToday}
          rightSlot={
            <IconButton
              ariaLabel="Vis oversikt for siste 4 og neste 4 uker"
              onClick={() => setShowOverview(p => !p)}
              variant={showOverview ? undefined : 'ghost'}
            >
              <span className="ah-overview-glyph" aria-hidden="true"><span /><span /><span /><span /></span>
            </IconButton>
          }
        />

        {viewedAthleteId && (
          <WeekNote
            athleteId={viewedAthleteId}
            week={currentWeek}
            year={currentYear}
            note={weekNote}
          />
        )}

        {canManageWorkouts && athletes.length > 0 && (
          <div className="ah-controls">
            <AthletePicker
              athletes={athletes}
              selectedId={selectedAthleteId}
              onSelect={setSelectedAthleteId}
              currentUserProfile={userProfile}
            />
            <LayoutToggle value={homeWorkoutLayout} onChange={handleWorkoutLayoutChange} />
          </div>
        )}

        {showOverview && (
          overviewLoading ? (
            <Section title="Mengdeoversikt"><div className="ah-loading">Laster…</div></Section>
          ) : (
            <BirdsEyeOverview
              weeks={overviewWeeks}
              workoutsByWeekKey={overviewByWeekKey}
              selectedWeekKey={selectedWeekKey}
              onSelectWeek={(week, year) => { handleWeekChange(week, year); setShowOverview(false) }}
            />
          )
        )}

        <WorkoutList
          loading={loading}
          workouts={workouts}
          workoutDays={workoutDays}
          doneCount={doneCount}
          homeWorkoutLayout={homeWorkoutLayout}
          canManageWorkouts={canManageWorkouts}
          activeHomeAthlete={activeHomeAthlete}
          setSelectedWorkout={setSelectedWorkout}
          handleToggleComplete={handleToggleComplete}
        />
      </Page>

      {selectedWorkout && (
        <WorkoutDetailModal
          selectedWorkout={selectedWorkout}
          setSelectedWorkout={setSelectedWorkout}
          canManageWorkouts={canManageWorkouts}
          handleStartReplaceWorkout={handleStartReplaceWorkout}
          handleToggleComplete={handleToggleComplete}
          handleSaveComment={handleSaveComment}
        />
      )}

      {replacementTarget && (
        <TemplatePickerModal
          targetWorkout={replacementTarget}
          templates={templates}
          loading={loadingTemplates}
          onClose={closeTemplatePicker}
          onPick={handleReplaceWithTemplate}
        />
      )}

      {showLogin && <Login onClose={() => setShowLogin(false)} />}
    </PageShell>
  )
}
