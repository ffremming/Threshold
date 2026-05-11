import { SPEED_ACTIVITIES, speedToPace, estimatedSpeedKmh } from './units'

export const SECTION_KINDS = ['warmup', 'steady', 'interval', 'cooldown']

export const SECTION_LABELS = {
  warmup: 'Oppvarming',
  steady: 'Rolig økt',
  interval: 'Intervaller',
  cooldown: 'Nedjogg',
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
}

export function createSection(kind, activityTag) {
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
