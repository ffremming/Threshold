import { useCallback, useMemo } from 'react'
import { computeWeekSummary, sessionDuration, sessionDistance } from '../../utils/weekSummary'
import { sessionCategories } from '../../utils/sessionCategory'
import { weekTargetKey, emptyWeekTarget, normalizeDistribution } from '../../utils/weekTargetTypes'
import { deriveWeekTargets } from '../../utils/planRamp'
import { solveWeek, replaceSlot } from '../../utils/planSolver'

// Stable-ish id generator. crypto.randomUUID exists in jsdom + browsers; the
// fallback only matters in degraded environments.
let idSeq = 0
const newId = () => (globalThis.crypto?.randomUUID?.() || `wt-${idSeq++}`)

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

// Existing-week totals shaped for the solver.
function buildExistingTotals(workouts, resolveMuscles) {
  const s = computeWeekSummary(workouts || [], { resolveMuscles })
  const byActivity = {}
  for (const tag of new Set([...Object.keys(s.activityDistance), ...Object.keys(s.activityDuration)])) {
    byActivity[tag] = { distance: s.activityDistance[tag] || 0, duration: s.activityDuration[tag] || 0 }
  }
  return { distance: s.totalDistance, durationMin: s.totalDuration, byActivity, byQuality: {} }
}

// Controller hook bridging the pure ramp/solver utils to React + persistence. It
// owns no UI state beyond memoized derivations; week-target edits persist through
// planActions, and generated sessions go out via onAddManySessions.
export function usePlanTargets({
  plan, planActions, overviewWeeks, overviewWorkoutsByWeekKey, templates,
  onAddManySessions, resolveMuscles,
}) {
  const weekTargets = plan?.weekTargets || []
  const planSettings = plan?.planSettings || null
  const bands = plan?.bands || []
  const goals = plan?.goals || []

  const candidates = useMemo(
    () => buildCandidates(templates, resolveMuscles),
    [templates, resolveMuscles])

  // Ramp-resolved targets for every overview week.
  const resolved = useMemo(
    () => deriveWeekTargets(
      (overviewWeeks || []).map(w => ({ week: w.week, year: w.year })),
      { weekTargets, planSettings, bands, goals },
    ),
    [overviewWeeks, weekTargets, planSettings, bands, goals])

  const targetByKey = useMemo(() => {
    const m = new Map()
    for (const t of weekTargets) m.set(weekTargetKey(t.week, t.year), t)
    return m
  }, [weekTargets])

  const getTarget = useCallback(
    (week, year) => targetByKey.get(weekTargetKey(week, year)) || null,
    [targetByKey])

  // Upsert a patch onto a week's target (creating it if absent).
  const setTarget = useCallback((week, year, patch) => {
    const existing = getTarget(week, year)
    const baseT = existing || emptyWeekTarget(week, year, newId())
    planActions.upsertWeekTarget({ ...baseT, ...patch })
  }, [getTarget, planActions])

  const setDayTag = useCallback((week, year, weekday, tag) => {
    const existing = getTarget(week, year) || emptyWeekTarget(week, year, newId())
    const dayTags = { ...(existing.dayTags || {}) }
    if (tag == null) delete dayTags[weekday]
    else dayTags[weekday] = tag
    planActions.upsertWeekTarget({ ...existing, dayTags })
  }, [getTarget, planActions])

  const setSettings = useCallback(patch => planActions.setPlanSettings(patch), [planActions])

  // Build the resolved target object for a week (ramp value falling back to typed).
  const targetForWeek = useCallback((week, year) => {
    const key = weekTargetKey(week, year)
    const t = targetByKey.get(key)
    const r = resolved.get(key)
    const distanceKm = (r?.distanceKm ?? t?.distanceKm) || 0
    const durationMin = (r?.durationMin ?? t?.durationMin) || 0
    return {
      target: {
        distanceKm, durationMin,
        distribution: t?.distribution ? normalizeDistribution(t.distribution) : null,
        qualities: t?.qualities || [],
      },
      weekTarget: t,
      hasGoal: Boolean(t) || distanceKm > 0 || durationMin > 0,
    }
  }, [targetByKey, resolved])

  // Solve a single week into placements (existing kept, only empty days filled).
  const solveForWeek = useCallback((week, year) => {
    const key = weekTargetKey(week, year)
    const { target, weekTarget, hasGoal } = targetForWeek(week, year)
    if (!hasGoal) return { placements: [], target: null }
    const workouts = overviewWorkoutsByWeekKey?.[key] || []
    const usedDays = new Set(workouts.map(w => Number(w.weekday)))
    const restCount = Object.values(weekTarget?.dayTags || {}).filter(x => x === 'rest').length
    const maxAdds = Math.max(0, 7 - restCount - usedDays.size)
    const { placements } = solveWeek(target, {
      existingTotals: buildExistingTotals(workouts, resolveMuscles),
      candidates,
      dayTags: weekTarget?.dayTags || {},
      maxAdds,
    })
    // One add per empty day: drop any placement landing on a day with a session.
    const filtered = placements.filter(p => !usedDays.has(p.weekday))
    return { placements: filtered, target }
  }, [targetForWeek, overviewWorkoutsByWeekKey, candidates, resolveMuscles])

  // Generate across a list of {week,year}: collect placements, one batched insert.
  const generate = useCallback(range => {
    const items = []
    for (const { week, year } of range || []) {
      const { placements } = solveForWeek(week, year)
      for (const p of placements) {
        items.push({ session: p.session, week, year, weekday: p.weekday })
      }
    }
    if (items.length) onAddManySessions(items)
  }, [solveForWeek, onAddManySessions])

  // Replace a single placed session: re-solve its slot for the next-best candidate.
  const replaceSession = useCallback(workout => {
    const week = Number(workout.week)
    const year = Number(workout.year)
    const { target, weekTarget } = targetForWeek(week, year)
    return replaceSlot(target, { candidates, dayTags: weekTarget?.dayTags || {} }, [], Number(workout.weekday))
  }, [targetForWeek, candidates])

  return { resolved, getTarget, setTarget, setDayTag, setSettings, generate, replaceSession, solveForWeek }
}
