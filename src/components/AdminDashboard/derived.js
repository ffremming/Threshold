import { compareWorkoutsBySchedule, getWeekKey, groupWorkoutsByWeekday } from '../../utils'

export function deriveAdminState({
  workouts, overviewWorkouts, analysisWorkouts,
  activeTagFilter, athletes, selectedAthleteId, userProfile,
}) {
  const filteredWorkouts = workouts
    .filter(workout => !activeTagFilter || workout.activityTag === activeTagFilter)
    .sort(compareWorkoutsBySchedule)
  const groupedWorkouts = groupWorkoutsByWeekday(filteredWorkouts)
  const overviewWorkoutsByWeekKey = overviewWorkouts.reduce((acc, workout) => {
    const key = getWeekKey(workout.week, workout.year)
    if (!acc[key]) acc[key] = []
    acc[key].push(workout)
    return acc
  }, {})
  const analysisWorkoutsByWeekKey = analysisWorkouts.reduce((acc, workout) => {
    const key = getWeekKey(workout.week, workout.year)
    if (!acc[key]) acc[key] = []
    acc[key].push(workout)
    return acc
  }, {})
  const selectedAthleteName = athletes.find(a => a.uid === selectedAthleteId)?.displayName
    || (selectedAthleteId === userProfile?.uid ? userProfile?.displayName : null)
  return {
    filteredWorkouts,
    groupedWorkouts,
    overviewWorkoutsByWeekKey,
    analysisWorkoutsByWeekKey,
    selectedAthleteName,
  }
}
