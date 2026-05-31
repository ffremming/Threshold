import { useMemo, useState } from 'react'
import { ChevronRight, Users } from 'lucide-react'
import {
  USER_STATUS_LABELS,
  compareUsersByRole,
  getUserRoles,
  getUserStatus,
} from '../../roles'
import { Card, EmptyState, List, Page, PageHeader, PageShell, SearchBox, StatusPill } from '../ui'
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
          eyebrow="User administration"
          title="All users"
          subtitle="New users get the «Athlete» role. Select a user to change roles and link coaches and athletes."
        />

        {!loading && users.length > 0 && (
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search by name or email…"
          />
        )}

        {loading ? (
          <Card aria-busy="true" style={{ padding: 'var(--th-space-5)', textAlign: 'center', color: 'var(--th-ink-muted)' }}>
            Loading users…
          </Card>
        ) : users.length === 0 ? (
          <EmptyState
            icon={<Users size={28} aria-hidden="true" />}
            title="No users yet"
            description="Users appear here as soon as they register."
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<Users size={28} aria-hidden="true" />}
            title="No matches"
            description={`Found no users matching «${search}».`}
          />
        ) : (
          <List className="th-um-list">
            {sorted.map(u => (
              <List.Row key={u.uid} onClick={() => onSelectUser(u)} columns="1fr auto auto auto">
                <div className="th-um-user">
                  <span className="th-um-avatar" aria-hidden="true">{initialOf(u)}</span>
                  <span className="th-um-user-meta">
                    <span className="th-um-name">{u.displayName || 'No name'}</span>
                    <span className="th-um-email">{u.email}</span>
                  </span>
                </div>
                <span className="th-um-roles">
                  {getUserRoles(u).map(role => <RoleChip key={role} role={role} />)}
                </span>
                <StatusPill status={getUserStatus(u) === 'active' ? 'success' : getUserStatus(u) === 'pending' ? 'warning' : 'danger'}>
                  {USER_STATUS_LABELS[getUserStatus(u)] || getUserStatus(u)}
                </StatusPill>
                <ChevronRight size={16} aria-hidden="true" style={{ color: 'var(--th-ink-muted)' }} />
              </List.Row>
            ))}
          </List>
        )}
      </Page>
    </PageShell>
  )
}
