// Pure ramp/deload/taper engine. Given chronological weeks and the plan's typed
// targets + settings + bands + goals, resolve a distance/time target for every
// week. Typed values win; otherwise ramp from the running pre-reduction value;
// deload/taper bend the displayed value down without lowering the running base
// (so the build resumes after a deload).

import { weekTargetKey } from './weekTargetTypes'
import { getWeekDates } from './week'

const DAY_MS = 24 * 60 * 60 * 1000

// Mon..Sun epoch-ms bounds for an ISO (week, year). getWeekDates returns Dates
// at local midnight; we extend to the end of Sunday.
function weekBounds(week, year) {
  const { monday } = getWeekDates(week, year)
  const start = monday.getTime()
  const end = start + 7 * DAY_MS - 1
  return { start, end }
}

// Does a reduction-phase band (recovery/taper) overlap this week?
function weekInReductionBand(week, year, bands) {
  if (!Array.isArray(bands) || bands.length === 0) return false
  const { start, end } = weekBounds(week, year)
  return bands.some(b => {
    if (b.type !== 'recovery' && b.type !== 'taper') return false
    const bs = Number(b.startDate)
    const be = Number(b.endDate)
    if (!Number.isFinite(bs) || !Number.isFinite(be)) return false
    return bs <= end && start <= be
  })
}

// For any priority-A goal, how many whole weeks before the goal's week is THIS
// week? Returns the taper position: 0 = the goal's own week (lowest volume), up
// to taperWeeks-1 = the first (highest) taper week. -1 if not in any A-goal's
// taper window. When multiple A-goals apply, the nearest (lowest position) wins.
function taperPosition(week, year, goals, taperWeeks) {
  if (!Array.isArray(goals) || taperWeeks <= 0) return -1
  const { start, end } = weekBounds(week, year)
  let best = -1
  for (const g of goals) {
    if (g.priority !== 'A' || !g.date) continue
    const goalMs = new Date(`${g.date}T00:00:00`).getTime()
    if (goalMs < start) continue // goal already past this week
    let pos
    if (goalMs >= start && goalMs <= end) {
      pos = 0 // goal is in THIS week
    } else {
      const weeksUntil = Math.floor((goalMs - start) / (7 * DAY_MS))
      if (weeksUntil < 1 || weeksUntil > taperWeeks - 1) continue
      pos = weeksUntil
    }
    if (best === -1 || pos < best) best = pos
  }
  return best
}

export function deriveWeekTargets(weeks, ctx) {
  const { weekTargets = [], planSettings = null, bands = [], goals = [] } = ctx || {}
  const byKey = new Map(weekTargets.map(t => [weekTargetKey(t.week, t.year), t]))
  const out = new Map()

  // Running pre-reduction base (the ramp's accumulator). Null until the first
  // typed week seeds it.
  let prevDist = null
  let prevDur = null
  let idx = 0 // 1-based index within the block, for cadence deloads

  for (const { week, year } of weeks) {
    const key = weekTargetKey(week, year)
    const typed = byKey.get(key)
    const hasTyped = typed && (typed.distanceKm != null || typed.durationMin != null)
    idx += 1

    if (hasTyped) {
      const distanceKm = typed.distanceKm != null ? typed.distanceKm : prevDist
      const durationMin = typed.durationMin != null ? typed.durationMin : prevDur
      out.set(key, { distanceKm, durationMin, source: 'typed' })
      prevDist = distanceKm
      prevDur = durationMin
      continue
    }

    if (!planSettings || prevDist == null) {
      // No ramp, or nothing to ramp from → untargeted week (skip).
      continue
    }

    // Ramp up from the running base; advance the base (reductions never lower it).
    const factor = 1 + (planSettings.rampPct || 0) / 100
    const rampedDist = prevDist * factor
    const rampedDur = prevDur != null ? prevDur * factor : null
    prevDist = rampedDist
    prevDur = rampedDur

    // Reduction priority: taper (A-race) > band > cadence > manual.
    const tpos = taperPosition(week, year, goals, planSettings.taperWeeks)
    if (tpos >= 0) {
      const tw = Math.max(1, planSettings.taperWeeks)
      const frac = planSettings.taperPct / 100
      // Linear step-down across the window: first taper week ≈ ramped, goal week
      // = taperPct. t goes 0 (first week) → 1 (goal week).
      const t = (tw - 1 - tpos) / Math.max(1, tw - 1)
      const reduce = 1 - t * (1 - frac)
      out.set(key, {
        distanceKm: rampedDist * reduce,
        durationMin: rampedDur != null ? rampedDur * reduce : null,
        source: 'taper',
      })
      continue
    }

    const cadenceHit = planSettings.deloadEveryN > 0 && idx % planSettings.deloadEveryN === 0
    const bandHit = weekInReductionBand(week, year, bands)
    const manualHit = typed?.deload === true
    if (bandHit || cadenceHit || manualHit) {
      const f = planSettings.deloadPct / 100
      out.set(key, {
        distanceKm: rampedDist * f,
        durationMin: rampedDur != null ? rampedDur * f : null,
        source: 'deload',
      })
      continue
    }

    out.set(key, { distanceKm: rampedDist, durationMin: rampedDur, source: 'ramped' })
  }

  return out
}
