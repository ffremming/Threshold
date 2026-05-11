import { migrateWorkoutType, normalizeIntensityZone, normalizeIntensityZones } from './intensity'

export const LOAD_TAGS = [
  { value: 'low', label: 'Lav load', shortLabel: 'Lav', color: '#166534', bg: '#dcfce7' },
  { value: 'medium', label: 'Moderat load', shortLabel: 'Moderat', color: '#9a3412', bg: '#ffedd5' },
  { value: 'high', label: 'Høy load', shortLabel: 'Høy', color: '#991b1b', bg: '#fee2e2' },
]

export const LOAD_TAG_MAP = Object.fromEntries(LOAD_TAGS.map(tag => [tag.value, tag]))

export function parseDistanceValue(distance) {
  if (typeof distance !== 'string') return null
  const match = distance.replace(',', '.').match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

export function getWorkoutDistance(workout) {
  return parseDistanceValue(workout?.distance)
}

export function getWeeklyDistance(workouts) {
  return workouts.reduce((sum, workout) => {
    const distance = getWorkoutDistance(workout)
    return distance === null ? sum : sum + distance
  }, 0)
}

export function parseDurationFromText(value) {
  if (!value || typeof value !== 'string') return 0
  const hourMatch = value.match(/(\d+(?:[.,]\d+)?)\s*(t|h|time|timer)/i)
  const minuteMatch = value.match(/(\d+(?:[.,]\d+)?)\s*(m|min|mins|minutter)/i)
  const hours = hourMatch ? Number(hourMatch[1].replace(',', '.')) * 60 : 0
  const minutes = minuteMatch ? Number(minuteMatch[1].replace(',', '.')) : 0
  return Math.round(hours + minutes)
}

export function estimateWorkoutDuration(workout) {
  const explicitDuration =
    parseDurationFromText(workout?.notes) ||
    parseDurationFromText(workout?.sessionDetails) ||
    parseDurationFromText(workout?.description) ||
    parseDurationFromText(workout?.title)

  if (explicitDuration > 0) return explicitDuration

  const distance = getWorkoutDistance(workout)
  if (!distance) return 0

  if (workout?.activityTag === 'bike') return Math.round(distance * 2.7)
  if (workout?.activityTag === 'swim') return Math.round(distance * 20)
  if (workout?.activityTag === 'xc_skiing') return Math.round(distance * 4.8)
  if (workout?.activityTag === 'walking') return Math.round(distance * 12)
  return Math.round(distance * 6)
}

export function getWorkoutIntensityFactor(workout) {
  const zones = normalizeIntensityZones(workout?.type, workout?.intensityZone)
  const peakZone = zones.length > 0 ? Math.max(...zones) : 2
  const typeBoost = migrateWorkoutType(workout?.type) === 'interval' ? 0.45 : 0
  return Number((0.75 + peakZone * 0.35 + typeBoost).toFixed(2))
}

export function estimateWorkoutLoad(workout) {
  const duration = estimateWorkoutDuration(workout)
  const intensityFactor = getWorkoutIntensityFactor(workout)
  return Math.round(duration * intensityFactor)
}

export function estimateMechanicalLoad(workout) {
  const duration = estimateWorkoutDuration(workout)
  const distance = getWorkoutDistance(workout) || 0
  const zoneFactor = normalizeIntensityZone(workout?.type, workout?.intensityZone) || 2
  const activityFactorMap = {
    run: 1.15,
    strength: 0.9,
    bike: 0.55,
    swim: 0.35,
    xc_skiing: 0.75,
    walking: 0.5,
  }
  const activityFactor = activityFactorMap[workout?.activityTag] || 0.7
  return Math.round(distance * 9 * activityFactor + duration * 0.18 * zoneFactor)
}

export function formatDurationLabel(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0m'
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}t ${remainingMinutes}m` : `${hours}t`
  }
  return `${minutes}m`
}

export function isHardWorkout(workout) {
  const topZone = normalizeIntensityZone(workout?.type, workout?.intensityZone) || 0
  return migrateWorkoutType(workout?.type) === 'interval' || topZone >= 3
}

export function formatKmValue(value) {
  if (!Number.isFinite(value) || value <= 0) return '0 km'
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(1))
  return `${rounded} km`
}

export function getDefaultLoadTag(type, intensityZone) {
  const migrated = migrateWorkoutType(type)
  const peakZone = normalizeIntensityZone(migrated, intensityZone) || 0
  if (migrated === 'interval' || peakZone >= 5) return 'high'
  if (peakZone >= 3) return 'medium'
  return 'low'
}

export function normalizeLoadTag(type, intensityZone, loadTag) {
  if (LOAD_TAG_MAP[loadTag]) return loadTag
  return getDefaultLoadTag(type, intensityZone)
}
