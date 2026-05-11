import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import {
  compareWorkoutsBySchedule,
  getWeekKey,
  normalizeWorkout,
} from '../../utils'
import { sortTemplates } from '../../templateLibrary'
import { subscribeToWorkoutWeeks } from '../../workoutSubscriptions'

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
      () => {
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
      onError: () => setLoading(false),
    })
  }, [weekKeys, weeks, selectedAthleteId])

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
      }
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
      () => {
        setTemplates([])
        setLoading(false)
      }
    )
    return unsub
  }, [ownerId])

  return { templates, loading }
}
