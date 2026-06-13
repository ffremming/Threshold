import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import {
  compareWorkoutsBySchedule,
  getWeekKey,
  normalizeWorkout,
} from '../../utils'
import { sortTemplates } from '../../templateLibrary'
import { subscribeToWorkoutWeeks } from '../../workoutSubscriptions'
import { subscribeCompletedActivities } from '../../strava/stravaClient'

export function useCompletedActivities(selectedAthleteId) {
  const [activities, setActivities] = useState([])

  useEffect(() => {
    if (!selectedAthleteId) {
      setActivities([])
      return
    }
    const unsub = subscribeCompletedActivities(selectedAthleteId, setActivities)
    return unsub
  }, [selectedAthleteId])

  return activities
}

export function useWeekWorkouts(selectedAthleteId, currentWeek, currentYear) {
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedAthleteId) {
      setWorkouts([])
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query(
      collection(db, 'workouts'),
      where('athleteId', '==', selectedAthleteId),
      where('year', '==', currentYear),
      where('week', '==', currentWeek)
    )
    const unsub = onSnapshot(
      q,
      snap => {
        const docs = snap.docs
          .map(d => normalizeWorkout({ id: d.id, ...d.data() }))
          .sort(compareWorkoutsBySchedule)
        setWorkouts(docs)
        setLoading(false)
      },
      err => {
        console.error('useWeekWorkouts listen error:', err)
        setWorkouts([])
        setLoading(false)
      }
    )
    return unsub
  }, [currentWeek, currentYear, selectedAthleteId])

  return { workouts, loading }
}

export function useWeeklyRangeWorkouts(selectedAthleteId, weeks, weekKeys) {
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)

  // weeks/weekKeys are recreated on every parent render; depend on a stable
  // primitive of their content so the listener only re-subscribes when the
  // actual week range changes.
  const weekKeysSignature = useMemo(
    () => Array.from(weekKeys).sort().join(','),
    [weekKeys],
  )

  useEffect(() => {
    if (!selectedAthleteId) {
      setWorkouts([])
      setLoading(false)
      return
    }
    setLoading(true)
    setWorkouts([])
    return subscribeToWorkoutWeeks({
      athleteId: selectedAthleteId,
      weeks,
      filterWorkout: workout => weekKeys.has(getWeekKey(workout.week, workout.year)),
      onData: (nextWorkouts, isReady) => {
        setWorkouts(nextWorkouts)
        if (isReady) setLoading(false)
      },
      onError: err => {
        console.error('useWeeklyRangeWorkouts listen error:', err)
        setLoading(false)
      },
    })
    // weeks/weekKeys read inside but excluded; weekKeysSignature tracks content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKeysSignature, selectedAthleteId])

  return { workouts, loading }
}

export function useCoachTemplates(ownerId) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    if (!ownerId) {
      setTemplates([])
      setLoading(false)
      return
    }
    const unsub = onSnapshot(
      query(collection(db, 'templates'), where('ownerId', '==', ownerId)),
      snap => {
        const customTemplates = snap.docs
          .map(d => normalizeWorkout({ id: d.id, ...d.data() }))
          .sort(sortTemplates)
        setTemplates(customTemplates)
        setLoading(false)
      },
      err => {
        console.error('useCoachTemplates listen error:', err)
        setTemplates([])
        setLoading(false)
      },
    )
    return unsub
  }, [ownerId])

  return { templates, loading }
}

export function useGlobalTemplates(ownerId) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    if (!ownerId) {
      setTemplates([])
      setLoading(false)
      return
    }
    const unsub = onSnapshot(
      collection(db, 'globalTemplates'),
      snap => {
        const items = snap.docs
          .map(d => normalizeWorkout({ id: d.id, ...d.data(), source: 'global' }))
          .sort(sortTemplates)
        setTemplates(items)
        setLoading(false)
      },
      err => {
        console.error('useGlobalTemplates listen error:', err)
        setTemplates([])
        setLoading(false)
      },
    )
    return unsub
  }, [ownerId])

  return { templates, loading }
}
