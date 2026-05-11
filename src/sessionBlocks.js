// Structured session model: an ordered list of sections.
//
// section.kind ∈ 'warmup' | 'steady' | 'interval' | 'cooldown'
// - warmup/steady/cooldown: distanceKm + paceSecPerKm → durationMin
// - interval: reps × dragKm @ paceSecPerKm with pauseSec between reps.
//   distanceKm = reps * dragKm (derived); durationMin includes pauses.
//
// Backwards compatibility: legacy templates have blocks.{warmup,main,cooldown}.
// normalizeBlocks() accepts either shape and always returns the new shape with
// `sections` populated. Old keys are dropped on save.

const PACE_ACTIVITIES = new Set(['run', 'walking', 'trail_run', 'xc_skiing', 'trail'])
const SPEED_ACTIVITIES = new Set([
  'bike', 'mtb', 'gravel', 'road_bike', 'spinning',
  'swim', 'openwater_swim', 'rowing', 'kayak', 'sup',
  'inline_skate', 'roller_ski', 'skating',
])

export const SECTION_KINDS = ['warmup', 'steady', 'interval', 'cooldown']

export const SECTION_LABELS = {
  warmup: 'Oppvarming',
  steady: 'Rolig økt',
  interval: 'Intervaller',
  cooldown: 'Nedjogg',
}

export function getSpeedUnitForActivity(activityTag) {
  if (PACE_ACTIVITIES.has(activityTag)) return 'pace'
  if (SPEED_ACTIVITIES.has(activityTag)) return 'kmh'
  return 'pace'
}

export function paceToSpeed(paceSecPerKm) {
  if (!paceSecPerKm || paceSecPerKm <= 0) return 0
  return Number((3600 / paceSecPerKm).toFixed(2))
}

export function speedToPace(speedKmh) {
  if (!speedKmh || speedKmh <= 0) return 0
  return Math.round(3600 / speedKmh)
}

export function formatPaceLabel(paceSecPerKm) {
  if (!paceSecPerKm || paceSecPerKm <= 0) return '–'
  const mins = Math.floor(paceSecPerKm / 60)
  const secs = Math.round(paceSecPerKm % 60)
  return `${mins}:${String(secs).padStart(2, '0')} /km`
}

export function formatSpeedLabel(speedKmh) {
  if (!speedKmh || speedKmh <= 0) return '–'
  return `${speedKmh.toFixed(1)} km/t`
}

export function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min'
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = Math.round(minutes % 60)
    return m > 0 ? `${h}t ${m}m` : `${h}t`
  }
  return `${Math.round(minutes)} min`
}

export function formatDistance(km) {
  if (!Number.isFinite(km) || km <= 0) return '0 km'
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(km < 10 ? 1 : 0)} km`
}

export function formatPauseLabel(seconds) {
  if (!seconds || seconds <= 0) return 'ingen pause'
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}m ${secs}s pause` : `${mins} min pause`
  }
  return `${seconds}s pause`
}

let sectionCounter = 0
function makeSectionId() {
  sectionCounter += 1
  return `sec-${Date.now().toString(36)}-${sectionCounter}`
}

const KIND_DEFAULTS = {
  warmup:   { distanceKm: 2, paceSecPerKm: 360 },
  steady:   { distanceKm: 6, paceSecPerKm: 330 },
  interval: { reps: 5, dragKm: 1, dragSec: 240, paceSecPerKm: 240, pauseSec: 120, paceMode: 'pace' },
  cooldown: { distanceKm: 1, paceSecPerKm: 360 },
}

export const INTERVAL_PACE_MODES = ['pace', 'length', 'time']

// Heuristic km/h used to estimate distance when pace mode is disabled.
const ESTIMATED_SPEEDS_KMH = {
  run: 11,
  walking: 5.5,
  trail_run: 9,
  xc_skiing: 14,
  bike: 28,
  mtb: 18,
  gravel: 24,
  spinning: 24,
  swim: 3.5,
  rowing: 9,
  kayak: 8,
  strength: 0,
}

function estimatedSpeedKmh(activityTag) {
  return ESTIMATED_SPEEDS_KMH[activityTag] || 10
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

function computeSectionDuration(section, activityTag) {
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

function computeSectionDistance(section, activityTag) {
  if (section.kind === 'interval') {
    const reps = Math.max(1, Number(section.reps) || 1)
    const mode = section.paceMode || 'pace'
    if (mode === 'time') {
      // Distance is estimated. Prefer user-adjusted estimatedDragKm; else derive.
      if (Number.isFinite(Number(section.estimatedDragKm)) && section.estimatedDragKm > 0) {
        return Math.round(reps * Number(section.estimatedDragKm) * 100) / 100
      }
      const speed = estimatedSpeedKmh(activityTag) || 10
      const dragKm = ((Number(section.dragSec) || 0) / 3600) * speed
      return Math.round(reps * dragKm * 100) / 100
    }
    // mode 'pace' or 'length' both derive distance from dragKm directly.
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

// Convert a legacy { warmup, main, cooldown } block dict into a sections list.
function sectionsFromLegacy(legacy, activityTag) {
  const sections = []
  if (legacy.warmup) {
    sections.push(normalizeSection({
      kind: 'warmup',
      distanceKm: legacy.warmup.distanceKm,
      paceSecPerKm: legacy.warmup.paceSecPerKm,
    }, activityTag))
  }
  if (legacy.main) {
    const m = legacy.main
    const reps = Math.max(1, Number(m.intervals) || 1)
    if (reps > 1) {
      const totalKm = Number(m.distanceKm) || 0
      sections.push(normalizeSection({
        kind: 'interval',
        reps,
        dragKm: reps > 0 ? totalKm / reps : 0,
        paceSecPerKm: m.paceSecPerKm,
        pauseSec: m.pauseSec || 0,
      }, activityTag))
    } else {
      sections.push(normalizeSection({
        kind: 'steady',
        distanceKm: m.distanceKm,
        paceSecPerKm: m.paceSecPerKm,
      }, activityTag))
    }
  }
  if (legacy.cooldown) {
    sections.push(normalizeSection({
      kind: 'cooldown',
      distanceKm: legacy.cooldown.distanceKm,
      paceSecPerKm: legacy.cooldown.paceSecPerKm,
    }, activityTag))
  }
  return sections.filter(Boolean)
}

export function normalizeBlocks(blocks, activityTag) {
  if (!blocks || typeof blocks !== 'object') return null
  let sections = []
  if (Array.isArray(blocks.sections) && blocks.sections.length > 0) {
    sections = blocks.sections.map(s => normalizeSection(s, activityTag)).filter(Boolean)
  } else if (blocks.warmup || blocks.main || blocks.cooldown) {
    sections = sectionsFromLegacy(blocks, activityTag)
  }
  if (sections.length === 0) return null
  return { sections }
}

export function hasStructuredBlocks(source) {
  const b = source?.blocks
  if (!b) return false
  if (Array.isArray(b.sections) && b.sections.length > 0) return true
  return !!b.main // legacy
}

export function getSections(blocks, activityTag) {
  if (!blocks) return []
  if (Array.isArray(blocks.sections)) return blocks.sections
  if (blocks.warmup || blocks.main || blocks.cooldown) return sectionsFromLegacy(blocks, activityTag)
  return []
}

export function computeSessionTotals(blocks, activityTag) {
  const sections = getSections(blocks, activityTag)
  return sections.reduce(
    (acc, s) => ({
      totalDistance: acc.totalDistance + computeSectionDistance(s, activityTag),
      totalDuration: acc.totalDuration + computeSectionDuration(s, activityTag),
    }),
    { totalDistance: 0, totalDuration: 0 }
  )
}

export function blocksToSummary(blocks, activityTag) {
  const sections = getSections(blocks, activityTag)
  if (sections.length === 0) return ''
  const unit = getSpeedUnitForActivity(activityTag)
  const fmtSpeed = unit === 'pace'
    ? (paceSec) => formatPaceLabel(paceSec)
    : (paceSec) => formatSpeedLabel(paceToSpeed(paceSec))
  return sections.map(s => {
    const label = SECTION_LABELS[s.kind] || 'Del'
    if (s.kind === 'interval') {
      const tail = []
      const mode = s.paceMode || 'pace'
      if (mode === 'time') {
        tail.push(`${s.reps} × ${formatSeconds(s.dragSec)}`)
      } else if (mode === 'length') {
        tail.push(`${s.reps} × ${formatDistance(s.dragKm)}`)
      } else {
        tail.push(`${s.reps} × ${formatDistance(s.dragKm)} @ ${fmtSpeed(s.paceSecPerKm)}`)
      }
      if (s.pauseSec > 0) tail.push(formatPauseLabel(s.pauseSec))
      return `${label}: ${tail.join(', ')}`
    }
    return `${label}: ${formatDistance(s.distanceKm)} @ ${fmtSpeed(s.paceSecPerKm)}`
  }).join('\n')
}

function formatSeconds(totalSec) {
  const sec = Math.max(0, Math.round(Number(totalSec) || 0))
  if (sec >= 60) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return s > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${m} min`
  }
  return `${sec}s`
}

// Legacy API kept for compatibility with any external caller.
export function createBlock(kind, activityTag) {
  const sectionKind = kind === 'main' ? 'steady' : kind
  return createSection(sectionKind, activityTag)
}

export function computeDuration(blockOrSection, activityTag) {
  return computeSectionDuration(blockOrSection, activityTag)
}
