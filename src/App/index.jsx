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
import Login from '../components/Login'
import ShortcutsHelp from '../components/ShortcutsHelp'
import '../components/AthleteHome.css'
import { useAuth } from './hooks/useAuth'
import { useAthletes } from './hooks/useAthletes'
import { useWorkouts } from './hooks/useWorkouts'
import { useTemplates } from './hooks/useTemplates'
import { createHandlers } from './handlers'
import LoadingScreen from './LoadingScreen'
import ProfileErrorScreen from './ProfileErrorScreen'
import MainShell from './MainShell'
import { subscribeWeekNote } from '../weekNotes'
import {
  UserManagementScreen,
  AthleteOverviewScreen,
  AdminDashboardScreen,
} from './AdminScreens'

export default function App() {
  const today = new Date()
  const [currentWeek, setCurrentWeek] = useState(getWeekNumber(today))
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

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

  const [weekNote, setWeekNote] = useState(null)

  useEffect(() => {
    if (!viewedAthleteId) {
      setWeekNote(null)
      return
    }
    setWeekNote(null)
    const unsubscribe = subscribeWeekNote(
      { athleteId: viewedAthleteId, week: currentWeek, year: currentYear },
      setWeekNote
    )
    return unsubscribe
  }, [viewedAthleteId, currentWeek, currentYear])

  useEffect(() => {
    if (!selectedWorkout) return
    const freshWorkout = workouts.find(w => w.id === selectedWorkout.id)
    if (freshWorkout) {
      setSelectedWorkout(freshWorkout)
      return
    }
    setSelectedWorkout(null)
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

  useEffect(() => {
    function handleKeyDown(event) {
      const target = event.target
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
          return
        }
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const modalOpen =
        selectedWorkout ||
        replacementTarget ||
        showLogin ||
        showAdmin ||
        showUserManagement ||
        showAthleteOverview

      if (event.key === 'Escape' && showShortcutsHelp) {
        event.preventDefault()
        setShowShortcutsHelp(false)
        return
      }

      if (modalOpen) return

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        prevWeek()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        nextWeek()
      } else if (event.key === 't' || event.key === 'T') {
        event.preventDefault()
        goToToday()
      } else if (event.key === '?') {
        event.preventDefault()
        setShowShortcutsHelp(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    currentWeek, currentYear,
    selectedWorkout, replacementTarget,
    showLogin, showAdmin, showUserManagement, showAthleteOverview,
    showShortcutsHelp,
  ])

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
  const overviewByWeekKey = overviewWorkouts.reduce((acc, workout) => {
    const key = getWeekKey(workout.week, workout.year)
    if (!acc[key]) acc[key] = []
    acc[key].push(workout)
    return acc
  }, {})

  if (user === undefined || (user && profileLoading)) return <LoadingScreen />
  if (!user) return <Login fullScreen onClose={() => {}} />
  if (profileError) return <ProfileErrorScreen message={profileError} onLogout={handlers.handleLogout} />

  if (showUserManagement && isSuperadmin) {
    return <UserManagementScreen userProfile={userProfile} setShowUserManagement={setShowUserManagement} />
  }

  if (showAthleteOverview && canManageWorkouts) {
    return (
      <AthleteOverviewScreen
        user={user}
        userProfile={userProfile}
        athletes={athletes}
        setShowAthleteOverview={setShowAthleteOverview}
      />
    )
  }

  if (showAdmin && canManageWorkouts) {
    return (
      <AdminDashboardScreen
        user={user}
        userProfile={userProfile}
        setShowAdmin={setShowAdmin}
        currentWeek={currentWeek}
        currentYear={currentYear}
        handleWeekChange={handleWeekChange}
        overviewWeeks={overviewWeeks}
        selectedAthleteId={selectedAthleteId}
        athletes={athletes}
        setSelectedAthleteId={setSelectedAthleteId}
        adminWorkoutLayout={adminWorkoutLayout}
        handleWorkoutLayoutChange={handlers.handleWorkoutLayoutChange}
        isSuperadmin={isSuperadmin}
        setShowUserManagement={setShowUserManagement}
      />
    )
  }

  return (
    <>
    <MainShell
      {...{
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
        replacementTarget, templates, loadingTemplates,
        closeTemplatePicker: handlers.closeTemplatePicker,
        handleReplaceWithTemplate: handlers.handleReplaceWithTemplate,
        showLogin, setShowLogin,
        setShowUserManagement, setShowAthleteOverview, setShowAdmin,
        handleLogout: handlers.handleLogout,
        viewedAthleteId, weekNote,
      }}
    />
    {showShortcutsHelp && <ShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />}
    </>
  )
}
