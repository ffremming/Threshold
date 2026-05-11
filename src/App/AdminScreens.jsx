import AdminDashboard from '../components/AdminDashboard'
import UserManagement from '../components/UserManagement'
import AthleteOverview from '../components/AthleteOverview'

export function UserManagementScreen({ userProfile, setShowUserManagement }) {
  return (
    <UserManagement
      currentUser={userProfile}
      onClose={() => setShowUserManagement(false)}
    />
  )
}

export function AthleteOverviewScreen({ user, userProfile, athletes, setShowAthleteOverview }) {
  return (
    <AthleteOverview
      user={user}
      userProfile={userProfile}
      athletes={athletes}
      onClose={() => setShowAthleteOverview(false)}
    />
  )
}

export function AdminDashboardScreen({
  user, userProfile, setShowAdmin,
  currentWeek, currentYear, handleWeekChange, overviewWeeks,
  selectedAthleteId, athletes, setSelectedAthleteId,
  adminWorkoutLayout, handleWorkoutLayoutChange,
  isSuperadmin, setShowUserManagement,
}) {
  return (
    <AdminDashboard
      user={user}
      userProfile={userProfile}
      onClose={() => setShowAdmin(false)}
      currentWeek={currentWeek}
      currentYear={currentYear}
      onWeekChange={handleWeekChange}
      overviewWeeks={overviewWeeks}
      selectedAthleteId={selectedAthleteId}
      athletes={athletes}
      onSelectAthlete={setSelectedAthleteId}
      workoutLayout={adminWorkoutLayout}
      onWorkoutLayoutChange={handleWorkoutLayoutChange}
      onOpenUserManagement={isSuperadmin ? () => {
        setShowAdmin(false)
        setShowUserManagement(true)
      } : null}
    />
  )
}
