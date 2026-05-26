import { useMemo } from 'react'
import { Mail } from 'lucide-react'
import { getUserRoles, hasRole } from '../../roles'
import { Card, Page, PageShell, Section, ShellBrand, Stat } from '../ui'
import { useNav } from '../../App/primaryNav'
import RelationshipSection from './RelationshipSection'
import RoleEditor from './RoleEditor'

export default function UserDetail({
  selectedUser,
  coaches,
  athletes,
  relationships,
  busyRole,
  onBack,
  onRoleToggle,
  onAddRelationship,
  onRemoveRelationship,
}) {
  const nav = useNav()
  const isCoach = hasRole(selectedUser, 'coach')
  const isAthlete = hasRole(selectedUser, 'athlete')

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
        <Card style={{ padding: 'var(--tp-space-4)', display: 'flex', flexWrap: 'wrap', gap: 'var(--tp-space-4)' }}>
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
        </Card>

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
