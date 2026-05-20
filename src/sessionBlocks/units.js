const PACE_ACTIVITIES = new Set(['run', 'walking', 'trail_run', 'xc_skiing', 'trail'])
export const SPEED_ACTIVITIES = new Set([
  'bike', 'mtb', 'gravel', 'road_bike', 'spinning',
  'swim', 'openwater', 'openwater_swim', 'rowing', 'kayak', 'sup',
  'inline_skate', 'inline', 'roller_ski', 'skating', 'triathlon',
])

// Activities that are measured by sets/reps/load and effort/duration —
// NOT by distance or pace. Strength sessions must never show km/pace fields.
export const STRENGTH_ACTIVITIES = new Set([
  'strength', 'calisthenics', 'plyometric', 'crossfit',
])

// Activities that are time-based but neither distance nor strength
// (e.g. mobility, ball sports). They use duration only.
const DURATION_ONLY_ACTIVITIES = new Set([
  'yoga', 'pilates', 'mobility', 'dance',
])

/**
 * Returns the measurement domain for an activity:
 *  - 'distance': distance + pace/speed (run, bike, swim, …)
 *  - 'strength': sets / reps / load (styrke, calisthenics, crossfit, …)
 *  - 'duration': duration only (yoga, mobility, ball sports, …)
 */
export function getSessionDomain(activityTag) {
  if (STRENGTH_ACTIVITIES.has(activityTag)) return 'strength'
  if (PACE_ACTIVITIES.has(activityTag) || SPEED_ACTIVITIES.has(activityTag)) return 'distance'
  if (DURATION_ONLY_ACTIVITIES.has(activityTag)) return 'duration'
  // Unknown / no tag: default to distance to preserve existing behaviour.
  return 'distance'
}

export function getSpeedUnitForActivity(activityTag) {
  if (PACE_ACTIVITIES.has(activityTag)) return 'pace'
  if (SPEED_ACTIVITIES.has(activityTag)) return 'kmh'
  return 'pace'
}

export function paceToSpeed(paceSecPerKm) {
  if (!paceSecPerKm || paceSecPerKm <= 0) return 0
  return Number((3600 / paceSecPerKm).toFixed(2))
}

export function speedToPace(speedKmh) {
  if (!speedKmh || speedKmh <= 0) return 0
  return Math.round(3600 / speedKmh)
}

const ESTIMATED_SPEEDS_KMH = {
  run: 11,
  walking: 5.5,
  trail_run: 9,
  xc_skiing: 14,
  bike: 28,
  mtb: 18,
  gravel: 24,
  spinning: 24,
  swim: 3.5,
  rowing: 9,
  kayak: 8,
  strength: 0,
}

export function estimatedSpeedKmh(activityTag) {
  return ESTIMATED_SPEEDS_KMH[activityTag] || 10
}
