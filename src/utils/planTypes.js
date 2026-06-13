// Shared palette for plan annotations: the band-type presets (training phases +
// focus areas + point markers) and goal-priority styling. One source of truth so
// the create-menu, the band track, and the editors all agree on label + color.

// Band-type presets. `kind` groups them loosely for the picker; it does not
// affect rendering. A 'custom' band carries its own label/color and is not in
// this list — see CUSTOM_BAND_TYPE below.
export const BAND_TYPES = [
  // Training phases
  { value: 'recovery',        label: 'Recovery',          color: '#22c55e', kind: 'phase' },
  { value: 'buildup',         label: 'Buildup',           color: '#3b82f6', kind: 'phase' },
  { value: 'taper',           label: 'Taper',             color: '#a855f7', kind: 'phase' },
  { value: 'raceDay',         label: 'Race day',          color: '#ef4444', kind: 'phase' },
  // Focus areas
  { value: 'volume',          label: 'Volume build',      color: '#0ea5e9', kind: 'focus' },
  { value: 'vo2max',          label: 'VO2max focus',      color: '#f97316', kind: 'focus' },
  { value: 'threshold',       label: 'Threshold focus',   color: '#eab308', kind: 'focus' },
  { value: 'raceSpecificity', label: 'Race specificity',  color: '#ec4899', kind: 'focus' },
  // Point markers
  { value: 'testing',         label: 'Testing',           color: '#14b8a6', kind: 'marker' },
  { value: 'peak',            label: 'Peak shape',        color: '#f43f5e', kind: 'marker' },
]

export const CUSTOM_BAND_TYPE = 'custom'

export const BAND_TYPE_MAP = Object.fromEntries(
  BAND_TYPES.map(type => [type.value, type])
)

// A band's conflict group. Bands sharing a kind are mutually exclusive over
// overlapping dates (the newer one evicts the older); different kinds coexist.
// Phases (buildup/taper/recovery/raceDay) share 'phase' so they interfere;
// focus areas share 'focus'; point markers share 'marker'. Custom bands and any
// unknown type fall into 'custom' and only conflict with each other.
export function bandKind(type) {
  return BAND_TYPE_MAP[type]?.kind || 'custom'
}

// Default color for a custom band before the user picks one.
export const CUSTOM_BAND_DEFAULT_COLOR = '#64748b'

// Resolve a band's display color: a custom band uses its own stored color; a
// preset uses the palette color (falling back to the band's own color, then a
// neutral). Tolerant of unknown types so old/imported data still renders.
export function resolveBandColor(band) {
  if (!band) return CUSTOM_BAND_DEFAULT_COLOR
  if (band.type === CUSTOM_BAND_TYPE) return band.color || CUSTOM_BAND_DEFAULT_COLOR
  return BAND_TYPE_MAP[band.type]?.color || band.color || CUSTOM_BAND_DEFAULT_COLOR
}

// Resolve a band's display label: custom/unknown falls back to the stored label.
export function resolveBandLabel(band) {
  if (!band) return ''
  if (band.type === CUSTOM_BAND_TYPE) return band.label || 'Custom'
  return band.label || BAND_TYPE_MAP[band.type]?.label || band.type || ''
}

// Goal priority tiers, ordered most → least important. `weight` drives marker
// size/prominence in the goal strip (1 = boldest).
export const GOAL_PRIORITIES = [
  { value: 'A', label: 'A — peak for this', weight: 1 },
  { value: 'B', label: 'B — important',     weight: 2 },
  { value: 'C', label: 'C — training race', weight: 3 },
]

export const GOAL_PRIORITY_MAP = Object.fromEntries(
  GOAL_PRIORITIES.map(priority => [priority.value, priority])
)

export function goalPriorityWeight(priority) {
  return GOAL_PRIORITY_MAP[priority]?.weight ?? 3
}

// Default post-it tints by author, so coach and athlete notes read differently
// at a glance.
export const NOTE_AUTHOR_COLORS = {
  coach: '#fde68a',   // warm amber
  athlete: '#bfdbfe', // cool blue
}

export function defaultNoteColor(author) {
  return NOTE_AUTHOR_COLORS[author] || NOTE_AUTHOR_COLORS.coach
}
