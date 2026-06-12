// Per-session scoring — turns one workout into per-quality stimulus + a load.
//
// Two fidelity levels:
//   - structured: walk the session's blocks (per-block physiology)
//   - estimated:  no blocks -> zone-weighted estimate from activity + intensity
// Both feed the same five quality accumulators, so structured sessions are
// simply sharper. Nothing scores zero by accident.

import { getSections } from '../../sessionBlocks'
import { computeSectionWorkMinutes } from '../../sessionBlocks/sections'
import { estimateWorkoutDuration } from '../load'
import { normalizeIntensityZone, normalizeIntensityZones } from '../intensity'
import { QUALITIES, ZONE_WEIGHTS, SPRINT_WEIGHT, STRENGTH_ACTIVITIES } from './constants'
import { strengthDose, musclesWorkedFromSession } from './strength'

// Strength dose -> load scaling so strength load is comparable to cardio load.
const STRENGTH_LOAD_SCALE = 0.9
// Strength minutes -> dose for text-only strength sessions (no structured sets).
const STRENGTH_PROXY_PER_MIN = 1.1

export function emptyDims() {
  return { strength: 0, endurance: 0, vo2max: 0, speed: 0, threshold: 0 }
}

export function addDims(target, add) {
  for (const q of QUALITIES) target[q] += add[q] || 0
  return target
}

// Split N work-minutes in an intensity zone across the qualities.
export function doseFromMinutesInZone(minutes, zone) {
  const w = ZONE_WEIGHTS[zone] || ZONE_WEIGHTS[2]
  const out = emptyDims()
  for (const q of Object.keys(w)) out[q] += minutes * w[q]
  return out
}

// Cardio block load — mirrors getWorkoutIntensityFactor shape (0.75 + zone*0.35).
function cardioBlockLoad(minutes, zone) {
  return minutes * (0.75 + zone * 0.35)
}

// Resolve the intensity zone to use for a section. Sections do not carry a
// zone of their own; warm-ups/cooldowns are treated as Zone 1, everything else
// inherits the workout's normalized intensity zone.
function sectionZone(section, workout) {
  if (section.kind === 'warmup' || section.kind === 'cooldown') return 1
  return normalizeIntensityZone(workout?.type, workout?.intensityZone) || 2
}

export function scoreSession(workout, opts = {}) {
  const { resolveMuscles } = opts
  const sections = getSections(workout?.blocks, workout?.activityTag)

  if (!sections || sections.length === 0) {
    return scoreSessionFallback(workout)
  }

  const dims = emptyDims()
  let load = 0

  for (const section of sections) {
    if (section.kind === 'exercise') {
      // Strength sections are handled in aggregate below (muscle-based).
      continue
    }

    if (section.kind === 'sprint') {
      const minutes = computeSectionWorkMinutes(section, workout?.activityTag) || 0
      for (const q of Object.keys(SPRINT_WEIGHT)) dims[q] += minutes * SPRINT_WEIGHT[q]
      load += cardioBlockLoad(minutes, 5)
      continue
    }

    const minutes = computeSectionWorkMinutes(section, workout?.activityTag) || 0
    if (minutes <= 0) continue
    const zone = sectionZone(section, workout)
    addDims(dims, doseFromMinutesInZone(minutes, zone))
    load += cardioBlockLoad(minutes, zone)
  }

  // Strength aggregate (from structured exercise sections + muscle resolver).
  const musclesWorked = musclesWorkedFromSession(workout, resolveMuscles)
  const sDose = strengthDose(musclesWorked)
  if (sDose > 0) {
    dims.strength += sDose
    load += sDose * STRENGTH_LOAD_SCALE
  }

  return { load: Math.round(load), dims, musclesWorked, fidelity: 'structured' }
}

export function scoreSessionFallback(workout) {
  const dims = emptyDims()
  const minutes = estimateWorkoutDuration(workout) || 0

  // Text-only strength session: duration proxy, no muscle data.
  if (STRENGTH_ACTIVITIES.has(workout?.activityTag)) {
    const sDose = Math.min(100, minutes * STRENGTH_PROXY_PER_MIN)
    dims.strength += sDose
    return { load: Math.round(sDose * STRENGTH_LOAD_SCALE), dims, musclesWorked: {}, fidelity: 'estimated' }
  }

  if (minutes > 0) {
    const zones = normalizeIntensityZones(workout?.type, workout?.intensityZone)
    const list = zones && zones.length ? zones : [2]
    const per = minutes / list.length
    let load = 0
    for (const z of list) {
      addDims(dims, doseFromMinutesInZone(per, z))
      load += cardioBlockLoad(per, z)
    }
    return { load: Math.round(load), dims, musclesWorked: {}, fidelity: 'estimated' }
  }

  return { load: 0, dims, musclesWorked: {}, fidelity: 'estimated' }
}
