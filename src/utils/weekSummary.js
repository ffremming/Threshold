import { estimateWorkoutDuration, estimateWorkoutLoad, getWorkoutDistance } from './load'
import { normalizeIntensityZones } from './intensity'

// Pure: turn a week's workouts into totals + per-activity + per-zone breakdowns.
// Counts ALL provided workouts (no completion/past-week filtering — that stays
// in the analysis dashboard). Zone minutes split a workout's duration evenly
// across its normalized zones, matching buildWeekStats.
export function computeWeekSummary(workouts) {
  const activityDuration = {}
  const activityDistance = {}
  const activityLoad = {}
  const zones = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

  let totalDuration = 0
  let totalDistance = 0
  let totalLoad = 0

  for (const workout of workouts || []) {
    const duration = estimateWorkoutDuration(workout)
    const load = estimateWorkoutLoad(workout)
    const distance = getWorkoutDistance(workout) || 0
    const normalizedZones = normalizeIntensityZones(workout.type, workout.intensityZone)
    const tag = workout.activityTag || 'unknown'

    totalDuration += duration
    totalDistance += distance
    totalLoad += load

    activityDuration[tag] = (activityDuration[tag] || 0) + duration
    activityLoad[tag] = (activityLoad[tag] || 0) + load
    if (distance > 0) activityDistance[tag] = (activityDistance[tag] || 0) + distance

    if (normalizedZones.length > 0 && duration > 0) {
      const share = duration / normalizedZones.length
      normalizedZones.forEach(zone => { zones[zone] += share })
    }
  }

  return {
    count: (workouts || []).length,
    totalDuration,
    totalDistance,
    totalLoad,
    activityDuration,
    activityDistance,
    activityLoad,
    zones,
  }
}
