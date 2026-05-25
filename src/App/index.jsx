import { useState, useEffect, useMemo } from 'react'
import {
  getAdjacentWeek,
  getWeekKey,
  getWeekNumber,
  getWeekDates,
  getWeekWindow,
  groupWorkoutsByWeekday,
} from '../utils'
import { hasRole } from '../roles'
import ShortcutsHelp from '../components/ShortcutsHelp'
import '../components/AthleteHome.css'
import { useAuth } from './hooks/useAuth'
import { useAthletes } from './hooks/useAthletes'
import { useWorkouts } from './hooks/useWorkouts'
import { useTemplates } from './hooks/useTemplates'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { createHandlers } from './handlers'
import AppRoutes from './AppRoutes'
import { NavProvider } from './primaryNav'

export default function App() {
  const today = useMemo(() => new Date(), [])
  const [currentWeek, setCurrentWeek] = useState(() => getWeekNumber(today))
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear())

  const [showLogin, setShowLogin] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [showAthleteOverview, setShowAthleteOverview] = useState(false)
  const [showOverview, setShowOverview] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [replacementTarget, setReplacementTarget] = useState(null)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)

  const { user, userProfile, profileLoading, profileError } = useAuth()

  const overviewWeeks = useMemo(
    () => getWeekWindow(currentWeek, currentYear, 4, 4),
    [currentWeek, currentYear]
  )
  const overviewWeekKeys = useMemo(
    () => new Set(overviewWeeks.map(week => week.key)),
    [overviewWeeks]
  )
  const selectedWeekKey = getWeekKey(currentWeek, currentYear)

  const isSuperadmin = hasRole(userProfile, 'superadmin')
  const isCoach = hasRole(userProfile, 'coach')
  const isAthlete = hasRole(userProfile, 'athlete')
  const canManageWorkouts = isSuperadmin || isCoach
  const workoutLayout = userProfile?.workoutLayout === 'calendar' ? 'calendar' : 'list'

  const { athletes, selectedAthleteId, setSelectedAthleteId } = useAthletes(
    userProfile,
    { isAthlete, isCoach, isSuperadmin }
  )

  const selectedAthleteProfile = athletes.find(athlete => athlete.uid === selectedAthleteId) || null
  const adminWorkoutLayout = selectedAthleteProfile?.workoutLayout === 'calendar' ? 'calendar' : 'list'
  const viewedAthleteId = canManageWorkouts
    ? (selectedAthleteId || userProfile?.uid || user?.uid)
    : (userProfile?.uid || user?.uid)
  const activeHomeAthlete = canManageWorkouts
    ? (selectedAthleteProfile || (selectedAthleteId === userProfile?.uid ? userProfile : null))
    : userProfile
  const homeWorkoutLayout = canManageWorkouts ? adminWorkoutLayout : workoutLayout

  const { workouts, overviewWorkouts, loading, overviewLoading } = useWorkouts({
    viewedAthleteId, currentWeek, currentYear, overviewWeeks, overviewWeekKeys,
    canManageWorkouts, userProfile, user,
  })

  // Keep the open workout detail modal in sync with live workout data.
  useEffect(() => {
    if (!selectedWorkout) return
    const freshWorkout = workouts.find(w => w.id === selectedWorkout.id)
    setSelectedWorkout(freshWorkout || null)
  }, [workouts, selectedWorkout])

  const { templates, loadingTemplates } = useTemplates(userProfile)

  function prevWeek() {
    const previous = getAdjacentWeek(currentWeek, currentYear, -1)
    setCurrentWeek(previous.week)
    setCurrentYear(previous.year)
  }

  function nextWeek() {
    const next = getAdjacentWeek(currentWeek, currentYear, 1)
    setCurrentWeek(next.week)
    setCurrentYear(next.year)
  }

  function goToToday() {
    setCurrentWeek(getWeekNumber(today))
    setCurrentYear(today.getFullYear())
  }

  function handleWeekChange(week, year) {
    setCurrentWeek(week)
    setCurrentYear(year)
  }

  const isModalOpen = Boolean(
    selectedWorkout ||
    replacementTarget ||
    showLogin ||
    showAdmin ||
    showUserManagement ||
    showAthleteOverview
  )

  useKeyboardShortcuts({
    isModalOpen,
    showShortcutsHelp,
    setShowShortcutsHelp,
    prevWeek,
    nextWeek,
    goToToday,
  })

  const handlers = createHandlers({
    selectedWorkout, setSelectedWorkout,
    replacementTarget, setReplacementTarget,
    setShowAdmin, setShowUserManagement, setShowAthleteOverview,
    selectedAthleteId, userProfile, adminWorkoutLayout,
  })

  const { monday, sunday } = getWeekDates(currentWeek, currentYear)
  const doneCount = workouts.filter(w => w.completed).length
  const isThisWeek = currentWeek === getWeekNumber(today) && currentYear === today.getFullYear()
  const workoutDays = groupWorkoutsByWeekday(workouts)
  const overviewByWeekKey = useMemo(() => (
    overviewWorkouts.reduce((acc, workout) => {
      const key = getWeekKey(workout.week, workout.year)
      if (!acc[key]) acc[key] = []
      acc[key].push(workout)
      return acc
    }, {})
  ), [overviewWorkouts])

  const adminScreenProps = {
    user, userProfile, athletes, setShowAdmin, setShowUserManagement,
    currentWeek, currentYear, handleWeekChange, overviewWeeks,
    selectedAthleteId, setSelectedAthleteId, adminWorkoutLayout, isSuperadmin,
    handleWorkoutLayoutChange: handlers.handleWorkoutLayoutChange,
  }

  const mainShellProps = {
    isSuperadmin, canManageWorkouts, activeHomeAthlete,
    currentWeek, currentYear, monday, sunday, isThisWeek,
    prevWeek, nextWeek, goToToday, handleWeekChange,
    showOverview, setShowOverview, overviewLoading, overviewWeeks, overviewByWeekKey, selectedWeekKey,
    athletes, selectedAthleteId, setSelectedAthleteId, userProfile,
    homeWorkoutLayout,
    handleWorkoutLayoutChange: handlers.handleWorkoutLayoutChange,
    loading, workouts, doneCount, workoutDays,
    selectedWorkout, setSelectedWorkout,
    handleToggleComplete: handlers.handleToggleComplete,
    handleSaveComment: handlers.handleSaveComment,
    handleStartReplaceWorkout: handlers.handleStartReplaceWorkout,
    handleDuplicateWorkout: handlers.handleDuplicateWorkout,
    replacementTarget, templates, loadingTemplates,
    closeTemplatePicker: handlers.closeTemplatePicker,
    handleReplaceWithTemplate: handlers.handleReplaceWithTemplate,
    showLogin, setShowLogin,
    setShowUserManagement, setShowAthleteOverview, setShowAdmin,
    handleLogout: handlers.handleLogout,
  }

  return (
    <NavProvider
      canManageWorkouts={canManageWorkouts}
      isSuperadmin={isSuperadmin}
      setShowAthleteOverview={setShowAthleteOverview}
      setShowAdmin={setShowAdmin}
      setShowUserManagement={setShowUserManagement}
      handleLogout={handlers.handleLogout}
      userProfile={userProfile}
      athletes={athletes}
      selectedAthleteId={selectedAthleteId}
      setSelectedAthleteId={setSelectedAthleteId}
    >
      <AppRoutes
        user={user}
        userProfile={userProfile}
        profileLoading={profileLoading}
        profileError={profileError}
        isSuperadmin={isSuperadmin}
        canManageWorkouts={canManageWorkouts}
        showUserManagement={showUserManagement}
        showAthleteOverview={showAthleteOverview}
        showAdmin={showAdmin}
        setShowUserManagement={setShowUserManagement}
        setShowAthleteOverview={setShowAthleteOverview}
        setShowAdmin={setShowAdmin}
        handlers={handlers}
        adminScreenProps={adminScreenProps}
        mainShellProps={mainShellProps}
      />
      {showShortcutsHelp && <ShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />}
    </NavProvider>
  )
}
