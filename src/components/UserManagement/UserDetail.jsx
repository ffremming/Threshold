import { getUserRoles, hasRole, ROLE_LABELS, ROLE_OPTIONS } from '../../roles'
import { Page, PageShell, ShellBrand } from '../ui'
import RelationshipSection from './RelationshipSection'

export default function UserDetail({
  selectedUser,
  coaches,
  athletes,
  relationships,
  users,
  assigningCoach,
  setAssigningCoach,
  setSelectedUser,
  onRoleToggle,
  onAddRelationship,
  onRemoveRelationship,
}) {
  const selectedRoles = getUserRoles(selectedUser)
  const isCoach = hasRole(selectedUser, 'coach')
  const isAthlete = hasRole(selectedUser, 'athlete')

  const coachAthletes = isCoach
    ? users.filter(u => relationships.filter(r => r.coachId === selectedUser.uid).map(r => r.athleteId).includes(u.uid))
    : []
  const athleteCoaches = isAthlete
    ? users.filter(u => relationships.filter(r => r.athleteId === selectedUser.uid).map(r => r.coachId).includes(u.uid))
    : []
  const unassignedAthletes = isCoach
    ? athletes.filter(a => !coachAthletes.some(ca => ca.uid === a.uid))
    : []
  const unassignedCoaches = isAthlete
    ? coaches.filter(c => !athleteCoaches.some(ac => ac.uid === c.uid))
    : []

  return (
    <PageShell brand={<ShellBrand onBack={() => { setSelectedUser(null); setAssigningCoach(false) }} eyebrow="Brukerprofil" title={selectedUser.displayName} />}>
      <Page>
        <div className="user-detail-card">
          <div className="user-detail-row">
            <span className="user-detail-label">E-post</span>
            <span>{selectedUser.email}</span>
          </div>
          <div className="user-detail-row">
            <span className="user-detail-label">Roller</span>
            <div className="role-select role-checkbox-group">
              {ROLE_OPTIONS.map(role => (
                <label key={role} className="role-checkbox-option">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => onRoleToggle(selectedUser, role)}
                  />
                  <span>{ROLE_LABELS[role]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {isCoach && (
          <RelationshipSection
            title="Utøvere"
            emptyLabel="Ingen utøvere tildelt ennå"
            members={coachAthletes}
            unassigned={unassignedAthletes}
            assigningCoach={assigningCoach}
            setAssigningCoach={setAssigningCoach}
            onRemove={(athlete) => onRemoveRelationship(selectedUser.uid, athlete.uid)}
            onAdd={(athlete) => onAddRelationship(selectedUser.uid, athlete.uid)}
            assignTitle="Legg til utøver"
            addLabel="+ Legg til utøver"
          />
        )}

        {isAthlete && (
          <RelationshipSection
            title="Trenere"
            emptyLabel="Ingen trener tildelt ennå"
            members={athleteCoaches}
            unassigned={unassignedCoaches}
            assigningCoach={assigningCoach}
            setAssigningCoach={setAssigningCoach}
            onRemove={(coach) => onRemoveRelationship(coach.uid, selectedUser.uid)}
            onAdd={(coach) => onAddRelationship(coach.uid, selectedUser.uid)}
            assignTitle="Legg til trener"
            addLabel="+ Legg til trener"
          />
        )}
      </Page>
    </PageShell>
  )
}
