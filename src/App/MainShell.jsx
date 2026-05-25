import Login from '../components/Login'
import {
  PageShell,
  Page,
  WeekNav,
  LayoutToggle,
} from '../components/ui'
import { useNav } from './primaryNav'
import WorkoutList from './WorkoutList'
import WorkoutDetailModal from './WorkoutDetailModal'
import TemplatePickerModal from './TemplatePickerModal'

export default function MainShell(props) {
  const {
    canManageWorkouts, activeHomeAthlete,
    currentWeek, currentYear, monday, sunday, isThisWeek,
    prevWeek, nextWeek, goToToday,
    athletes,
    homeWorkoutLayout, handleWorkoutLayoutChange,
    loading, workouts, doneCount, workoutDays,
    selectedWorkout, setSelectedWorkout,
    handleToggleComplete, handleSaveComment, handleStartReplaceWorkout, handleDuplicateWorkout,
    replacementTarget, templates, loadingTemplates, closeTemplatePicker, handleReplaceWithTemplate,
    showLogin, setShowLogin,
  } = props

  const nav = useNav()
  const showCoachControls = canManageWorkouts && athletes.length > 0

  return (
    <PageShell
      nav={nav.items}
      navActive="plan"
      onNavChange={nav.onChange}
      account={nav.account}
      selectedAthlete={nav.selectedAthlete}
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
            showCoachControls
              ? <LayoutToggle value={homeWorkoutLayout} onChange={handleWorkoutLayoutChange} />
              : null
          }
        />

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
          handleDuplicateWorkout={handleDuplicateWorkout}
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
