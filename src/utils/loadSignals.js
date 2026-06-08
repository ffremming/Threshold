import {
  estimateMechanicalLoad,
  estimateWorkoutDuration,
  estimateWorkoutLoad,
  getWorkoutDistance,
  isHardWorkout,
  normalizeIntensityZones,
} from './index'
import { computeWeekSummary } from './weekSummary'
import { averageLastValues, safeDivide } from './seriesMath'

// Per-week enriched stats: totals, per-activity, per-zone, daily breakdown.
// Past weeks count only completed sessions (planned-but-skipped shouldn't
// inflate historical load). One source of truth shared by the AnalysisDashboard
// and the month-view load signals.
export function buildWeekStats(week, workoutsByWeekKey, currentWeek, currentYear, activeTagFilter = null) {
  let weekWorkouts = workoutsByWeekKey[week.key] || []

  const isPastWeek = week.year < currentYear || (week.year === currentYear && week.week < currentWeek)
  if (isPastWeek) {
    weekWorkouts = weekWorkouts.filter(workout => workout.completed)
  }

  if (activeTagFilter) {
    weekWorkouts = weekWorkouts.filter(workout => workout.activityTag === activeTagFilter)
  }

  const summary = computeWeekSummary(weekWorkouts)

  const dailyLoads = Array(7).fill(0)
  const dailyDurations = Array(7).fill(0)
  const tags = {}
  const zoneLoads = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

  const workouts = weekWorkouts.map(workout => {
    const duration = estimateWorkoutDuration(workout)
    const load = estimateWorkoutLoad(workout)
    const distance = getWorkoutDistance(workout) || 0
    const mechanicalLoad = estimateMechanicalLoad(workout)
    const normalizedZones = normalizeIntensityZones(workout.type, workout.intensityZone)
    const weekdayIndex = Math.max(0, Math.min(6, Number(workout.weekday || 1) - 1))
    const activityTag = workout.activityTag || 'unknown'

    dailyLoads[weekdayIndex] += load
    dailyDurations[weekdayIndex] += duration
    tags[activityTag] = (tags[activityTag] || 0) + 1

    if (normalizedZones.length > 0 && duration > 0) {
      const zoneLoadShare = load / normalizedZones.length
      normalizedZones.forEach(zone => {
        zoneLoads[zone] += zoneLoadShare
      })
    }

    return { ...workout, duration, load, distance, mechanicalLoad, normalizedZones, activityTag }
  })

  const hardSessions = workouts.filter(isHardWorkout).length
  const mechanicalLoad = workouts.reduce((sum, w) => sum + w.mechanicalLoad, 0)
  const longestSession = workouts.reduce((longest, workout) => {
    if (!longest || workout.duration > longest.duration) return workout
    return longest
  }, null)

  return {
    week, workouts, count: workouts.length,
    distance: summary.totalDistance,
    duration: summary.totalDuration,
    load: summary.totalLoad,
    mechanicalLoad,
    hardSessions, easySessions: Math.max(0, workouts.length - hardSessions),
    zones: summary.zones,
    zoneLoads,
    tags,
    activityLoad: summary.activityLoad,
    activityDuration: summary.activityDuration,
    activityDistance: summary.activityDistance,
    dailyLoads, dailyDurations, longestSession,
  }
}

// ACWR readiness bands. Boundaries are inclusive on the lower-risk side:
// exactly 1.3 is safe, exactly 1.5 is caution. A ratio of 0 / non-finite means
// there is no chronic baseline yet — caller treats that as "settling".
export function classifyAcwr(acwr) {
  if (!Number.isFinite(acwr) || acwr <= 0) return null
  if (acwr < 0.8) return 'undertraining'
  if (acwr <= 1.3) return 'safe'
  if (acwr <= 1.5) return 'caution'
  return 'spike'
}

// Compute per-week load signals across the full chronological `weeks` series.
// ACWR's chronic load is a 6-week trailing average, so signals must be derived
// from the whole series in order — never per-row in isolation. Returns a map
// keyed by week.key: { load, rampPct, acuteLoad, chronicLoad, acwr, readiness,
// settling }.
//   - rampPct: week-over-week load change % vs the immediately preceding week;
//     null when there is no previous week or the previous load is 0.
//   - acwr: acute(3wk avg) / chronic(6wk avg); 0 when no chronic baseline.
//   - readiness: classifyAcwr(acwr) band, or null while settling.
//   - settling: true until 6 weeks of history exist (low-confidence ACWR).
const CHRONIC_WEEKS = 6
const ACUTE_WEEKS = 3

export function computeWeekSignals(weeks, workoutsByWeekKey, currentWeek, currentYear) {
  const stats = weeks.map(week =>
    buildWeekStats(week, workoutsByWeekKey, currentWeek, currentYear))
  const loadSeries = stats.map(s => s.load)

  const signals = {}
  stats.forEach((s, index) => {
    const load = s.load
    const prevLoad = index > 0 ? loadSeries[index - 1] : null
    const rampPct = prevLoad && prevLoad > 0
      ? ((load - prevLoad) / prevLoad) * 100
      : null

    const acuteLoad = averageLastValues(loadSeries, ACUTE_WEEKS, index)
    const chronicLoad = averageLastValues(loadSeries, CHRONIC_WEEKS, index)
    const acwr = safeDivide(acuteLoad, chronicLoad)
    const settling = index + 1 < CHRONIC_WEEKS
    const readiness = settling ? null : classifyAcwr(acwr)

    signals[s.week.key] = { load, rampPct, acuteLoad, chronicLoad, acwr, readiness, settling }
  })

  return signals
}

// Per-week series for the planner trend chart: one ordered entry per week with
// the metrics the chart can switch between. Same source of truth as the badges
// (buildWeekStats) so the chart and the per-week signals never disagree.
export function computeWeekSeries(weeks, workoutsByWeekKey, currentWeek, currentYear) {
  return weeks.map(week => {
    const stats = buildWeekStats(week, workoutsByWeekKey, currentWeek, currentYear)
    return {
      key: week.key,
      week: week.week,
      year: week.year,
      label: `W${week.week}`,
      distance: stats.distance,
      duration: stats.duration,
      load: stats.load,
    }
  })
}
