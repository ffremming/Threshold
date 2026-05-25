import { useMemo, useState } from 'react'
import { ChevronRight, Users } from 'lucide-react'
import { compareUsersByRole, getUserRoles } from '../../roles'
import { Card, EmptyState, List, Page, PageHeader, PageShell, SearchBox } from '../ui'
import { useNav } from '../../App/primaryNav'
import RoleChip from './RoleChip'
import './UserManagement.css'

function initialOf(user) {
  return (user.displayName || user.email || '?').trim()[0].toUpperCase()
}

export default function UserList({ users, loading, onSelectUser }) {
  const nav = useNav()
  const [search, setSearch] = useState('')

  const sorted = useMemo(() => {
    const term = search.trim().toLowerCase()
    return [...users]
      .filter(u => {
        if (!term) return true
        return (u.displayName || '').toLowerCase().includes(term)
          || (u.email || '').toLowerCase().includes(term)
      })
      .sort((a, b) => {
        const byRole = compareUsersByRole(a, b)
        return byRole !== 0 ? byRole : (a.displayName || '').localeCompare(b.displayName || '')
      })
  }, [users, search])

  return (
    <PageShell
      nav={nav?.items}
      navActive="users"
      onNavChange={nav?.onChange}
      account={nav?.account}
      selectedAthlete={nav?.selectedAthlete}
    >
      <Page>
        <PageHeader
          eyebrow="Brukeradministrasjon"
          title="Alle brukere"
          subtitle="Nye brukere får rollen «Utøver». Velg en bruker for å endre roller og koble trenere og utøvere."
        />

        {!loading && users.length > 0 && (
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Søk på navn eller e-post…"
          />
        )}

        {loading ? (
          <Card aria-busy="true" style={{ padding: 'var(--tp-space-5)', textAlign: 'center', color: 'var(--tp-ink-muted)' }}>
            Laster brukere…
          </Card>
        ) : users.length === 0 ? (
          <EmptyState
            icon={<Users size={28} aria-hidden="true" />}
            title="Ingen brukere ennå"
            description="Brukere dukker opp her så snart de registrerer seg."
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<Users size={28} aria-hidden="true" />}
            title="Ingen treff"
            description={`Fant ingen brukere som matcher «${search}».`}
          />
        ) : (
          <List className="tp-um-list">
            {sorted.map(u => (
              <List.Row key={u.uid} onClick={() => onSelectUser(u)} columns="1fr auto auto">
                <div className="tp-um-user">
                  <span className="tp-um-avatar" aria-hidden="true">{initialOf(u)}</span>
                  <span className="tp-um-user-meta">
                    <span className="tp-um-name">{u.displayName || 'Uten navn'}</span>
                    <span className="tp-um-email">{u.email}</span>
                  </span>
                </div>
                <span className="tp-um-roles">
                  {getUserRoles(u).map(role => <RoleChip key={role} role={role} />)}
                </span>
                <ChevronRight size={16} aria-hidden="true" style={{ color: 'var(--tp-ink-muted)' }} />
              </List.Row>
            ))}
          </List>
        )}
      </Page>
    </PageShell>
  )
}
