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
      window.alert('A user must have at least one role.')
      return
    }

    if (user.uid === currentUser.uid && !nextRoles.includes('superadmin')) {
      const ok = window.confirm(
        'Are you sure you want to change your own role? You may lose admin access.',
      )
      if (!ok) return
    }

    setBusyRole(role)
    try {
      await updateUserRole(user.uid, nextRoles)
    } catch (err) {
      window.alert(`Could not update the role: ${err.message}`)
    } finally {
      setBusyRole(null)
    }
  }

  async function handleAddRelationship(coachId, athleteId) {
    try {
      await addRelationship(coachId, athleteId)
    } catch (err) {
      window.alert(`Could not create the link: ${err.message}`)
    }
  }

  async function handleRemoveRelationship(coachId, athleteId) {
    if (!window.confirm('Remove this coach-athlete link?')) return
    try {
      await removeRelationship(coachId, athleteId)
    } catch (err) {
      window.alert(`Could not remove the link: ${err.message}`)
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
      onSelectUser={u => setSelectedUid(u.uid)}
    />
  )
}
