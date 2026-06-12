// Per-session scoring — turns one workout into per-quality stimulus + a load.
//
// Two fidelity levels:
//   - structured: walk the session's blocks (per-block physiology)
//   - estimated:  no blocks -> zone-weighted estimate from activity + intensity
// Both feed the same six quality accumulators, so structured sessions are
// simply sharper. Nothing scores zero by accident.

import { getSections } from '../../sessionBlocks'
import { computeSectionWorkMinutes } from '../../sessionBlocks/sections'
import { estimateWorkoutDuration } from '../load'
import { normalizeIntensityZone, normalizeIntensityZones } from '../intensity'
import {
  QUALITIES,
  ZONE_WEIGHTS,
  SPRINT_WEIGHT,
  STRENGTH_ACTIVITIES,
  LOAD_BASE,
  LOAD_SCALE,
  LOAD_EXP,
  LONG_SESSION_MIN,
  LONG_INTERVAL_REP_MIN,
  ME_BASE,
  ME_ZONE_SCALE,
} from './constants'
import { strengthDose, musclesWorkedFromSession } from './strength'

// Strength dose -> load scaling so strength load is comparable to cardio load.
const STRENGTH_LOAD_SCALE = 0.9
// Strength minutes -> dose for text-only strength sessions (no structured sets).
const STRENGTH_PROXY_PER_MIN = 1.1

export function emptyDims() {
  const out = {}
  for (const q of QUALITIES) out[q] = 0
  return out
}

export function addDims(target, add) {
  for (const q of QUALITIES) target[q] += add[q] || 0
  return target
}

// Split N work-minutes in an intensity zone across the intensity qualities.
export function doseFromMinutesInZone(minutes, zone) {
  const w = ZONE_WEIGHTS[zone] || ZONE_WEIGHTS[2]
  const out = emptyDims()
  for (const q of Object.keys(w)) out[q] += minutes * w[q]
  return out
}

// Steep load-per-minute curve: high zones cost much more than easy Zone 1.
function loadPerMinute(zone) {
  return LOAD_BASE + LOAD_SCALE * Math.pow(zone, LOAD_EXP)
}

function cardioBlockLoad(minutes, zone) {
  return minutes * loadPerMinute(zone)
}

// Muscular-endurance dose for a qualifying long block.
function muscularEnduranceDose(minutes, zone) {
  return minutes * (ME_BASE + ME_ZONE_SCALE * zone)
}

// Resolve the intensity zone for a section. Sections do not carry their own
// zone; warm-ups/cooldowns are Zone 1, everything else inherits the workout's
// normalized intensity zone.
function sectionZone(section, workout) {
  if (section.kind === 'warmup' || section.kind === 'cooldown') return 1
  return normalizeIntensityZone(workout?.type, workout?.intensityZone) || 2
}

// Per-rep minutes for an interval section (total work minutes / reps).
function intervalRepMinutes(section, workout, totalMinutes) {
  const reps = Math.max(1, Number(section.reps) || 1)
  return totalMinutes / reps
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

    // Muscular endurance: long continuous blocks, or intervals with long reps.
    if (section.kind === 'interval') {
      const repMin = intervalRepMinutes(section, workout, minutes)
      if (repMin >= LONG_INTERVAL_REP_MIN) {
        dims.muscular_endurance += muscularEnduranceDose(minutes, zone)
      }
    } else if (minutes >= LONG_SESSION_MIN) {
      dims.muscular_endurance += muscularEnduranceDose(minutes, zone)
    }
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
    // A long continuous text-only session also builds muscular endurance.
    if (minutes >= LONG_SESSION_MIN) {
      const z = list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 2
      dims.muscular_endurance += muscularEnduranceDose(minutes, z)
    }
    return { load: Math.round(load), dims, musclesWorked: {}, fidelity: 'estimated' }
  }

  return { load: 0, dims, musclesWorked: {}, fidelity: 'estimated' }
}
