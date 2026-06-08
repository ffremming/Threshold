import { estimateWorkoutDuration, estimateWorkoutLoad, getWorkoutDistance } from './load'
import {
  computeSessionTotals, hasStructuredBlocks, getSections, computeSectionWorkMinutes,
} from '../sessionBlocks'

// Duration (minutes) for a session: sum of all its block parts when the session
// has structured blocks; otherwise fall back to the text/distance estimator.
export function sessionDuration(workout) {
  if (hasStructuredBlocks(workout)) {
    return computeSessionTotals(workout.blocks, workout.activityTag).totalDuration
  }
  return estimateWorkoutDuration(workout)
}

// Distance (km) for a session: sum of all its block parts when the session has
// structured blocks; otherwise fall back to the workout's distance field.
export function sessionDistance(workout) {
  if (hasStructuredBlocks(workout)) {
    return computeSessionTotals(workout.blocks, workout.activityTag).totalDistance
  }
  return getWorkoutDistance(workout) || 0
}

// The session's tagged work zones, as raw 1–5 numbers (deduped, sorted).
// Returns [] when nothing is tagged (so no minutes are invented). Reads the raw
// tags — does NOT inject type-based defaults.
function sessionWorkZones(workout) {
  const raw = workout?.intensityZone
  const list = Array.isArray(raw) ? raw : (raw == null ? [] : [raw])
  const nums = list.map(Number).filter(z => z >= 1 && z <= 5)
  return [...new Set(nums)].sort((a, b) => a - b)
}

// Per-zone minutes for ONE session, aggregated from its actual blocks:
//   - warmup / cooldown blocks → always zone 1 (full block duration)
//   - work blocks (interval / steady / effort / exercise / sprint) → split
//     evenly across the session's tagged zones (2 zones → half each, 3 → a
//     third each); intervals count only rep work time (pauses excluded)
// Sessions with no structured blocks, or no tagged zone for the work portion,
// contribute nothing for that portion (no invented defaults).
export function sessionZoneMinutes(workout) {
  const zones = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  if (!hasStructuredBlocks(workout)) return zones
  const sections = getSections(workout.blocks, workout.activityTag)
  const workZones = sessionWorkZones(workout)

  for (const section of sections) {
    if (section.kind === 'warmup' || section.kind === 'cooldown') {
      zones[1] += computeSectionWorkMinutes(section, workout.activityTag)
    } else if (workZones.length > 0) {
      const share = computeSectionWorkMinutes(section, workout.activityTag) / workZones.length
      workZones.forEach(z => { zones[z] += share })
    }
  }
  return zones
}

// Pure: turn a week's workouts into totals + per-activity + per-zone breakdowns.
// Counts ALL provided workouts (no completion/past-week filtering — that stays
// in the analysis dashboard). Duration and distance come directly from the sum
// of each session's block parts (with an estimator fallback for legacy sessions
// that have no structured blocks). Zone minutes are aggregated per block via
// sessionZoneMinutes (warmup/cooldown → Z1, work blocks → session peak zone,
// interval rest excluded).
export function computeWeekSummary(workouts) {
  const activityDuration = {}
  const activityDistance = {}
  const activityLoad = {}
  const zones = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

  let totalDuration = 0
  let totalDistance = 0
  let totalLoad = 0

  for (const workout of workouts || []) {
    const duration = sessionDuration(workout)
    const load = estimateWorkoutLoad(workout)
    const distance = sessionDistance(workout)
    const tag = workout.activityTag || 'unknown'

    totalDuration += duration
    totalDistance += distance
    totalLoad += load

    activityDuration[tag] = (activityDuration[tag] || 0) + duration
    activityLoad[tag] = (activityLoad[tag] || 0) + load
    if (distance > 0) activityDistance[tag] = (activityDistance[tag] || 0) + distance

    // Zone minutes aggregated from the session's actual blocks (warmup/cooldown
    // → Z1; work blocks → session peak zone; interval rest excluded).
    const sessionZones = sessionZoneMinutes(workout)
    for (let z = 1; z <= 5; z++) zones[z] += sessionZones[z]
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
