import { compareUsersByRole, getUserRoles, ROLE_LABELS } from '../../roles'
import { Page, PageHeader, PageShell, ShellBrand } from '../ui'

export default function UserList({ users, loading, onClose, onSelectUser }) {
  return (
    <PageShell brand={<ShellBrand onBack={onClose} eyebrow="Training Planner" title="Brukere" />}>
      <Page>
        <PageHeader
          eyebrow="User management"
          title="Alle brukere"
          subtitle="Nye brukere registrerer seg selv og får rollen «Utøver». Kombiner roller og tildel trenere her."
        />

        {loading ? (
          <div className="empty-state">Laster brukere...</div>
        ) : users.length === 0 ? (
          <div className="empty-state">Ingen brukere funnet</div>
        ) : (
          <div className="user-list">
            {users
              .sort((a, b) => {
                const ro = compareUsersByRole(a, b)
                return ro !== 0 ? ro : (a.displayName || '').localeCompare(b.displayName || '')
              })
              .map(u => (
                <div
                  key={u.uid}
                  className="user-card"
                  onClick={() => onSelectUser(u)}
                >
                  <div className="user-card-left">
                    <div className="user-avatar">
                      {(u.displayName || u.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="user-card-info">
                      <span className="user-card-name">{u.displayName || 'Uten navn'}</span>
                      <span className="user-card-email">{u.email}</span>
                    </div>
                  </div>
                  <div className="role-badge-list">
                    {getUserRoles(u).map(role => (
                      <span key={role} className={`role-badge role-${role}`}>
                        {ROLE_LABELS[role] || role}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </Page>
    </PageShell>
  )
}
