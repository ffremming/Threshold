import { getWeekNumber } from '../utils/week'

// ISO-week-year for a date (can differ from calendar year near Jan 1 / Dec 31).
// Uses the same Thursday-shift as getWeekNumber so week+year stay consistent.
function isoWeekYear(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  return d.getUTCFullYear()
}

// sport_type → app activityTag. Extend as needed.
const SPORT_TO_TAG = {
  Run: 'run', TrailRun: 'run', VirtualRun: 'run',
  Ride: 'bike', VirtualRide: 'bike', MountainBikeRide: 'bike', GravelRide: 'bike',
  Swim: 'swim',
  NordicSki: 'xc_skiing', BackcountrySki: 'xc_skiing',
  Walk: 'walking', Hike: 'walking',
}

function tagFor(sportType) {
  return SPORT_TO_TAG[sportType] || 'run'
}

// 1-based index of the HR-zone bucket with the most time, or null.
export function dominantHrZone(zones) {
  if (!Array.isArray(zones)) return null
  const hr = zones.find(z => z.type === 'heartrate')
  const buckets = hr?.distribution_buckets
  if (!Array.isArray(buckets) || buckets.length === 0) return null
  let bestIdx = 0
  for (let i = 1; i < buckets.length; i++) {
    if ((buckets[i].time || 0) > (buckets[bestIdx].time || 0)) bestIdx = i
  }
  // Clamp into the 1–5 zone space the app uses.
  return Math.min(5, bestIdx + 1)
}

export function stravaActivityToWorkoutShape(activity) {
  const seconds = activity.startDate?.seconds || 0
  const date = new Date(seconds * 1000)
  const minutes = Math.round((activity.movingTime || 0) / 60)
  const km = (activity.distance || 0) / 1000
  const zone = dominantHrZone(activity.zones)
  // JS getDay(): 0=Sun..6=Sat. App weekday: 1=Mon..7=Sun.
  const jsDay = date.getDay()
  const weekday = jsDay === 0 ? 7 : jsDay

  return {
    id: activity.id,
    source: 'strava',
    activityTag: tagFor(activity.type),
    type: 'rolig',                         // base type; intensityZone drives load
    title: activity.name || activity.type || 'Strava activity',
    distance: km > 0 ? `${km.toFixed(1)} km` : '',
    notes: minutes > 0 ? `${minutes} min` : '',
    intensityZone: zone ? [zone] : [],
    week: getWeekNumber(date),
    year: isoWeekYear(date),
    weekday,
    completed: true,
    laps: activity.laps || [],
    zones: activity.zones || null,
  }
}

function matchKey(w) {
  return `${w.year}-${w.week}-${w.weekday}-${w.activityTag}`
}

// Past-week source-of-truth: a Strava activity replaces a planned workout that
// matches on (year, week, weekday, activityTag). Unmatched planned workouts stay.
export function mergeStravaIntoAnalysis(plannedWorkouts, stravaWorkouts) {
  const stravaKeys = new Set(stravaWorkouts.map(matchKey))
  const keptPlanned = plannedWorkouts.filter(w => !stravaKeys.has(matchKey(w)))
  return [...keptPlanned, ...stravaWorkouts]
}
