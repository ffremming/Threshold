import { getSessionDomain } from '../sessionBlocks/units'

// Intensity-zone palette: white (lightest) → blue → green → yellow → red.
// Zone 1 is a very light grey so it reads as "white" yet stays visible on
// white surfaces. `border` is the main accent color used for bars/dots/borders.
export const ZONE_COLORS = {
  1: { bg: '#f8fafc', border: '#e2e8f0', text: '#475569', label: 'Zone 1' },
  2: { bg: '#e8f1fd', border: '#7dabf8', text: '#1e40af', label: 'Zone 2' },
  3: { bg: '#e8f8ec', border: '#6dd99a', text: '#166534', label: 'Zone 3' },
  4: { bg: '#fffbe6', border: '#f0c94f', text: '#854d0e', label: 'Zone 4' },
  5: { bg: '#fde8e8', border: '#f08080', text: '#991b1b', label: 'Zone 5' },
}

export const TYPE_COLORS = {
  rolig:    { bg: '#dbeafe', border: '#60a5fa', text: '#1e40af' },
  molle:    { bg: '#dbeafe', border: '#60a5fa', text: '#1e40af' },
  terskel:  { bg: '#dcfce7', border: '#4ade80', text: '#166534' },
  interval: { bg: '#ffedd5', border: '#fb923c', text: '#9a3412' },
  styrke:   { bg: '#fce7f3', border: '#f472b6', text: '#9d174d' },
  annet:    { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' },
}

export const WORKOUT_TYPES = [
  { value: 'interval', label: 'Interval' },
  { value: 'continuous', label: 'Continuous' },
]

const LEGACY_TYPE_MAP = {
  terskel: 'interval',
  rolig: 'continuous',
  styrke: 'continuous',
  molle: 'continuous',
  annet: 'continuous',
}

export function migrateWorkoutType(type) {
  if (!type) return 'continuous'
  if (type === 'interval' || type === 'continuous') return type
  return LEGACY_TYPE_MAP[type] || 'continuous'
}

export const TYPE_ICONS = {
  interval: 'interval',
  continuous: 'rolig',
}

export const ZONE_INFO = {
  1: { hr: '118–154', rpe: 'Very easy', breathing: 'Can talk effortlessly' },
  2: { hr: '155–176', rpe: 'Fairly easy', breathing: 'Can say longer sentences relatively effortlessly' },
  3: { hr: '177–187', rpe: 'Comfortably hard', breathing: 'Can say short sentences' },
  4: { hr: '188–197', rpe: 'Hard', breathing: 'Can say a few words or very short sentences' },
  5: { hr: '198–215', rpe: 'Very hard', breathing: 'Can only say one or two words while breathing heavily' },
}

export function hasIntensityZone(_type) {
  return true
}

// Strength sessions are sets/reps/load based and have no aerobic intensity
// zone. This is the single source of truth used by every zone display site to
// decide whether a workout shows a zone color/label/bar at all.
export function workoutHasZones(activityTag) {
  return getSessionDomain(activityTag) !== 'strength'
}

// Border-colors for a set of zones, in zone order. Falls back to a neutral
// grey when no zones resolve.
export function getZoneBorderColors(zones) {
  const colors = (zones || [])
    .map(zone => ZONE_COLORS[zone]?.border)
    .filter(Boolean)
  return colors.length > 0 ? colors : ['#94a3b8']
}

// CSS background-image for a session's color accent. Always a gradient so it is
// a valid `background-image` value (a bare color keyword would not paint). One
// zone → a solid band of that color; multiple zones → equal hard-stop bands of
// each zone's color, top-to-bottom.
export function getZoneBarBackground(zones) {
  const colors = getZoneBorderColors(zones)
  const step = 100 / colors.length
  const stops = colors
    .map((color, index) => `${color} ${index * step}%, ${color} ${(index + 1) * step}%`)
    .join(', ')
  return `linear-gradient(to bottom, ${stops})`
}

export function getAllowedIntensityZones(type) {
  const migrated = migrateWorkoutType(type)
  if (migrated === 'interval') return [3, 4, 5]
  return [1, 2, 3, 4]
}

export function getDefaultIntensityZones(type) {
  return migrateWorkoutType(type) === 'interval' ? [3] : [2]
}

export function normalizeIntensityZones(type, intensityZone) {
  const allowedZones = getAllowedIntensityZones(type)
  if (allowedZones.length === 0) return []

  const rawZones = Array.isArray(intensityZone)
    ? intensityZone
    : typeof intensityZone === 'string'
      ? (intensityZone.match(/[1-5]/g) || []).map(Number)
      : intensityZone == null
        ? []
        : [Number(intensityZone)]

  const normalized = [...new Set(
    rawZones.map(Number).filter(zone => allowedZones.includes(zone))
  )].sort((a, b) => a - b)

  return normalized.length > 0 ? normalized : getDefaultIntensityZones(type)
}

export function normalizeIntensityZone(type, intensityZone) {
  const zones = normalizeIntensityZones(type, intensityZone)
  return zones.length > 0 ? zones[zones.length - 1] : null
}

export function formatIntensityZoneLabel(zones) {
  if (!zones || zones.length === 0) return null
  if (zones.length === 1) return `Zone ${zones[0]}`
  const contiguous = zones.every((zone, index) => index === 0 || zone === zones[index - 1] + 1)
  if (contiguous) return `Zone ${zones[0]}-${zones[zones.length - 1]}`
  return `Zone ${zones.join(', ')}`
}
