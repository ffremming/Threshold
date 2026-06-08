import { SPEED_ACTIVITIES, speedToPace, estimatedSpeedKmh, getSessionDomain } from './units'

// Distance-based section kinds (run/bike/swim/…): use distance + pace.
export const DISTANCE_SECTION_KINDS = ['warmup', 'steady', 'interval', 'cooldown']
// Strength section kinds: use sets/reps/load + duration.
export const STRENGTH_SECTION_KINDS = ['warmup', 'exercise', 'cooldown']
// Duration-only section kinds (yoga, ball sports, …).
export const DURATION_SECTION_KINDS = ['warmup', 'effort', 'sprint', 'cooldown']

export const SECTION_KINDS = ['warmup', 'steady', 'interval', 'cooldown', 'exercise', 'effort', 'sprint']

// Which section kinds the user may add, per measurement domain.
// Sprints are pure time-based work (reps × seconds) and fit any session
// except strength, where sets/reps/load is the right model.
export function getAddableKinds(activityTag) {
  const domain = getSessionDomain(activityTag)
  if (domain === 'strength') return ['warmup', 'exercise', 'cooldown']
  if (domain === 'duration') return ['warmup', 'effort', 'sprint', 'cooldown']
  return ['warmup', 'steady', 'interval', 'sprint', 'cooldown']
}

export const SECTION_LABELS = {
  warmup: 'Warmup',
  steady: 'Easy session',
  interval: 'Intervals',
  cooldown: 'Cooldown',
  exercise: 'Exercise',
  effort: 'Main set',
  sprint: 'Sprints',
}

export const INTERVAL_PACE_MODES = ['pace', 'length', 'time']
// Simple distance blocks (warmup/steady/cooldown) can be defined by length or time.
export const STEADY_PACE_MODES = ['length', 'time']

let sectionCounter = 0
export function makeSectionId() {
  sectionCounter += 1
  return `sec-${Date.now().toString(36)}-${sectionCounter}`
}

const KIND_DEFAULTS = {
  warmup:   { distanceKm: 2, durationMin: 10, paceSecPerKm: 360, paceMode: 'time' },
  steady:   { distanceKm: 6, durationMin: 40, paceSecPerKm: 330, paceMode: 'time' },
  interval: { reps: 5, dragKm: 1, dragSec: 240, paceSecPerKm: 240, pauseSec: 120, paceMode: 'pace' },
  cooldown: { distanceKm: 1, durationMin: 5, paceSecPerKm: 360, paceMode: 'time' },
  exercise: { exerciseId: '', exerciseName: '', sets: 3, reps: 8, loadKg: 0, restSec: 90 },
  effort:   { durationMin: 30 },
  sprint:   { reps: 6, sprintSec: 20 },
}

// Default warmup/cooldown for strength/duration sessions are time-based,
// not distance-based.
const TIME_WARMUP_DEFAULTS = { durationMin: 10 }
const TIME_COOLDOWN_DEFAULTS = { durationMin: 5 }

export function createSection(kind, activityTag) {
  const domain = getSessionDomain(activityTag)

  if (domain === 'strength' || domain === 'duration') {
    // Sprints are a self-contained time block — never coerce them to the
    // domain's default work kind.
    if (kind === 'sprint') {
      return normalizeSection({ id: makeSectionId(), kind: 'sprint', ...KIND_DEFAULTS.sprint }, activityTag)
    }
    let base = KIND_DEFAULTS[kind]
    if (kind === 'warmup') base = TIME_WARMUP_DEFAULTS
    else if (kind === 'cooldown') base = TIME_COOLDOWN_DEFAULTS
    else if (!base) base = domain === 'strength' ? KIND_DEFAULTS.exercise : KIND_DEFAULTS.effort
    const resolvedKind = (kind === 'warmup' || kind === 'cooldown')
      ? kind
      : (domain === 'strength' ? 'exercise' : 'effort')
    return normalizeSection({ id: makeSectionId(), kind: resolvedKind, ...base }, activityTag)
  }

  const base = KIND_DEFAULTS[kind] || KIND_DEFAULTS.steady
  const section = { id: makeSectionId(), kind, ...base }
  if (SPEED_ACTIVITIES.has(activityTag)) {
    if (kind === 'interval') {
      section.paceSecPerKm = speedToPace(35)
      section.dragKm = 2
      section.dragSec = Math.round(section.dragKm * section.paceSecPerKm)
    } else {
      section.paceSecPerKm = kind === 'steady' ? speedToPace(25) : speedToPace(18)
      section.distanceKm = kind === 'steady' ? 30 : 5
    }
  }
  return normalizeSection(section, activityTag)
}

// Work-only minutes for a section: same as computeSectionDuration, except an
// interval block counts only the reps' moving time, not the pauses between them.
// Used for zone-minute aggregation (rest time is not credited to the work zone).
export function computeSectionWorkMinutes(section, activityTag) {
  if (section.kind !== 'interval') {
    return computeSectionDuration(section, activityTag)
  }
  const reps = Math.max(1, Number(section.reps) || 1)
  const pace = Number(section.paceSecPerKm) || 0
  const mode = section.paceMode || 'pace'
  let perRepSec
  if (mode === 'time') {
    perRepSec = Number(section.dragSec) || 0
  } else if (mode === 'length') {
    const speed = estimatedSpeedKmh(activityTag) || 10
    const dragKm = Number(section.dragKm) || 0
    perRepSec = (dragKm / speed) * 3600
  } else {
    const dragKm = Number(section.dragKm) || 0
    perRepSec = dragKm * pace
  }
  return Math.round((reps * perRepSec / 60) * 10) / 10
}

export function computeSectionDuration(section, activityTag) {
  if (section.kind === 'effort') {
    return Math.max(0, Math.round((Number(section.durationMin) || 0) * 10) / 10)
  }
  if (section.kind === 'sprint') {
    const reps = Math.max(1, Number(section.reps) || 1)
    const sprintSec = Math.max(0, Number(section.sprintSec) || 0)
    return Math.round((reps * sprintSec / 60) * 10) / 10
  }
  if (section.kind === 'exercise') {
    const sets = Math.max(1, Number(section.sets) || 1)
    const reps = Math.max(0, Number(section.reps) || 0)
    const restSec = Math.max(0, Number(section.restSec) || 0)
    // Estimate ~4s per rep of work + rest between sets.
    const workSec = sets * reps * 4
    const restTotalSec = Math.max(0, sets - 1) * restSec
    return Math.round(((workSec + restTotalSec) / 60) * 10) / 10
  }
  // warmup/cooldown on a strength/duration session are time-based.
  if ((section.kind === 'warmup' || section.kind === 'cooldown') &&
      section.distanceKm == null && section.durationMin != null) {
    return Math.max(0, Math.round((Number(section.durationMin) || 0) * 10) / 10)
  }
  const pace = Number(section.paceSecPerKm) || 0
  if (section.kind === 'interval') {
    const reps = Math.max(1, Number(section.reps) || 1)
    const pauseSec = Number(section.pauseSec) || 0
    const mode = section.paceMode || 'pace'
    let perRepSec
    if (mode === 'time') {
      perRepSec = Number(section.dragSec) || 0
    } else if (mode === 'length') {
      const speed = estimatedSpeedKmh(activityTag) || 10
      const dragKm = Number(section.dragKm) || 0
      perRepSec = (dragKm / speed) * 3600
    } else {
      const dragKm = Number(section.dragKm) || 0
      perRepSec = dragKm * pace
    }
    const movingMin = reps * perRepSec / 60
    const restMin = (reps - 1) * pauseSec / 60
    return Math.round((movingMin + restMin) * 10) / 10
  }
  // Time-first warmup/steady/cooldown: duration is the primary input.
  if (section.paceMode === 'time') {
    return Math.max(0, Math.round((Number(section.durationMin) || 0) * 10) / 10)
  }
  const distanceKm = Number(section.distanceKm) || 0
  return Math.round((distanceKm * pace / 60) * 10) / 10
}

export function computeSectionDistance(section, activityTag) {
  // Strength/duration/sprint sections have no distance.
  if (section.kind === 'exercise' || section.kind === 'effort' || section.kind === 'sprint') return 0
  if (section.kind === 'interval') {
    const reps = Math.max(1, Number(section.reps) || 1)
    const mode = section.paceMode || 'pace'
    if (mode === 'time') {
      if (Number.isFinite(Number(section.estimatedDragKm)) && section.estimatedDragKm > 0) {
        return Math.round(reps * Number(section.estimatedDragKm) * 100) / 100
      }
      const speed = estimatedSpeedKmh(activityTag) || 10
      const dragKm = ((Number(section.dragSec) || 0) / 3600) * speed
      return Math.round(reps * dragKm * 100) / 100
    }
    const dragKm = Number(section.dragKm) || 0
    return Math.round(reps * dragKm * 100) / 100
  }
  // Time-first warmup/steady/cooldown: estimate distance from duration + pace,
  // counted toward weekly stats but not the primary input.
  if (section.paceMode === 'time') {
    const durationMin = Number(section.durationMin) || 0
    const pace = Number(section.paceSecPerKm) || 0
    if (durationMin <= 0 || pace <= 0) return 0
    const estKm = (durationMin * 60) / pace
    return Math.round(estKm * 100) / 100
  }
  return Math.round((Number(section.distanceKm) || 0) * 100) / 100
}

export function normalizeSection(section, activityTag) {
  if (!section || typeof section !== 'object') return null
  const kind = SECTION_KINDS.includes(section.kind) ? section.kind : 'steady'
  const id = section.id || makeSectionId()
  const paceSecPerKm = Number(section.paceSecPerKm) || 0

  if (kind === 'exercise') {
    const normalized = {
      id,
      kind,
      exerciseId: typeof section.exerciseId === 'string' ? section.exerciseId : '',
      exerciseName: typeof section.exerciseName === 'string' ? section.exerciseName : '',
      sets: Math.max(1, Math.round(Number(section.sets) || 1)),
      reps: Math.max(0, Math.round(Number(section.reps) || 0)),
      loadKg: Math.max(0, Number(section.loadKg) || 0),
      restSec: Math.max(0, Math.round(Number(section.restSec) || 0)),
    }
    normalized.distanceKm = 0
    normalized.durationMin = computeSectionDuration(normalized, activityTag)
    return normalized
  }

  if (kind === 'effort') {
    const normalized = {
      id,
      kind,
      durationMin: Math.max(0, Math.round((Number(section.durationMin) || 0) * 10) / 10),
    }
    normalized.distanceKm = 0
    return normalized
  }

  if (kind === 'sprint') {
    const normalized = {
      id,
      kind,
      reps: Math.max(1, Math.round(Number(section.reps) || 1)),
      sprintSec: Math.max(0, Math.round(Number(section.sprintSec) || 0)),
    }
    normalized.distanceKm = 0
    normalized.durationMin = computeSectionDuration(normalized, activityTag)
    return normalized
  }

  // Time-based warmup/cooldown (strength/duration sessions): no distance field,
  // explicit durationMin instead.
  if ((kind === 'warmup' || kind === 'cooldown') &&
      section.distanceKm == null && section.durationMin != null) {
    const normalized = {
      id,
      kind,
      durationMin: Math.max(0, Math.round((Number(section.durationMin) || 0) * 10) / 10),
    }
    normalized.distanceKm = 0
    return normalized
  }

  if (kind === 'interval') {
    const reps = Math.max(1, Math.round(Number(section.reps) || 1))
    const dragKm = Math.max(0, Number(section.dragKm) || 0)
    const dragSec = Math.max(0, Math.round(Number(section.dragSec) || (dragKm * paceSecPerKm)))
    const pauseSec = Math.max(0, Number(section.pauseSec) || 0)
    const paceMode = INTERVAL_PACE_MODES.includes(section.paceMode) ? section.paceMode : 'pace'
    const normalized = {
      id, kind, paceMode, reps, dragKm, dragSec, paceSecPerKm, pauseSec,
    }
    if (paceMode === 'time' && Number.isFinite(Number(section.estimatedDragKm))) {
      normalized.estimatedDragKm = Math.max(0, Number(section.estimatedDragKm))
    }
    normalized.distanceKm = computeSectionDistance(normalized, activityTag)
    normalized.durationMin = computeSectionDuration(normalized, activityTag)
    return normalized
  }
  // Simple distance blocks: warmup / steady / cooldown.
  // Old data without paceMode defaults to 'length' (distance-first) so it renders
  // unchanged; newly created blocks default to 'time' via KIND_DEFAULTS.
  const paceMode = STEADY_PACE_MODES.includes(section.paceMode) ? section.paceMode : 'length'
  if (paceMode === 'time') {
    const durationMin = Math.max(0, Math.round((Number(section.durationMin) || 0) * 10) / 10)
    const normalized = { id, kind, paceMode, durationMin, paceSecPerKm }
    normalized.distanceKm = computeSectionDistance(normalized, activityTag)
    return normalized
  }
  const distanceKm = Math.max(0, Number(section.distanceKm) || 0)
  const normalized = { id, kind, paceMode, distanceKm, paceSecPerKm }
  normalized.durationMin = computeSectionDuration(normalized, activityTag)
  return normalized
}
