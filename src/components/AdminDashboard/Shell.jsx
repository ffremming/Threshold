import AthleteSelector from '../AthleteSelector'
import SystemIcon from '../SystemIcon'
import { Button, PageShell, ShellBrand } from '../ui'
import { TAB_ITEMS } from './constants'

export default function Shell({
  tab, isSuperadmin, onClose, onOpenUserManagement, onLogout,
  athletes, selectedAthleteId, onSelectAthlete, userProfile,
  onTabChange, children,
}) {
  return (
    <PageShell
      className={tab === 'builder' ? 'admin-dashboard-wide' : undefined}
      brand={<ShellBrand onBack={onClose} eyebrow="Training Planner" title={isSuperadmin ? 'Adminpanel' : 'Trenerpanel'} />}
      actions={
        <>
          {onOpenUserManagement && (
            <Button variant="secondary" size="sm" onClick={onOpenUserManagement}>
              <SystemIcon name="users" className="button-icon" />
              Brukere
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onLogout}>Logg ut</Button>
        </>
      }
      banner={athletes.length > 0 ? (
        <>
          <div className="tp-shell-selector-meta">
            <span className="tp-shell-selector-label">Utøver</span>
          </div>
          <AthleteSelector
            athletes={athletes}
            selectedAthleteId={selectedAthleteId}
            onSelect={onSelectAthlete}
            currentUserProfile={userProfile}
            hideLabel
          />
        </>
      ) : null}
      tabs={TAB_ITEMS}
      tabValue={tab}
      onTabChange={onTabChange}
    >
      {children}
    </PageShell>
  )
}
