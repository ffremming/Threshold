import { getSpeedUnitForActivity, paceToSpeed } from './units'
import {
  formatPaceLabel,
  formatSpeedLabel,
  formatDistance,
  formatDuration,
  formatPauseLabel,
  formatSeconds,
  formatLoad,
  formatSetsReps,
} from './format'
import {
  SECTION_LABELS,
  normalizeSection,
  computeSectionDuration,
  computeSectionDistance,
} from './sections'

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
  return !!b.main
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
    if (s.kind === 'exercise') {
      const name = s.exerciseName?.trim() || 'Øvelse'
      const parts = [formatSetsReps(s.sets, s.reps)]
      if (s.loadKg > 0) parts.push(formatLoad(s.loadKg))
      if (s.restSec > 0) parts.push(formatPauseLabel(s.restSec))
      return `${name}: ${parts.join(', ')}`
    }
    if (s.kind === 'effort' || (s.distanceKm === 0 && s.durationMin != null && s.paceSecPerKm == null)) {
      return `${label}: ${formatDuration(s.durationMin)}`
    }
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
