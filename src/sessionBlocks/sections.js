import { SPEED_ACTIVITIES, speedToPace, estimatedSpeedKmh, getSessionDomain } from './units'

// Distance-based section kinds (run/bike/swim/…): use distance + pace.
export const DISTANCE_SECTION_KINDS = ['warmup', 'steady', 'interval', 'cooldown']
// Strength section kinds: use sets/reps/load + duration.
export const STRENGTH_SECTION_KINDS = ['warmup', 'exercise', 'cooldown']
// Duration-only section kinds (yoga, ball sports, …).
export const DURATION_SECTION_KINDS = ['warmup', 'effort', 'cooldown']

export const SECTION_KINDS = ['warmup', 'steady', 'interval', 'cooldown', 'exercise', 'effort']

// Which section kinds the user may add, per measurement domain.
export function getAddableKinds(activityTag) {
  const domain = getSessionDomain(activityTag)
  if (domain === 'strength') return ['warmup', 'exercise', 'cooldown']
  if (domain === 'duration') return ['warmup', 'effort', 'cooldown']
  return ['warmup', 'steady', 'interval', 'cooldown']
}

export const SECTION_LABELS = {
  warmup: 'Warmup',
  steady: 'Easy session',
  interval: 'Intervals',
  cooldown: 'Cooldown',
  exercise: 'Exercise',
  effort: 'Main set',
}

export const INTERVAL_PACE_MODES = ['pace', 'length', 'time']

let sectionCounter = 0
export function makeSectionId() {
  sectionCounter += 1
  return `sec-${Date.now().toString(36)}-${sectionCounter}`
}

const KIND_DEFAULTS = {
  warmup:   { distanceKm: 2, paceSecPerKm: 360 },
  steady:   { distanceKm: 6, paceSecPerKm: 330 },
  interval: { reps: 5, dragKm: 1, dragSec: 240, paceSecPerKm: 240, pauseSec: 120, paceMode: 'pace' },
  cooldown: { distanceKm: 1, paceSecPerKm: 360 },
  exercise: { exerciseName: '', sets: 3, reps: 8, loadKg: 0, restSec: 90 },
  effort:   { durationMin: 30 },
}

// Default warmup/cooldown for strength/duration sessions are time-based,
// not distance-based.
const TIME_WARMUP_DEFAULTS = { durationMin: 10 }
const TIME_COOLDOWN_DEFAULTS = { durationMin: 5 }

export function createSection(kind, activityTag) {
  const domain = getSessionDomain(activityTag)

  if (domain === 'strength' || domain === 'duration') {
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

export function computeSectionDuration(section, activityTag) {
  if (section.kind === 'effort') {
    return Math.max(0, Math.round((Number(section.durationMin) || 0) * 10) / 10)
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
  const distanceKm = Number(section.distanceKm) || 0
  return Math.round((distanceKm * pace / 60) * 10) / 10
}

export function computeSectionDistance(section, activityTag) {
  // Strength/duration sections have no distance.
  if (section.kind === 'exercise' || section.kind === 'effort') return 0
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
  const distanceKm = Math.max(0, Number(section.distanceKm) || 0)
  const normalized = { id, kind, distanceKm, paceSecPerKm }
  normalized.durationMin = computeSectionDuration(normalized, activityTag)
  return normalized
}
