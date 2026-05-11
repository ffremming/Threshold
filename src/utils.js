export function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

export function getISOWeeksInYear(year) {
  const dec28 = new Date(Date.UTC(year, 11, 28))
  return getWeekNumber(dec28)
}

export function getWeekDates(week, year) {
  const jan4 = new Date(year, 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const monday = new Date(startOfWeek1)
  monday.setDate(startOfWeek1.getDate() + (week - 1) * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { monday, sunday }
}

export function getAdjacentWeek(week, year, direction) {
  if (direction < 0) {
    if (week === 1) {
      const previousYear = year - 1
      return { week: getISOWeeksInYear(previousYear), year: previousYear }
    }

    return { week: week - 1, year }
  }

  const weeksInYear = getISOWeeksInYear(year)
  if (week >= weeksInYear) {
    return { week: 1, year: year + 1 }
  }

  return { week: week + 1, year }
}

export function getWeekSequence(startWeek, startYear, count) {
  const weeks = []
  let cursor = { week: startWeek, year: startYear }

  for (let index = 0; index < count; index += 1) {
    const { monday, sunday } = getWeekDates(cursor.week, cursor.year)
    weeks.push({
      week: cursor.week,
      year: cursor.year,
      monday,
      sunday,
      key: `${cursor.year}-${String(cursor.week).padStart(2, '0')}`,
    })
    cursor = getAdjacentWeek(cursor.week, cursor.year, 1)
  }

  return weeks
}

export function getWeekWindow(centerWeek, centerYear, beforeCount, afterCount) {
  const weeks = []
  let start = { week: centerWeek, year: centerYear }

  for (let index = 0; index < beforeCount; index += 1) {
    start = getAdjacentWeek(start.week, start.year, -1)
  }

  let cursor = start
  const totalCount = beforeCount + afterCount + 1

  for (let index = 0; index < totalCount; index += 1) {
    const { monday, sunday } = getWeekDates(cursor.week, cursor.year)
    weeks.push({
      week: cursor.week,
      year: cursor.year,
      monday,
      sunday,
      key: `${cursor.year}-${String(cursor.week).padStart(2, '0')}`,
    })
    cursor = getAdjacentWeek(cursor.week, cursor.year, 1)
  }

  return weeks
}

export function getWeekKey(week, year) {
  return `${year}-${String(week).padStart(2, '0')}`
}

export function chunkArray(items, size) {
  if (!Array.isArray(items) || items.length === 0) return []
  const chunkSize = Math.max(1, Number(size) || 1)
  const chunks = []

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }

  return chunks
}

export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Mandag', shortLabel: 'Man' },
  { value: 2, label: 'Tirsdag', shortLabel: 'Tir' },
  { value: 3, label: 'Onsdag', shortLabel: 'Ons' },
  { value: 4, label: 'Torsdag', shortLabel: 'Tor' },
  { value: 5, label: 'Fredag', shortLabel: 'Fre' },
  { value: 6, label: 'Lørdag', shortLabel: 'Lør' },
  { value: 7, label: 'Søndag', shortLabel: 'Søn' },
]

export function formatDateForStorage(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function getDateForWeekday(week, year, weekday) {
  const normalizedWeekday = normalizeWeekday(weekday)
  const { monday } = getWeekDates(week, year)
  const date = new Date(monday)
  date.setDate(monday.getDate() + normalizedWeekday - 1)
  return date
}

export function getDateStringForWeekday(week, year, weekday) {
  if (!week || !year) return ''
  return formatDateForStorage(getDateForWeekday(week, year, weekday))
}

export function getWeekdayMeta(weekday) {
  return WEEKDAY_OPTIONS.find(option => option.value === normalizeWeekday(weekday)) || WEEKDAY_OPTIONS[0]
}

export function normalizeWeekday(weekday) {
  const parsed = Number(weekday)
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 7) return parsed
  return 1
}

export function getWeekdayFromDate(dateValue) {
  if (!dateValue) return null
  const [year, month, day] = String(dateValue).split('-').map(Number)
  if (!year || !month || !day) return null

  const jsWeekday = new Date(year, month - 1, day).getDay()
  return jsWeekday === 0 ? 7 : jsWeekday
}

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

function getWeekOffsetFromAnchor(targetWeek, targetYear, anchorWeek, anchorYear) {
  if (targetYear === anchorYear) {
    return targetWeek - anchorWeek
  }

  let offset = 0

  if (targetYear > anchorYear) {
    offset += getISOWeeksInYear(anchorYear) - anchorWeek
    for (let year = anchorYear + 1; year < targetYear; year += 1) {
      offset += getISOWeeksInYear(year)
    }
    offset += targetWeek
    return offset
  }

  offset -= anchorWeek
  for (let year = anchorYear - 1; year > targetYear; year -= 1) {
    offset -= getISOWeeksInYear(year)
  }
  offset -= getISOWeeksInYear(targetYear) - targetWeek
  return offset
}

export function getWeeklyProgressionTarget(
  week,
  year,
  startingDistance = 17,
  growthFactor = 1.07,
  anchorWeek = 13,
  anchorYear = 2026
) {
  const weekOffset = getWeekOffsetFromAnchor(week, year, anchorWeek, anchorYear)
  return Number((startingDistance * Math.pow(growthFactor, weekOffset)).toFixed(2))
}

export function getWeeklyProgressionTargets(
  weeks,
  startingDistance = 17,
  growthFactor = 1.07,
  anchorWeek = 13,
  anchorYear = 2026
) {
  const targets = new Map()

  weeks.forEach(week => {
    targets.set(
      week.key,
      getWeeklyProgressionTarget(week.week, week.year, startingDistance, growthFactor, anchorWeek, anchorYear)
    )
  })

  return targets
}

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

export const ACTIVITY_GROUPS = [
  { value: 'endurance',  label: 'Utholdenhet' },
  { value: 'team',       label: 'Lag' },
  { value: 'racquet',    label: 'Racket' },
  { value: 'combat',     label: 'Kamp & klatring' },
  { value: 'winter',     label: 'Vinter' },
  { value: 'water',      label: 'Vann' },
  { value: 'strength',   label: 'Styrke & mobilitet' },
  { value: 'other',      label: 'Annet' },
]

export const ACTIVITY_GROUP_MAP = Object.fromEntries(ACTIVITY_GROUPS.map(g => [g.value, g]))

export const ACTIVITY_TAGS = [
  { value: 'strength',     label: 'Styrke',         icon: 'strength',     color: '#ec4899', bg: '#fce7f3', group: 'strength' },
  { value: 'run',          label: 'Løping',         icon: 'run',          color: '#3b82f6', bg: '#dbeafe', group: 'endurance' },
  { value: 'trail_run',    label: 'Terrengløping',  icon: 'trail_run',    color: '#65a30d', bg: '#ecfccb', group: 'endurance' },
  { value: 'walking',      label: 'Gåing',          icon: 'walking',      color: '#f59e0b', bg: '#fef3c7', group: 'endurance' },
  { value: 'hiking',       label: 'Tur/fjelltur',   icon: 'hiking',       color: '#a16207', bg: '#fef9c3', group: 'endurance' },
  { value: 'xc_skiing',    label: 'Langrenn',       icon: 'xc_skiing',    color: '#0ea5e9', bg: '#e0f2fe', group: 'winter' },
  { value: 'alpine',       label: 'Alpint',         icon: 'alpine',       color: '#0284c7', bg: '#e0f2fe', group: 'winter' },
  { value: 'snowboard',    label: 'Snowboard',      icon: 'snowboard',    color: '#1d4ed8', bg: '#dbeafe', group: 'winter' },
  { value: 'biathlon',     label: 'Skiskyting',     icon: 'biathlon',     color: '#0369a1', bg: '#e0f2fe', group: 'winter' },
  { value: 'bike',         label: 'Sykkel',         icon: 'bike',         color: '#10b981', bg: '#d1fae5', group: 'endurance' },
  { value: 'mtb',          label: 'Terrengsykkel',  icon: 'mtb',          color: '#15803d', bg: '#dcfce7', group: 'endurance' },
  { value: 'gravel',       label: 'Gravel',         icon: 'gravel',       color: '#84cc16', bg: '#ecfccb', group: 'endurance' },
  { value: 'spinning',     label: 'Spinning',       icon: 'spinning',     color: '#059669', bg: '#d1fae5', group: 'endurance' },
  { value: 'swim',         label: 'Svømming',       icon: 'swim',         color: '#6366f1', bg: '#e0e7ff', group: 'water' },
  { value: 'openwater',    label: 'Åpent vann',     icon: 'openwater',    color: '#0e7490', bg: '#cffafe', group: 'water' },
  { value: 'triathlon',    label: 'Triatlon',       icon: 'triathlon',    color: '#7c3aed', bg: '#ede9fe', group: 'endurance' },
  { value: 'rowing',       label: 'Roing',          icon: 'rowing',       color: '#0d9488', bg: '#ccfbf1', group: 'water' },
  { value: 'kayak',        label: 'Kajakk',         icon: 'kayak',        color: '#0891b2', bg: '#cffafe', group: 'water' },
  { value: 'sup',          label: 'SUP/Padling',    icon: 'sup',          color: '#06b6d4', bg: '#cffafe', group: 'water' },
  { value: 'surf',         label: 'Surfing',        icon: 'surf',         color: '#22d3ee', bg: '#cffafe', group: 'water' },
  { value: 'sailing',      label: 'Seiling',        icon: 'sailing',      color: '#1e40af', bg: '#dbeafe', group: 'water' },
  { value: 'freedive',     label: 'Fridykking',     icon: 'freedive',     color: '#0c4a6e', bg: '#e0f2fe', group: 'water' },
  { value: 'yoga',         label: 'Yoga',           icon: 'yoga',         color: '#a855f7', bg: '#f3e8ff', group: 'strength' },
  { value: 'pilates',      label: 'Pilates',        icon: 'pilates',      color: '#c026d3', bg: '#fae8ff', group: 'strength' },
  { value: 'mobility',     label: 'Mobilitet',      icon: 'mobility',     color: '#9333ea', bg: '#f3e8ff', group: 'strength' },
  { value: 'calisthenics', label: 'Kroppsvekt',     icon: 'calisthenics', color: '#db2777', bg: '#fce7f3', group: 'strength' },
  { value: 'plyometric',   label: 'Spenst',         icon: 'plyometric',   color: '#e11d48', bg: '#ffe4e6', group: 'strength' },
  { value: 'crossfit',     label: 'CrossFit/HIIT',  icon: 'crossfit',     color: '#dc2626', bg: '#fee2e2', group: 'strength' },
  { value: 'football',     label: 'Fotball',        icon: 'football',     color: '#16a34a', bg: '#dcfce7', group: 'team' },
  { value: 'basketball',   label: 'Basketball',     icon: 'basketball',   color: '#ea580c', bg: '#ffedd5', group: 'team' },
  { value: 'volleyball',   label: 'Volleyball',     icon: 'volleyball',   color: '#facc15', bg: '#fef9c3', group: 'team' },
  { value: 'handball',     label: 'Håndball',       icon: 'handball',     color: '#f97316', bg: '#ffedd5', group: 'team' },
  { value: 'hockey',       label: 'Ishockey',       icon: 'hockey',       color: '#1e3a8a', bg: '#dbeafe', group: 'team' },
  { value: 'rugby',        label: 'Rugby',          icon: 'rugby',        color: '#7f1d1d', bg: '#fee2e2', group: 'team' },
  { value: 'tennis',       label: 'Tennis',         icon: 'tennis',       color: '#ca8a04', bg: '#fef9c3', group: 'racquet' },
  { value: 'badminton',    label: 'Badminton',      icon: 'badminton',    color: '#fbbf24', bg: '#fef9c3', group: 'racquet' },
  { value: 'padel',        label: 'Padel',          icon: 'padel',        color: '#fde047', bg: '#fef9c3', group: 'racquet' },
  { value: 'squash',       label: 'Squash',         icon: 'squash',       color: '#a16207', bg: '#fef3c7', group: 'racquet' },
  { value: 'table_tennis', label: 'Bordtennis',     icon: 'table_tennis', color: '#d97706', bg: '#fef3c7', group: 'racquet' },
  { value: 'boxing',       label: 'Boksing',        icon: 'boxing',       color: '#991b1b', bg: '#fee2e2', group: 'combat' },
  { value: 'mma',          label: 'MMA',            icon: 'mma',          color: '#7f1d1d', bg: '#fee2e2', group: 'combat' },
  { value: 'martial_arts', label: 'Kampsport',      icon: 'martial_arts', color: '#b91c1c', bg: '#fee2e2', group: 'combat' },
  { value: 'climbing',     label: 'Klatring',       icon: 'climbing',     color: '#92400e', bg: '#fef3c7', group: 'combat' },
  { value: 'bouldering',   label: 'Buldring',       icon: 'bouldering',   color: '#78350f', bg: '#fef3c7', group: 'combat' },
  { value: 'skating',      label: 'Skøyter',        icon: 'skating',      color: '#0284c7', bg: '#e0f2fe', group: 'winter' },
  { value: 'inline',       label: 'Rulleski/Inline', icon: 'inline',      color: '#0ea5e9', bg: '#e0f2fe', group: 'endurance' },
  { value: 'horse',        label: 'Ridning',        icon: 'horse',        color: '#92400e', bg: '#fef3c7', group: 'other' },
  { value: 'golf',         label: 'Golf',           icon: 'golf',         color: '#16a34a', bg: '#dcfce7', group: 'other' },
  { value: 'dance',        label: 'Dans',           icon: 'dance',        color: '#d946ef', bg: '#fae8ff', group: 'other' },
  { value: 'rest',         label: 'Hvile/Restitusjon', icon: 'rest',      color: '#64748b', bg: '#f1f5f9', group: 'other' },
]

export const ACTIVITY_TAG_MAP = Object.fromEntries(
  ACTIVITY_TAGS.map(tag => [tag.value, tag])
)

export function inferActivityTag(workout) {
  const explicitTag = workout?.activityTag
  if (explicitTag && ACTIVITY_TAG_MAP[explicitTag]) return explicitTag

  const type = String(workout?.type || '').trim().toLowerCase()
  if (type === 'styrke') return 'strength'
  if (type === 'molle') return 'run'
  if (type === 'interval' || type === 'terskel' || type === 'rolig') return 'run'

  const text = [
    workout?.title,
    workout?.category,
    workout?.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (/sv[oø]m/.test(text)) return 'swim'
  if (/sykkel|bike|spinn/.test(text)) return 'bike'
  if (/langrenn|ski/.test(text)) return 'xc_skiing'
  if (/g[åa]ing|g[åa]|tur|walk|walking/.test(text)) return 'walking'
  if (/styrke|kneb[oø]y|markl[oø]ft|benkpress/.test(text)) return 'strength'
  if (/l[oø]p|jogg|intervall|terskel|m[oø]lle/.test(text)) return 'run'

  return ''
}

export const LOAD_TAGS = [
  { value: 'low', label: 'Lav load', shortLabel: 'Lav', color: '#166534', bg: '#dcfce7' },
  { value: 'medium', label: 'Moderat load', shortLabel: 'Moderat', color: '#9a3412', bg: '#ffedd5' },
  { value: 'high', label: 'Høy load', shortLabel: 'Høy', color: '#991b1b', bg: '#fee2e2' },
]

export const LOAD_TAG_MAP = Object.fromEntries(
  LOAD_TAGS.map(tag => [tag.value, tag])
)

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
    rawZones
      .map(Number)
      .filter(zone => allowedZones.includes(zone))
  )].sort((a, b) => a - b)

  return normalized.length > 0 ? normalized : getDefaultIntensityZones(type)
}

export function normalizeIntensityZone(type, intensityZone) {
  const zones = normalizeIntensityZones(type, intensityZone)
  return zones.length > 0 ? zones[zones.length - 1] : null
}

export function getDefaultWarmup(_type, activityTag = '') {
  if (activityTag === 'run') return '10-15 min rolig jogg + 3-4 stigningsløp'
  if (activityTag === 'walking') return '10-15 min rolig gange med gradvis progresjon'
  if (activityTag === 'bike') return '10-15 min rolig sykling med gradvis progresjon'
  if (activityTag === 'swim') return '200-400 m rolig innsvømming + teknikk'
  if (activityTag === 'xc_skiing') return '10-15 min rolig diagonalgang/skøyting + drill'
  if (activityTag === 'strength') return '10-15 min generell oppvarming + aktivering'
  return '10-15 min rolig oppvarming'
}

export function getDefaultCooldown(_type, activityTag = '') {
  if (activityTag === 'run') return '5-10 min rolig jogg eller gange'
  if (activityTag === 'walking') return '5-10 min rolig gange og lett mobilitet'
  if (activityTag === 'bike') return '10 min rolig sykling'
  if (activityTag === 'swim') return '100-200 m rolig utsvømming'
  if (activityTag === 'xc_skiing') return '5-10 min rolig nedkjøring'
  if (activityTag === 'strength') return '5-10 min rolig nedtrapping og lett mobilitet'
  return '5-10 min rolig nedkjøling'
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

export function formatIntensityZoneLabel(zones) {
  if (!zones || zones.length === 0) return null
  if (zones.length === 1) return `Sone ${zones[0]}`

  const contiguous = zones.every((zone, index) => index === 0 || zone === zones[index - 1] + 1)
  if (contiguous) return `Sone ${zones[0]}-${zones[zones.length - 1]}`

  return `Sone ${zones.join(', ')}`
}

export function normalizeWorkout(workout) {
  const intensityZones = normalizeIntensityZones(workout.type, workout.intensityZone)
  const activityTag = inferActivityTag(workout)
  const weekday = workout.weekday || getWeekdayFromDate(workout.date)
  const normalizedWeekday = normalizeWeekday(weekday)
  const date = workout.date || getDateStringForWeekday(workout.week, workout.year, normalizedWeekday)
  return {
    ...workout,
    activityTag,
    date,
    cooldown: workout.cooldown?.trim?.() || getDefaultCooldown(workout.type, activityTag),
    time: workout.time || '',
    loadTag: normalizeLoadTag(workout.type, intensityZones, workout.loadTag),
    warmup: workout.warmup?.trim?.() || getDefaultWarmup(workout.type, activityTag),
    weekday: normalizedWeekday,
    intensityZone: intensityZones,
    userComment: workout.userComment || '',
    blocks: workout.blocks || null,
  }
}

export function formatWorkoutDate(dateValue) {
  if (!dateValue) return ''
  const [year, month, day] = String(dateValue).split('-').map(Number)
  if (!year || !month || !day) return String(dateValue)
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`
}

export function formatWorkoutSchedule(workout, options = {}) {
  const {
    includeWeekday = true,
    includeDate = true,
  } = options

  const parts = []
  const weekdayMeta = workout ? getWeekdayMeta(workout.weekday || getWeekdayFromDate(workout.date)) : null
  const formattedDate = formatWorkoutDate(workout?.date)

  if (includeWeekday && weekdayMeta) {
    parts.push(weekdayMeta.label)
  }

  if (includeDate && formattedDate) {
    parts.push(formattedDate)
  }

  const schedule = parts.join(' · ')

  if (workout?.time) {
    return schedule ? `${schedule} kl. ${workout.time}` : `Kl. ${workout.time}`
  }

  return schedule
}

export function formatWorkoutTime(workout) {
  return workout?.time ? `Kl. ${workout.time}` : ''
}

export function compareWorkoutsBySchedule(a, b) {
  const byWeekday = normalizeWeekday(a?.weekday || getWeekdayFromDate(a?.date))
    - normalizeWeekday(b?.weekday || getWeekdayFromDate(b?.date))
  if (byWeekday !== 0) return byWeekday

  const aTime = a?.time || '99:99'
  const bTime = b?.time || '99:99'
  const byTime = aTime.localeCompare(bTime)
  if (byTime !== 0) return byTime

  return (a?.order ?? 0) - (b?.order ?? 0)
}

export function groupWorkoutsByWeekday(workouts) {
  const grouped = WEEKDAY_OPTIONS.map(day => ({ ...day, workouts: [] }))

  workouts.forEach(workout => {
    const weekday = normalizeWeekday(workout.weekday || getWeekdayFromDate(workout.date))
    grouped[weekday - 1].workouts.push(workout)
  })

  grouped.forEach(day => {
    day.workouts.sort(compareWorkoutsBySchedule)
  })

  return grouped
}

export function getIntensityZoneLabel(workout) {
  const zones = normalizeIntensityZones(workout.type, workout.intensityZone)
  return formatIntensityZoneLabel(zones)
}

export const TEMPLATE_CATEGORIES = [
  'Intervall',
  'Terskel',
  'Rolig',
  'Mølle + styrke',
  'Styrke',
  'Annet',
]
