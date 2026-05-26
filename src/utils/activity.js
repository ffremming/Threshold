export const ACTIVITY_GROUPS = [
  { value: 'endurance',  label: 'Endurance' },
  { value: 'team',       label: 'Team' },
  { value: 'racquet',    label: 'Racquet' },
  { value: 'combat',     label: 'Combat & climbing' },
  { value: 'winter',     label: 'Winter' },
  { value: 'water',      label: 'Water' },
  { value: 'strength',   label: 'Strength & mobility' },
  { value: 'other',      label: 'Other' },
]

export const ACTIVITY_GROUP_MAP = Object.fromEntries(ACTIVITY_GROUPS.map(g => [g.value, g]))

export const ACTIVITY_TAGS = [
  { value: 'strength',     label: 'Strength',         icon: 'strength',     color: '#ec4899', bg: '#fce7f3', group: 'strength' },
  { value: 'run',          label: 'Running',          icon: 'run',          color: '#3b82f6', bg: '#dbeafe', group: 'endurance' },
  { value: 'trail_run',    label: 'Trail running',    icon: 'trail_run',    color: '#65a30d', bg: '#ecfccb', group: 'endurance' },
  { value: 'walking',      label: 'Walking',          icon: 'walking',      color: '#f59e0b', bg: '#fef3c7', group: 'endurance' },
  { value: 'hiking',       label: 'Hiking',           icon: 'hiking',       color: '#a16207', bg: '#fef9c3', group: 'endurance' },
  { value: 'xc_skiing',    label: 'Cross-country skiing', icon: 'xc_skiing', color: '#0ea5e9', bg: '#e0f2fe', group: 'winter' },
  { value: 'alpine',       label: 'Alpine',           icon: 'alpine',       color: '#0284c7', bg: '#e0f2fe', group: 'winter' },
  { value: 'snowboard',    label: 'Snowboard',        icon: 'snowboard',    color: '#1d4ed8', bg: '#dbeafe', group: 'winter' },
  { value: 'biathlon',     label: 'Biathlon',         icon: 'biathlon',     color: '#0369a1', bg: '#e0f2fe', group: 'winter' },
  { value: 'bike',         label: 'Cycling',          icon: 'bike',         color: '#10b981', bg: '#d1fae5', group: 'endurance' },
  { value: 'mtb',          label: 'Mountain bike',    icon: 'mtb',          color: '#15803d', bg: '#dcfce7', group: 'endurance' },
  { value: 'gravel',       label: 'Gravel',           icon: 'gravel',       color: '#84cc16', bg: '#ecfccb', group: 'endurance' },
  { value: 'spinning',     label: 'Spinning',         icon: 'spinning',     color: '#059669', bg: '#d1fae5', group: 'endurance' },
  { value: 'swim',         label: 'Swimming',         icon: 'swim',         color: '#6366f1', bg: '#e0e7ff', group: 'water' },
  { value: 'openwater',    label: 'Open water',       icon: 'openwater',    color: '#0e7490', bg: '#cffafe', group: 'water' },
  { value: 'triathlon',    label: 'Triathlon',        icon: 'triathlon',    color: '#7c3aed', bg: '#ede9fe', group: 'endurance' },
  { value: 'rowing',       label: 'Rowing',           icon: 'rowing',       color: '#0d9488', bg: '#ccfbf1', group: 'water' },
  { value: 'kayak',        label: 'Kayak',            icon: 'kayak',        color: '#0891b2', bg: '#cffafe', group: 'water' },
  { value: 'sup',          label: 'SUP/Paddling',     icon: 'sup',          color: '#06b6d4', bg: '#cffafe', group: 'water' },
  { value: 'surf',         label: 'Surfing',          icon: 'surf',         color: '#22d3ee', bg: '#cffafe', group: 'water' },
  { value: 'sailing',      label: 'Sailing',          icon: 'sailing',      color: '#1e40af', bg: '#dbeafe', group: 'water' },
  { value: 'freedive',     label: 'Freediving',       icon: 'freedive',     color: '#0c4a6e', bg: '#e0f2fe', group: 'water' },
  { value: 'yoga',         label: 'Yoga',             icon: 'yoga',         color: '#a855f7', bg: '#f3e8ff', group: 'strength' },
  { value: 'pilates',      label: 'Pilates',          icon: 'pilates',      color: '#c026d3', bg: '#fae8ff', group: 'strength' },
  { value: 'mobility',     label: 'Mobility',         icon: 'mobility',     color: '#9333ea', bg: '#f3e8ff', group: 'strength' },
  { value: 'calisthenics', label: 'Calisthenics',     icon: 'calisthenics', color: '#db2777', bg: '#fce7f3', group: 'strength' },
  { value: 'plyometric',   label: 'Plyometrics',      icon: 'plyometric',   color: '#e11d48', bg: '#ffe4e6', group: 'strength' },
  { value: 'crossfit',     label: 'CrossFit/HIIT',    icon: 'crossfit',     color: '#dc2626', bg: '#fee2e2', group: 'strength' },
  { value: 'football',     label: 'Soccer',           icon: 'football',     color: '#16a34a', bg: '#dcfce7', group: 'team' },
  { value: 'basketball',   label: 'Basketball',       icon: 'basketball',   color: '#ea580c', bg: '#ffedd5', group: 'team' },
  { value: 'volleyball',   label: 'Volleyball',       icon: 'volleyball',   color: '#facc15', bg: '#fef9c3', group: 'team' },
  { value: 'handball',     label: 'Handball',         icon: 'handball',     color: '#f97316', bg: '#ffedd5', group: 'team' },
  { value: 'hockey',       label: 'Ice hockey',       icon: 'hockey',       color: '#1e3a8a', bg: '#dbeafe', group: 'team' },
  { value: 'rugby',        label: 'Rugby',            icon: 'rugby',        color: '#7f1d1d', bg: '#fee2e2', group: 'team' },
  { value: 'tennis',       label: 'Tennis',           icon: 'tennis',       color: '#ca8a04', bg: '#fef9c3', group: 'racquet' },
  { value: 'badminton',    label: 'Badminton',        icon: 'badminton',    color: '#fbbf24', bg: '#fef9c3', group: 'racquet' },
  { value: 'padel',        label: 'Padel',            icon: 'padel',        color: '#fde047', bg: '#fef9c3', group: 'racquet' },
  { value: 'squash',       label: 'Squash',           icon: 'squash',       color: '#a16207', bg: '#fef3c7', group: 'racquet' },
  { value: 'table_tennis', label: 'Table tennis',     icon: 'table_tennis', color: '#d97706', bg: '#fef3c7', group: 'racquet' },
  { value: 'boxing',       label: 'Boxing',           icon: 'boxing',       color: '#991b1b', bg: '#fee2e2', group: 'combat' },
  { value: 'mma',          label: 'MMA',              icon: 'mma',          color: '#7f1d1d', bg: '#fee2e2', group: 'combat' },
  { value: 'martial_arts', label: 'Martial arts',     icon: 'martial_arts', color: '#b91c1c', bg: '#fee2e2', group: 'combat' },
  { value: 'climbing',     label: 'Climbing',         icon: 'climbing',     color: '#92400e', bg: '#fef3c7', group: 'combat' },
  { value: 'bouldering',   label: 'Bouldering',       icon: 'bouldering',   color: '#78350f', bg: '#fef3c7', group: 'combat' },
  { value: 'skating',      label: 'Skating',          icon: 'skating',      color: '#0284c7', bg: '#e0f2fe', group: 'winter' },
  { value: 'inline',       label: 'Roller ski/Inline', icon: 'inline',      color: '#0ea5e9', bg: '#e0f2fe', group: 'endurance' },
  { value: 'horse',        label: 'Horseback riding', icon: 'horse',        color: '#92400e', bg: '#fef3c7', group: 'other' },
  { value: 'golf',         label: 'Golf',             icon: 'golf',         color: '#16a34a', bg: '#dcfce7', group: 'other' },
  { value: 'dance',        label: 'Dance',            icon: 'dance',        color: '#d946ef', bg: '#fae8ff', group: 'other' },
  { value: 'rest',         label: 'Rest/Recovery',    icon: 'rest',         color: '#64748b', bg: '#f1f5f9', group: 'other' },
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

  const text = [workout?.title, workout?.category, workout?.description]
    .filter(Boolean).join(' ').toLowerCase()

  if (/sv[oø]m/.test(text)) return 'swim'
  if (/sykkel|bike|spinn/.test(text)) return 'bike'
  if (/langrenn|ski/.test(text)) return 'xc_skiing'
  if (/g[åa]ing|g[åa]|tur|walk|walking/.test(text)) return 'walking'
  if (/styrke|kneb[oø]y|markl[oø]ft|benkpress/.test(text)) return 'strength'
  if (/l[oø]p|jogg|intervall|terskel|m[oø]lle/.test(text)) return 'run'

  return ''
}
