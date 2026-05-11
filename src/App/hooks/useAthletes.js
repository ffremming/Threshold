import { useEffect, useState } from 'react'
import {
  onCoachAthletesSnapshot,
  onAllUsersSnapshot,
} from '../../userService'
import { hasRole } from '../../roles'

export function useAthletes(userProfile, { isAthlete, isCoach, isSuperadmin }) {
  const [athletes, setAthletes] = useState([])
  const [selectedAthleteId, setSelectedAthleteId] = useState(null)

  useEffect(() => {
    if (!userProfile) {
      setAthletes([])
      setSelectedAthleteId(null)
      return
    }

    if (isCoach) {
      const unsub = onCoachAthletesSnapshot(userProfile.uid, athleteList => {
        const nextAthletes = [
          userProfile,
          ...athleteList.filter(a => a.uid !== userProfile.uid),
        ]

        setAthletes(nextAthletes)
        setSelectedAthleteId(prev => {
          if (prev && nextAthletes.some(a => a.uid === prev)) return prev
          return userProfile.uid
        })
      })
      return unsub
    }

    if (isSuperadmin) {
      const unsub = onAllUsersSnapshot(allUsers => {
        const athleteList = allUsers.filter(u => hasRole(u, 'athlete'))
        setAthletes(athleteList)
        setSelectedAthleteId(prev => {
          if (prev && allUsers.some(a => a.uid === prev)) return prev
          if (allUsers.some(a => a.uid === userProfile.uid)) return userProfile.uid
          return athleteList.length > 0 ? athleteList[0].uid : userProfile.uid
        })
      })
      return unsub
    }

    setAthletes([])
    setSelectedAthleteId(userProfile.uid)
  }, [userProfile, isAthlete, isCoach, isSuperadmin])

  return { athletes, selectedAthleteId, setSelectedAthleteId }
}
