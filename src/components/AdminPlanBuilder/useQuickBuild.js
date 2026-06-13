import { useCallback, useMemo } from 'react'
import { computeWeekSummary, sessionDuration, sessionDistance } from '../../utils/weekSummary'
import { sessionCategories } from '../../utils/sessionCategory'
import { activityMinutesPerKm } from '../../utils/load'
import { weekTargetKey } from '../../utils/weekTargetTypes'
import { deriveWeekTargets } from '../../utils/planRamp'
import { solveWeek } from '../../utils/planSolver'

// Convert one per-activity volume target to minutes. Distance targets are sized
// by the activity's rough pace; time targets pass through.
function activityTargetMinutes({ tag, volume, unit }) {
  const v = Number(volume) || 0
  if (v <= 0) return 0
  return unit === 'distance' ? v * activityMinutesPerKm(tag) : v
}

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

// Quick-build controller: per-activity volume targets (each distance- or
// time-based, each hard-enabled or not) drive every selected week. The summed
// time seeds a weekly ramp; the per-activity time shares become the activity
// distribution; the hard-enabled tags become the solver's hard allow-set. The
// solver fills each week from the bank around existing sessions.
export function useQuickBuild({
  plan, overviewWeeks, overviewWorkoutsByWeekKey, templates, onAddManySessions, resolveMuscles,
}) {
  const bands = plan?.bands || []
  const goals = plan?.goals || []

  const candidates = useMemo(
    () => buildCandidates(templates, resolveMuscles),
    [templates, resolveMuscles])

  // Generate across `range` ([{week,year}]).
  // `opts = { activities: [{ tag, volume, unit:'distance'|'time' }],
  //           rampPct, qualityWeights, hardPerWeek }`.
  // Anchor-sets-the-scale: each activity's volume → minutes (distance via pace);
  // the sum is the week-1 time base, ramped across the span. Per-activity minute
  // shares form the distribution. hardPerWeek caps total hard sessions (one per
  // hard day) across all activities.
  const generate = useCallback((range, opts) => {
    const selected = range || []
    if (selected.length === 0) return
    const { activities = [], rampPct = 0, qualityWeights = null, hardPerWeek = null } = opts || {}

    // Per-activity minutes; drop non-positive. Distribution shares come from the
    // same rows.
    const perActivity = (activities || [])
      .map(a => ({ tag: a.tag, minutes: activityTargetMinutes(a) }))
      .filter(a => a.tag && a.minutes > 0)
    if (perActivity.length === 0) return

    const totalMinutes = perActivity.reduce((s, a) => s + a.minutes, 0)
    if (!(totalMinutes > 0)) return

    const distribution = {}
    for (const a of perActivity) distribution[a.tag] = (a.minutes / totalMinutes) * 100

    // Seed the ramp: the first selected week carries the total time; later weeks
    // derive. Sort the selection chronologically so the ramp climbs in order.
    const sorted = [...selected].sort((a, b) => a.year - b.year || a.week - b.week)
    const first = sorted[0]
    const baseTarget = {
      id: 'quickbuild-base',
      week: first.week,
      year: first.year,
      base: true,
      distanceKm: null,
      durationMin: totalMinutes,
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
      if (!r || !(r.durationMin > 0)) continue
      const target = {
        distanceKm: 0,
        durationMin: r.durationMin,
        distribution,
        qualities: [],
        qualityWeights: qualityWeights && Object.keys(qualityWeights).length ? qualityWeights : null,
        hardPerWeek: hardPerWeek != null ? hardPerWeek : null,
      }

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
