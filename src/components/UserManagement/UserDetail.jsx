import { useMemo } from 'react'
import { Mail } from 'lucide-react'
import {
  USER_STATUS_LABELS,
  USER_STATUS_OPTIONS,
  getUserRoles,
  getUserStatus,
  hasRole,
} from '../../roles'
import { Card, Page, PageShell, Section, ShellBrand, Stat, StatusPill } from '../ui'
import { useNav } from '../../App/primaryNav'
import RelationshipSection from './RelationshipSection'
import RoleEditor from './RoleEditor'

export default function UserDetail({
  selectedUser,
  coaches,
  athletes,
  relationships,
  busyRole,
  busyStatus,
  onBack,
  onRoleToggle,
  onStatusChange,
  onAddRelationship,
  onRemoveRelationship,
}) {
  const nav = useNav()
  const isCoach = hasRole(selectedUser, 'coach')
  const isAthlete = hasRole(selectedUser, 'athlete')
  const status = getUserStatus(selectedUser)

  const { coachAthletes, athleteCoaches } = useMemo(() => {
    const athleteIds = new Set(
      relationships.filter(r => r.coachId === selectedUser.uid).map(r => r.athleteId)
    )
    const coachIds = new Set(
      relationships.filter(r => r.athleteId === selectedUser.uid).map(r => r.coachId)
    )
    return {
      coachAthletes: athletes.filter(a => athleteIds.has(a.uid)),
      athleteCoaches: coaches.filter(c => coachIds.has(c.uid)),
    }
  }, [relationships, athletes, coaches, selectedUser.uid])

  const unassignedAthletes = athletes.filter(
    a => a.uid !== selectedUser.uid && !coachAthletes.some(ca => ca.uid === a.uid)
  )
  const unassignedCoaches = coaches.filter(
    c => c.uid !== selectedUser.uid && !athleteCoaches.some(ac => ac.uid === c.uid)
  )

  return (
    <PageShell
      brand={
        <ShellBrand
          onBack={onBack}
          eyebrow="User profile"
          title={selectedUser.displayName || selectedUser.email}
        />
      }
      nav={nav?.items}
      navActive="users"
      onNavChange={nav?.onChange}
      account={nav?.account}
      selectedAthlete={nav?.selectedAthlete}
    >
      <Page>
        <Card style={{ padding: 'var(--th-space-4)', display: 'flex', flexWrap: 'wrap', gap: 'var(--th-space-4)' }}>
          <Stat label="Name" value={selectedUser.displayName || 'No name'} />
          <Stat
            label="Email"
            value={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Mail size={14} aria-hidden="true" /> {selectedUser.email}
              </span>
            }
          />
          <Stat label="Active roles" value={getUserRoles(selectedUser).length} />
          <Stat
            label="Access"
            value={<StatusPill status={status === 'active' ? 'success' : status === 'pending' ? 'warning' : 'danger'}>{USER_STATUS_LABELS[status] || status}</StatusPill>}
          />
        </Card>

        <Section
          title="Access"
          subtitle="Pending and disabled users can sign in, but cannot read or write training data."
        >
          <div className="th-status-editor" role="group" aria-label="Access status">
            {USER_STATUS_OPTIONS.map(option => (
              <button
                key={option}
                type="button"
                className={`th-status-toggle${status === option ? ' is-on' : ''}`}
                aria-pressed={status === option}
                disabled={busyStatus === option}
                onClick={() => onStatusChange(selectedUser, option)}
              >
                {USER_STATUS_LABELS[option]}
              </button>
            ))}
          </div>
        </Section>

        <Section
          title="Roles"
          subtitle="Click to grant or remove a role. A user must have at least one role."
        >
          <RoleEditor user={selectedUser} busyRole={busyRole} onToggle={role => onRoleToggle(selectedUser, role)} />
        </Section>

        {isCoach && (
          <RelationshipSection
            title="Athletes"
            subtitle="Athletes this coach follows up."
            emptyLabel="No athletes assigned yet."
            members={coachAthletes}
            unassigned={unassignedAthletes}
            addLabel="Add athlete"
            assignTitle="Select athlete to link"
            noneLeftLabel="All athletes are already linked to this coach."
            onAdd={athlete => onAddRelationship(selectedUser.uid, athlete.uid)}
            onRemove={athlete => onRemoveRelationship(selectedUser.uid, athlete.uid)}
          />
        )}

        {isAthlete && (
          <RelationshipSection
            title="Coaches"
            subtitle="Coaches who follow up this athlete."
            emptyLabel="No coach assigned yet."
            members={athleteCoaches}
            unassigned={unassignedCoaches}
            addLabel="Add coach"
            assignTitle="Select coach to link"
            noneLeftLabel="All coaches are already linked to this athlete."
            onAdd={coach => onAddRelationship(coach.uid, selectedUser.uid)}
            onRemove={coach => onRemoveRelationship(coach.uid, selectedUser.uid)}
          />
        )}
      </Page>
    </PageShell>
  )
}
