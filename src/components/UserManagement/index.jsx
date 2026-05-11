import { useEffect, useState } from 'react'
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
  const [selectedUser, setSelectedUser] = useState(null)
  const [assigningCoach, setAssigningCoach] = useState(false)

  useEffect(() => {
    const unsubUsers = onAllUsersSnapshot(allUsers => {
      setUsers(allUsers)
      setLoading(false)
    })
    const unsubRels = onRelationshipsSnapshot(setRelationships)
    return () => { unsubUsers(); unsubRels() }
  }, [])

  useEffect(() => {
    if (!selectedUser) return
    const fresh = users.find(u => u.uid === selectedUser.uid)
    if (fresh) setSelectedUser(fresh)
  }, [users])

  async function handleRoleToggle(user, role) {
    const currentRoles = getUserRoles(user)
    const nextRoles = currentRoles.includes(role)
      ? currentRoles.filter(currentRole => currentRole !== role)
      : [...currentRoles, role]

    if (nextRoles.length === 0) {
      window.alert('En bruker må ha minst én rolle.')
      return
    }

    if (user.uid === currentUser.uid && !nextRoles.includes('superadmin')) {
      if (!window.confirm('Er du sikker på at du vil endre din egen rolle? Du kan miste admin-tilgang.')) {
        return
      }
    }

    await updateUserRole(user.uid, nextRoles)
  }

  async function handleAddRelationship(coachId, athleteId) {
    await addRelationship(coachId, athleteId)
    setAssigningCoach(false)
  }

  async function handleRemoveRelationship(coachId, athleteId) {
    if (!window.confirm('Fjerne denne trener-utøver-koblingen?')) return
    await removeRelationship(coachId, athleteId)
  }

  const coaches = users.filter(u => hasRole(u, 'coach'))
  const athletes = users.filter(u => hasRole(u, 'athlete'))

  if (selectedUser) {
    return (
      <UserDetail
        selectedUser={selectedUser}
        coaches={coaches}
        athletes={athletes}
        relationships={relationships}
        users={users}
        assigningCoach={assigningCoach}
        setAssigningCoach={setAssigningCoach}
        setSelectedUser={setSelectedUser}
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
      onSelectUser={setSelectedUser}
    />
  )
}
