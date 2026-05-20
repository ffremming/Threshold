import Login from '../components/Login'
import LoadingScreen from './LoadingScreen'
import ProfileErrorScreen from './ProfileErrorScreen'
import MainShell from './MainShell'
import {
  UserManagementScreen,
  AthleteOverviewScreen,
  AdminDashboardScreen,
} from './AdminScreens'

// Resolves which top-level screen to render based on auth state and the
// active admin/overview toggles. Keeping this in one place makes the routing
// flow explicit and keeps the App component focused on state wiring.
export default function AppRoutes({
  user,
  userProfile,
  profileLoading,
  profileError,
  isSuperadmin,
  canManageWorkouts,
  showUserManagement,
  showAthleteOverview,
  showAdmin,
  setShowUserManagement,
  setShowAthleteOverview,
  setShowAdmin,
  handlers,
  adminScreenProps,
  mainShellProps,
}) {
  if (user === undefined || (user && profileLoading)) return <LoadingScreen />
  if (!user) return <Login fullScreen onClose={() => {}} />
  if (profileError) {
    return <ProfileErrorScreen message={profileError} onLogout={handlers.handleLogout} />
  }

  if (showUserManagement && isSuperadmin) {
    return (
      <UserManagementScreen
        userProfile={userProfile}
        setShowUserManagement={setShowUserManagement}
      />
    )
  }

  if (showAthleteOverview && canManageWorkouts) {
    return (
      <AthleteOverviewScreen
        user={user}
        userProfile={userProfile}
        athletes={adminScreenProps.athletes}
        setShowAthleteOverview={setShowAthleteOverview}
      />
    )
  }

  if (showAdmin && canManageWorkouts) {
    return <AdminDashboardScreen {...adminScreenProps} />
  }

  return <MainShell {...mainShellProps} />
}
