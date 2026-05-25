import { useMemo } from 'react'
import { compareWorkoutsBySchedule, groupWorkoutsByWeekday } from '../../utils'

export function useWeekData({ workouts }) {
  const sortedWorkouts = useMemo(() => (
    [...workouts].sort(compareWorkoutsBySchedule)
  ), [workouts])

  const groupedWorkouts = useMemo(() => (
    groupWorkoutsByWeekday(sortedWorkouts)
  ), [sortedWorkouts])

  return { sortedWorkouts, groupedWorkouts }
}
