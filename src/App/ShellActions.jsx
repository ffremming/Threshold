import SystemIcon from '../components/SystemIcon'
import { Button, IconButton } from '../components/ui'

export default function ShellActions({
  isSuperadmin,
  canManageWorkouts,
  setShowUserManagement,
  setShowAthleteOverview,
  setShowAdmin,
  handleLogout,
}) {
  return (
    <>
      {isSuperadmin && (
        <IconButton ariaLabel="Brukere" onClick={() => setShowUserManagement(true)}>
          <SystemIcon name="users" className="system-icon" />
        </IconButton>
      )}
      {canManageWorkouts && (
        <Button variant="secondary" size="sm" onClick={() => setShowAthleteOverview(true)}>
          <SystemIcon name="users" className="button-icon" />
          Utøvere
        </Button>
      )}
      {canManageWorkouts && (
        <Button variant="secondary" size="sm" onClick={() => setShowAdmin(true)}>
          <SystemIcon name="settings" className="button-icon" />
          Admin
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={handleLogout}>Logg ut</Button>
    </>
  )
}
