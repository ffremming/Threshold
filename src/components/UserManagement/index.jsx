import { useEffect, useMemo, useState } from 'react'
import {
  updateUserRole,
  addRelationship,
  removeRelationship,
  onAllUsersSnapshot,
  onRelationshipsSnapshot,
} from '../../userService'
import { getUserRoles, hasRole } from '../../roles'
import UserDetail from './UserDetail'
import UserList from './UserList'

export default function UserManagement({ currentUser, onClose }) {
  const [users, setUsers] = useState([])
  const [relationships, setRelationships] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUid, setSelectedUid] = useState(null)
  const [busyRole, setBusyRole] = useState(null)

  useEffect(() => {
    const unsubUsers = onAllUsersSnapshot(allUsers => {
      setUsers(allUsers)
      setLoading(false)
    })
    const unsubRels = onRelationshipsSnapshot(setRelationships)
    return () => { unsubUsers(); unsubRels() }
  }, [])

  // Derive the selected user from live data so it always stays fresh.
  const selectedUser = useMemo(
    () => users.find(u => u.uid === selectedUid) || null,
    [users, selectedUid],
  )

  const coaches = useMemo(() => users.filter(u => hasRole(u, 'coach')), [users])
  const athletes = useMemo(() => users.filter(u => hasRole(u, 'athlete')), [users])

  async function handleRoleToggle(user, role) {
    const currentRoles = getUserRoles(user)
    const nextRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role]

    if (nextRoles.length === 0) {
      window.alert('En bruker må ha minst én rolle.')
      return
    }

    if (user.uid === currentUser.uid && !nextRoles.includes('superadmin')) {
      const ok = window.confirm(
        'Er du sikker på at du vil endre din egen rolle? Du kan miste admin-tilgang.',
      )
      if (!ok) return
    }

    setBusyRole(role)
    try {
      await updateUserRole(user.uid, nextRoles)
    } catch (err) {
      window.alert(`Kunne ikke oppdatere rollen: ${err.message}`)
    } finally {
      setBusyRole(null)
    }
  }

  async function handleAddRelationship(coachId, athleteId) {
    try {
      await addRelationship(coachId, athleteId)
    } catch (err) {
      window.alert(`Kunne ikke opprette koblingen: ${err.message}`)
    }
  }

  async function handleRemoveRelationship(coachId, athleteId) {
    if (!window.confirm('Fjerne denne trener-utøver-koblingen?')) return
    try {
      await removeRelationship(coachId, athleteId)
    } catch (err) {
      window.alert(`Kunne ikke fjerne koblingen: ${err.message}`)
    }
  }

  if (selectedUser) {
    return (
      <UserDetail
        selectedUser={selectedUser}
        coaches={coaches}
        athletes={athletes}
        relationships={relationships}
        busyRole={busyRole}
        onBack={() => setSelectedUid(null)}
        onRoleToggle={handleRoleToggle}
        onAddRelationship={handleAddRelationship}
        onRemoveRelationship={handleRemoveRelationship}
      />
    )
  }

  return (
    <UserList
      users={users}
      loading={loading}
      onClose={onClose}
      onSelectUser={u => setSelectedUid(u.uid)}
    />
  )
}
