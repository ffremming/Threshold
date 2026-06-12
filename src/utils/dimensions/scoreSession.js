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
  ME_CONT_THRESHOLD_MIN,
  ME_INTERVAL_THRESHOLD_MIN,
  ME_BASELINE,
  ME_SLOPE,
  ME_KNEE,
  ME_TAIL,
  ME_TAIL_KNEE,
  ME_INTENSITY_BASE,
  ME_INTENSITY_ZONE_SCALE,
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

// Muscular-endurance intensity weighting (long hard counts more than long easy).
function meIntensityFactor(zone) {
  return ME_INTENSITY_BASE + ME_INTENSITY_ZONE_SCALE * zone
}

// S-curve on duration past a threshold: 0 below threshold, a baseline step at
// the threshold, a linear ramp to +ME_KNEE excess minutes, then diminishing.
// `durationMin` is the qualifying duration (continuous total, or interval-work
// total); `thresholdMin` is the trigger; `zone` weights intensity.
function muscularEnduranceDose(durationMin, thresholdMin, zone) {
  const excess = durationMin - thresholdMin
  if (excess <= 0) return 0
  let val
  if (excess <= ME_KNEE) {
    val = ME_BASELINE + ME_SLOPE * excess
  } else {
    const past = excess - ME_KNEE
    val = ME_BASELINE + ME_SLOPE * ME_KNEE + ME_TAIL * (1 - Math.exp(-past / ME_TAIL_KNEE))
  }
  return val * meIntensityFactor(zone)
}

// Resolve the intensity zone for a section. Sections do not carry their own
// zone; warm-ups/cooldowns are Zone 1, everything else inherits the workout's
// normalized intensity zone.
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
  // Muscular endurance is computed per-session from accumulated long work, so
  // we tally the qualifying durations here and apply the S-curve after the walk.
  let continuousMin = 0 // total time-on-feet of continuous (non-interval) work
  let intervalWorkMin = 0 // total interval work time across the session
  let continuousZoneWeighted = 0 // for an intensity estimate of the continuous work
  let intervalZoneWeighted = 0

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

    if (section.kind === 'interval') {
      intervalWorkMin += minutes
      intervalZoneWeighted += minutes * zone
    } else {
      // steady / effort / warmup / cooldown all count as continuous time-on-feet
      continuousMin += minutes
      continuousZoneWeighted += minutes * zone
    }
  }

  // Muscular endurance: S-curve on long continuous duration and on long total
  // interval-work time (each only past its trigger).
  if (continuousMin >= ME_CONT_THRESHOLD_MIN) {
    const z = continuousMin > 0 ? continuousZoneWeighted / continuousMin : 2
    dims.muscular_endurance += muscularEnduranceDose(continuousMin, ME_CONT_THRESHOLD_MIN, z)
  }
  if (intervalWorkMin >= ME_INTERVAL_THRESHOLD_MIN) {
    const z = intervalWorkMin > 0 ? intervalZoneWeighted / intervalWorkMin : 3
    dims.muscular_endurance += muscularEnduranceDose(intervalWorkMin, ME_INTERVAL_THRESHOLD_MIN, z)
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
    // A long continuous text-only session also builds muscular endurance
    // (same 2 h trigger + S-curve as structured sessions).
    if (minutes >= ME_CONT_THRESHOLD_MIN) {
      const z = list.length ? list.reduce((a, b) => a + b, 0) / list.length : 2
      dims.muscular_endurance += muscularEnduranceDose(minutes, ME_CONT_THRESHOLD_MIN, z)
    }
    return { load: Math.round(load), dims, musclesWorked: {}, fidelity: 'estimated' }
  }

  return { load: 0, dims, musclesWorked: {}, fidelity: 'estimated' }
}
