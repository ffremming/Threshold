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
  EDWARDS_ZONE_WEIGHTS,
  ME_ZONE_WEIGHTS,
  ME_RAW_MIN_MINUTES,
  ME_EFF_FLOOR,
  ME_EXPONENT,
  SPEED_PER_SPRINT,
} from './constants'
import { strengthDose, musclesWorkedFromSession } from './strength'

// Strength dose -> load scaling, to add strength sessions onto the same load
// total as Edwards cardio TRIMP. NOTE: the literature has no validated method to
// merge resistance volume-load with HR-zone TRIMP into one number (session-RPE ×
// duration is the only modality-agnostic metric). This scale is therefore a
// pragmatic composite chosen so a full strength session reads comparably to a
// moderate cardio session — not a validated equivalence.
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
// `zone` may be fractional (e.g. a "Zone 1–2" session averages to 1.5); the
// quality split is then interpolated between the two adjacent zone rows.
// An out-of-range zone falls back to the Zone 2 split.
export function doseFromMinutesInZone(minutes, zone) {
  if (!(zone >= 1 && zone <= 5)) {
    const w = ZONE_WEIGHTS[2]
    const out = emptyDims()
    for (const q of QUALITIES) out[q] += minutes * (w[q] || 0)
    return out
  }
  const lo = Math.floor(zone)
  const hi = Math.ceil(zone)
  const frac = zone - lo
  const wlo = ZONE_WEIGHTS[lo]
  const whi = ZONE_WEIGHTS[hi]
  const out = emptyDims()
  for (const q of QUALITIES) {
    const a = wlo[q] || 0
    const b = whi[q] || 0
    out[q] += minutes * (a + (b - a) * frac)
  }
  return out
}

// Edwards' summated-HR-zone TRIMP: load = minutes × the zone's weight. The
// Edwards weights equal the zone number, so a fractional zone (e.g. 1.5 for a
// Zone 1–2 session) weights linearly: 1.5/min.
function cardioBlockLoad(minutes, zone) {
  const weight = Math.max(1, Math.min(5, zone))
  return minutes * weight
}

// Per-minute muscular-endurance weight for a zone (1..5; fractional zones
// interpolate). Threshold (Z3) is the deliberate ×3 jump.
function meZoneWeight(zone) {
  const z = Math.max(1, Math.min(5, zone))
  const lo = Math.floor(z)
  const hi = Math.ceil(z)
  if (lo === hi) return ME_ZONE_WEIGHTS[lo]
  return ME_ZONE_WEIGHTS[lo] + (ME_ZONE_WEIGHTS[hi] - ME_ZONE_WEIGHTS[lo]) * (z - lo)
}

// Long-and-hard muscular-endurance dose. Two gates: the session must be long
// enough in real clock time (so short sessions score zero however intense) AND
// clear the effective-minutes floor. Above both, only the excess counts, mildly
// super-linear so one long effort beats several short ones.
function muscularEnduranceDose(rawClockMin, effectiveMin) {
  if (rawClockMin < ME_RAW_MIN_MINUTES) return 0
  if (effectiveMin < ME_EFF_FLOOR) return 0
  return Math.pow(effectiveMin - ME_EFF_FLOOR, ME_EXPONENT)
}

// Resolve the intensity zone for a section. Sections do not carry their own
// zone; warm-ups/cooldowns are Zone 1, everything else inherits the workout's
// intensity. A multi-zone tag (e.g. "Zone 1–2") is AVERAGED — a Z1–2 jog uses
// 1.5, not the top zone — so an easy session isn't over-loaded and structured
// and text-only scoring agree.
function sectionZone(section, workout) {
  if (section.kind === 'warmup' || section.kind === 'cooldown') return 1
  const zones = normalizeIntensityZones(workout?.type, workout?.intensityZone)
  if (zones && zones.length > 0) {
    return zones.reduce((a, b) => a + b, 0) / zones.length
  }
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
  // Muscular endurance: tally the session's total real work minutes (the raw
  // clock gate) and its zone-weighted effective minutes (Σ min × meZoneWeight).
  let sessionMin = 0
  let sessionEffMin = 0

  for (const section of sections) {
    if (section.kind === 'exercise') {
      // Strength sections are handled in aggregate below (muscle-based).
      continue
    }

    if (section.kind === 'sprint') {
      const minutes = computeSectionWorkMinutes(section, workout?.activityTag) || 0
      const reps = Math.max(0, Number(section.reps) || 0)
      // Sprint reps drive speed directly (continuous, no minimum-count gate).
      dims.speed += reps * SPEED_PER_SPRINT
      // Plus the small aerobic/vo2 share of the sprint minutes.
      dims.vo2max += minutes * SPRINT_WEIGHT.vo2max
      load += cardioBlockLoad(minutes, 5)
      sessionMin += minutes
      sessionEffMin += minutes * meZoneWeight(5)
      continue
    }

    const minutes = computeSectionWorkMinutes(section, workout?.activityTag) || 0
    if (minutes <= 0) continue
    const zone = sectionZone(section, workout)
    addDims(dims, doseFromMinutesInZone(minutes, zone))
    load += cardioBlockLoad(minutes, zone)
    sessionMin += minutes
    sessionEffMin += minutes * meZoneWeight(zone)
  }

  // Muscular endurance: long-and-hard gates on real minutes + effective minutes.
  dims.muscular_endurance += muscularEnduranceDose(sessionMin, sessionEffMin)

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
    let effMin = 0
    for (const z of list) {
      addDims(dims, doseFromMinutesInZone(per, z))
      load += cardioBlockLoad(per, z)
      effMin += per * meZoneWeight(z)
    }
    // Muscular endurance: same long-and-hard gates as structured sessions —
    // short text-only sessions score zero, only long ones accrue.
    dims.muscular_endurance += muscularEnduranceDose(minutes, effMin)
    return { load: Math.round(load), dims, musclesWorked: {}, fidelity: 'estimated' }
  }

  return { load: 0, dims, musclesWorked: {}, fidelity: 'estimated' }
}
