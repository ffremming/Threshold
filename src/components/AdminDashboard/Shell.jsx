import { PageShell } from '../ui'
import { useNav } from '../../App/primaryNav'
import { TAB_ITEMS } from './constants'

export default function Shell({ tab, onTabChange, children }) {
  const nav = useNav()

  return (
    <PageShell
      className={tab === 'builder' ? 'admin-dashboard-wide' : undefined}
      tabs={TAB_ITEMS}
      tabValue={tab}
      onTabChange={onTabChange}
      nav={nav?.items}
      navActive="admin"
      onNavChange={nav?.onChange}
      account={nav?.account}
      selectedAthlete={nav?.selectedAthlete}
    >
      {children}
    </PageShell>
  )
}
