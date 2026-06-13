import { useCallback, useMemo } from 'react'
import { computeWeekSummary, sessionDuration, sessionDistance } from '../../utils/weekSummary'
import { sessionCategories } from '../../utils/sessionCategory'
import { weekTargetKey } from '../../utils/weekTargetTypes'
import { deriveWeekTargets } from '../../utils/planRamp'
import { solveWeek } from '../../utils/planSolver'

// Build solver candidates from the template bank: each gets duration/distance
// and the qualities it trains (via sessionCategories).
function buildCandidates(templates, resolveMuscles) {
  return (templates || []).map(tpl => ({
    id: tpl.id,
    template: tpl,
    activityTag: tpl.activityTag || 'unknown',
    duration: sessionDuration(tpl),
    distance: sessionDistance(tpl),
    qualities: sessionCategories(tpl, { resolveMuscles }),
  }))
}

const HIGH_INTENSITY = new Set(['threshold', 'vo2max', 'speed', 'strength'])

// Count existing sessions that train a high-intensity quality (toward the cap).
function countHard(workouts, resolveMuscles) {
  let n = 0
  for (const w of workouts || []) {
    const qs = sessionCategories(w, { resolveMuscles })
    if (qs.some(q => HIGH_INTENSITY.has(q))) n += 1
  }
  return n
}

// Existing-week totals shaped for the solver.
function buildExistingTotals(workouts, resolveMuscles) {
  const s = computeWeekSummary(workouts || [], { resolveMuscles })
  const byActivity = {}
  for (const tag of new Set([...Object.keys(s.activityDistance), ...Object.keys(s.activityDuration)])) {
    byActivity[tag] = { distance: s.activityDistance[tag] || 0, duration: s.activityDuration[tag] || 0 }
  }
  return {
    distance: s.totalDistance,
    durationMin: s.totalDuration,
    byActivity,
    byQuality: {},
    hardCount: countHard(workouts, resolveMuscles),
  }
}

// Quick-build controller: ONE start volume + a ramp drives every selected week.
// No per-week editing — the single input seeds the first selected week, the ramp
// derives the rest (bending down for deload/taper bands and A-race goals), and
// the solver fills each week from the bank around any existing sessions.
export function useQuickBuild({
  plan, overviewWeeks, overviewWorkoutsByWeekKey, templates, onAddManySessions, resolveMuscles,
}) {
  const bands = plan?.bands || []
  const goals = plan?.goals || []

  const candidates = useMemo(
    () => buildCandidates(templates, resolveMuscles),
    [templates, resolveMuscles])

  // Generate sessions across `range` ([{week,year}]) from a single start volume
  // plus block-level quality/intensity/activity parameters applied to every week.
  // `opts = { startVolume, unit:'time'|'distance', rampPct, qualityWeights,
  // hardPerWeek, distribution }`. The first week in range is the typed base;
  // deriveWeekTargets ramps the rest and applies deload/taper coding. The solver
  // fills each week from the bank around existing sessions. One batched insert.
  const generate = useCallback((range, opts) => {
    const selected = range || []
    if (selected.length === 0) return
    const {
      startVolume, unit = 'time', rampPct = 0,
      qualityWeights = null, hardPerWeek = null, distribution = null,
    } = opts || {}
    if (!(startVolume > 0)) return

    // Seed the ramp: the first selected week carries the typed start volume in the
    // chosen unit; later weeks derive. Sort selection chronologically so the ramp
    // climbs in calendar order.
    const sorted = [...selected].sort((a, b) =>
      a.year - b.year || a.week - b.week)
    const first = sorted[0]
    const baseTarget = {
      id: 'quickbuild-base',
      week: first.week,
      year: first.year,
      base: true,
      distanceKm: unit === 'distance' ? startVolume : null,
      durationMin: unit === 'time' ? startVolume : null,
      distribution: null,
      qualities: [],
      dayTags: {},
      deload: false,
    }

    const resolved = deriveWeekTargets(
      sorted.map(w => ({ week: w.week, year: w.year })),
      { weekTargets: [baseTarget], planSettings: { rampPct, deloadEveryN: 0, deloadPct: 60, taperPct: 40, taperWeeks: 2 }, bands, goals },
    )

    const items = []
    for (const { week, year } of sorted) {
      const key = weekTargetKey(week, year)
      const r = resolved.get(key)
      if (!r) continue
      const target = {
        distanceKm: r.distanceKm || 0,
        durationMin: r.durationMin || 0,
        distribution: distribution && Object.keys(distribution).length ? distribution : null,
        qualities: [],
        qualityWeights: qualityWeights && Object.keys(qualityWeights).length ? qualityWeights : null,
        hardPerWeek: hardPerWeek != null ? hardPerWeek : null,
      }
      if (!(target.distanceKm > 0) && !(target.durationMin > 0)) continue

      const workouts = overviewWorkoutsByWeekKey?.[key] || []
      const usedDays = new Set(workouts.map(w => Number(w.weekday)))
      const maxAdds = Math.max(0, 7 - usedDays.size)
      const { placements } = solveWeek(target, {
        existingTotals: buildExistingTotals(workouts, resolveMuscles),
        candidates,
        dayTags: {},
        maxAdds,
      })
      for (const p of placements) {
        if (usedDays.has(p.weekday)) continue // one add per empty day
        items.push({ session: p.session, week, year, weekday: p.weekday })
      }
    }

    if (items.length) onAddManySessions(items)
  }, [candidates, bands, goals, overviewWorkoutsByWeekKey, resolveMuscles, onAddManySessions])

  return { generate }
}
