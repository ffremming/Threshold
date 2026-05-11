export const ZONE_COLORS = {
  1: { bg: '#e8f4fd', border: '#90caf9', text: '#1565c0', label: 'Sone 1' },
  2: { bg: '#e8f8e8', border: '#81c784', text: '#2e7d32', label: 'Sone 2' },
  3: { bg: '#fffde7', border: '#fff176', text: '#f57f17', label: 'Sone 3' },
  4: { bg: '#fff3e0', border: '#ffb74d', text: '#e65100', label: 'Sone 4' },
  5: { bg: '#fce4ec', border: '#f48fb1', text: '#880e4f', label: 'Sone 5' },
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
  { value: 'interval', label: 'Intervall' },
  { value: 'continuous', label: 'Kontinuerlig' },
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
  1: { hr: '118–154', rpe: 'Veldig lett', breathing: 'Kan prate uanstrengt' },
  2: { hr: '155–176', rpe: 'Nokså lett', breathing: 'Kan si lengre setninger relativt uanstrengt' },
  3: { hr: '177–187', rpe: 'Behagelig anstrengende', breathing: 'Kan si korte setninger' },
  4: { hr: '188–197', rpe: 'Anstrengende', breathing: 'Kan si noen ord eller svært korte setninger' },
  5: { hr: '198–215', rpe: 'Veldig anstrengende', breathing: 'Kan kun si ett ord eller to, samtidig som man puster tungt' },
}

export function hasIntensityZone(_type) {
  return true
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
  if (zones.length === 1) return `Sone ${zones[0]}`
  const contiguous = zones.every((zone, index) => index === 0 || zone === zones[index - 1] + 1)
  if (contiguous) return `Sone ${zones[0]}-${zones[zones.length - 1]}`
  return `Sone ${zones.join(', ')}`
}
