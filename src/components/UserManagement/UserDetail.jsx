import { useMemo } from 'react'
import { Mail } from 'lucide-react'
import { getUserRoles, hasRole } from '../../roles'
import { Card, Page, PageShell, Section, ShellBrand, Stat } from '../ui'
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
          eyebrow="Brukerprofil"
          title={selectedUser.displayName || selectedUser.email}
        />
      }
    >
      <Page>
        <Card style={{ padding: 'var(--tp-space-4)', display: 'flex', flexWrap: 'wrap', gap: 'var(--tp-space-4)' }}>
          <Stat label="Navn" value={selectedUser.displayName || 'Uten navn'} />
          <Stat
            label="E-post"
            value={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Mail size={14} aria-hidden="true" /> {selectedUser.email}
              </span>
            }
          />
          <Stat label="Aktive roller" value={getUserRoles(selectedUser).length} />
        </Card>

        <Section
          title="Roller"
          subtitle="Trykk for å gi eller fjerne en rolle. En bruker må ha minst én rolle."
        >
          <RoleEditor user={selectedUser} busyRole={busyRole} onToggle={role => onRoleToggle(selectedUser, role)} />
        </Section>

        {isCoach && (
          <RelationshipSection
            title="Utøvere"
            subtitle="Utøvere denne treneren følger opp."
            emptyLabel="Ingen utøvere tildelt ennå."
            members={coachAthletes}
            unassigned={unassignedAthletes}
            addLabel="Legg til utøver"
            assignTitle="Velg utøver å koble til"
            noneLeftLabel="Alle utøvere er allerede koblet til denne treneren."
            onAdd={athlete => onAddRelationship(selectedUser.uid, athlete.uid)}
            onRemove={athlete => onRemoveRelationship(selectedUser.uid, athlete.uid)}
          />
        )}

        {isAthlete && (
          <RelationshipSection
            title="Trenere"
            subtitle="Trenere som følger opp denne utøveren."
            emptyLabel="Ingen trener tildelt ennå."
            members={athleteCoaches}
            unassigned={unassignedCoaches}
            addLabel="Legg til trener"
            assignTitle="Velg trener å koble til"
            noneLeftLabel="Alle trenere er allerede koblet til denne utøveren."
            onAdd={coach => onAddRelationship(coach.uid, selectedUser.uid)}
            onRemove={coach => onRemoveRelationship(coach.uid, selectedUser.uid)}
          />
        )}
      </Page>
    </PageShell>
  )
}
