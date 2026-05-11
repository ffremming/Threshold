import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import {
  compareWorkoutsBySchedule,
  getWeekKey,
  normalizeWorkout,
} from '../../utils'
import { subscribeToWorkoutWeeks } from '../../workoutSubscriptions'

export function useWorkouts({
  viewedAthleteId,
  currentWeek,
  currentYear,
  overviewWeeks,
  overviewWeekKeys,
  canManageWorkouts,
  userProfile,
  user,
}) {
  const [workouts, setWorkouts] = useState([])
  const [overviewWorkouts, setOverviewWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [overviewLoading, setOverviewLoading] = useState(true)

  useEffect(() => {
    if (!viewedAthleteId) {
      setWorkouts([])
      setLoading(false)
      return
    }

    setLoading(true)
    const q = query(
      collection(db, 'workouts'),
      where('athleteId', '==', viewedAthleteId),
      where('year', '==', currentYear),
      where('week', '==', currentWeek)
    )
    const unsub = onSnapshot(
      q,
      snap => {
        const docs = snap.docs
          .map(d => normalizeWorkout({ id: d.id, ...d.data() }))
          .filter(workout => canManageWorkouts || workout.athleteId === (userProfile?.uid || user?.uid))
          .sort(compareWorkoutsBySchedule)
        setWorkouts(docs)
        setLoading(false)
      },
      () => {
        setWorkouts([])
        setLoading(false)
      }
    )
    return unsub
  }, [canManageWorkouts, currentWeek, currentYear, user?.uid, userProfile?.uid, viewedAthleteId])

  useEffect(() => {
    if (!viewedAthleteId) {
      setOverviewWorkouts([])
      setOverviewLoading(false)
      return
    }

    setOverviewLoading(true)
    setOverviewWorkouts([])

    return subscribeToWorkoutWeeks({
      athleteId: viewedAthleteId,
      weeks: overviewWeeks,
      filterWorkout: workout => (
        overviewWeekKeys.has(getWeekKey(workout.week, workout.year))
        && (canManageWorkouts || workout.athleteId === (userProfile?.uid || user?.uid))
      ),
      onData: (nextWorkouts, isReady) => {
        setOverviewWorkouts(nextWorkouts)
        if (isReady) {
          setOverviewLoading(false)
        }
      },
      onError: () => {
        setOverviewLoading(false)
      },
    })
  }, [canManageWorkouts, currentWeek, currentYear, overviewWeekKeys, user?.uid, userProfile?.uid, viewedAthleteId])

  return { workouts, overviewWorkouts, loading, overviewLoading }
}
