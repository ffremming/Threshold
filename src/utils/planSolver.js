// Volume-first constraint solver. Picks bank candidates to add to a week so the
// projected totals (existing + chosen) best hit the target. Pure: operates on
// pre-scored primitives (no dimensions/Firestore here). Greedy seed + local
// search (add/remove/swap) over a deterministic candidate order.

const HIGH_INTENSITY = new Set(['threshold', 'vo2max', 'speed', 'strength'])

// Weights: volume dominates; activity/quality break ties (spec: volume-first).
const W_DIST = 1.0
const W_TIME = 1.0
const W_ACT = 0.4
const W_QUAL = 0.4
// Per-slot eligibility penalty when a candidate mismatches a day's intensity tag.
const TAG_PENALTY = 0.25
// Per-slot reward (negative cost) for filling a tagged day with a matching
// intensity, so the solver prefers placing a session on the day it fits rather
// than escaping to an untagged day.
const TAG_BONUS = 0.15

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]

function candidateIsHigh(c) {
  return (c.qualities || []).some(q => HIGH_INTENSITY.has(q))
}

// Per-slot cost for placing candidate c on a day with the given tag:
//   Infinity   rest day — cannot place
//   +PENALTY   mismatch (high session on easy day, or easy session on hard day)
//   -BONUS     match (high on hard, low on easy) — actively preferred
//   0          untagged day — neutral
function tagMismatch(c, tag) {
  if (tag === 'rest') return Infinity
  if (!tag) return 0
  const high = candidateIsHigh(c)
  if (tag === 'hard') return high ? -TAG_BONUS : TAG_PENALTY
  if (tag === 'easy') return high ? TAG_PENALTY : -TAG_BONUS
  return 0
}

// Project totals from existing + a list of chosen candidates.
function project(existingTotals, chosen) {
  let distance = existingTotals.distance
  let durationMin = existingTotals.durationMin
  const byActivity = {}
  for (const [tag, v] of Object.entries(existingTotals.byActivity || {})) {
    byActivity[tag] = { distance: v.distance || 0, duration: v.duration || 0 }
  }
  for (const c of chosen) {
    distance += c.distance
    durationMin += c.duration
    const a = (byActivity[c.activityTag] ||= { distance: 0, duration: 0 })
    a.distance += c.distance
    a.duration += c.duration
  }
  return { distance, durationMin, byActivity }
}

// Cost of a projection vs target (lower better). Includes per-placement tag
// penalties so day-fit influences selection.
function cost(target, proj, chosen, dayAssign, dayTags) {
  let c = 0
  if (target.distanceKm > 0) c += W_DIST * Math.abs(proj.distance - target.distanceKm) / target.distanceKm
  if (target.durationMin > 0) c += W_TIME * Math.abs(proj.durationMin - target.durationMin) / target.durationMin

  // Activity distribution (L1 over duration shares) — only if a distribution is set.
  const dist = target.distribution
  if (dist && Object.keys(dist).length > 0 && proj.durationMin > 0) {
    const total = Object.values(dist).reduce((s, v) => s + v, 0) || 1
    let l1 = 0
    const allTags = new Set([...Object.keys(dist), ...Object.keys(proj.byActivity)])
    for (const tag of allTags) {
      const wantShare = (dist[tag] || 0) / total
      const haveShare = (proj.byActivity[tag]?.duration || 0) / proj.durationMin
      l1 += Math.abs(wantShare - haveShare)
    }
    c += W_ACT * l1
  }

  // Quality focus: penalize each focus quality not represented by any chosen
  // session — proportional shortfall.
  const qf = target.qualities || []
  if (qf.length > 0) {
    const served = new Set()
    for (const ch of chosen) for (const q of ch.qualities || []) served.add(q)
    let missing = 0
    for (const q of qf) if (!served.has(q)) missing += 1
    c += W_QUAL * (missing / qf.length)
  }

  // Per-placement tag fit: translate each placement's assigned weekday to its
  // intensity tag, then apply the match bonus / mismatch penalty.
  for (const p of chosen) {
    const weekday = dayAssign.get(p)
    const tag = weekday != null ? (dayTags?.[weekday] || null) : null
    c += tagMismatch(p, tag)
  }
  return c
}

// Assign chosen candidates to the best eligible (non-rest) weekday, greedily by
// tag fit, one session per day. Returns Map(candidate → weekday) and the subset
// that found a day (placeable).
function assignDays(chosen, dayTags) {
  const usedDays = new Set()
  const assign = new Map()
  const placeable = []
  // High-intensity candidates pick first so they claim hard days.
  const order = [...chosen].sort((a, b) => Number(candidateIsHigh(b)) - Number(candidateIsHigh(a)))
  for (const c of order) {
    let bestDay = null
    let bestPen = Infinity
    for (const d of WEEKDAYS) {
      if (usedDays.has(d)) continue
      const pen = tagMismatch(c, dayTags[d] || null)
      if (pen < bestPen) { bestPen = pen; bestDay = d }
    }
    if (bestDay != null && bestPen !== Infinity) {
      usedDays.add(bestDay)
      assign.set(c, bestDay)
      placeable.push(c)
    }
  }
  return { assign, placeable }
}

function fitOf(target, proj) {
  return {
    distanceKm: proj.distance,
    durationMin: proj.durationMin,
    targetDistanceKm: target.distanceKm,
    targetDurationMin: target.durationMin,
  }
}

export function solveWeek(target, ctx) {
  const { existingTotals, candidates, dayTags = {}, maxAdds = 7 } = ctx
  const restCount = WEEKDAYS.filter(d => dayTags[d] === 'rest').length
  const slotCap = Math.max(0, Math.min(maxAdds, WEEKDAYS.length - restCount))
  if (slotCap === 0 || !candidates?.length) {
    return { placements: [], fit: fitOf(target, project(existingTotals, [])) }
  }

  // No hard pre-filter: volume-first means every candidate can contribute to the
  // volume target. Quality focus and activity distribution steer selection
  // through the cost function (and the per-slot tag penalty), not by excluding
  // sessions — otherwise a quality focus would starve the week of the volume it
  // needs. The full bank is the candidate pool.
  const pool = candidates.slice()

  // A "chosen" entry is an INSTANCE: a candidate wrapped with a unique _slot id,
  // so the same bank template can be selected for two days without two entries
  // collapsing under object identity (Map keys, assignment, includes()).
  let slotSeq = 0
  const instantiate = c => ({ ...c, _slot: slotSeq++ })

  function evalCost(list) {
    const { assign, placeable } = assignDays(list, dayTags)
    const proj = project(existingTotals, placeable)
    return { c: cost(target, proj, placeable, assign, dayTags), assign, placeable, proj }
  }

  // Greedy seed: repeatedly add the candidate that most lowers cost.
  let chosen = []
  let cur = evalCost(chosen)
  while (chosen.length < slotCap) {
    let best = null
    for (const c of pool) {
      const inst = instantiate(c)
      const trial = evalCost([...chosen, inst])
      if (trial.placeable.length <= chosen.length) continue // couldn't place (no day)
      if (best === null || trial.c < best.c) best = { c: trial.c, inst, state: trial }
    }
    if (!best || best.c >= cur.c) break // no add strictly improves
    chosen = [...chosen, best.inst]
    cur = best.state
  }

  // Local search: swap a chosen slot for a different pool candidate, or drop one,
  // while it lowers cost. Index-based so instance identity stays intact.
  let improved = true
  let guard = 0
  while (improved && guard < 200) {
    improved = false
    guard += 1
    for (let i = 0; i < chosen.length && !improved; i++) {
      for (const c of pool) {
        if (c.id === chosen[i].id) continue
        const next = chosen.slice()
        next[i] = instantiate(c)
        const trial = evalCost(next)
        if (trial.c < cur.c - 1e-9) { chosen = next; cur = trial; improved = true; break }
      }
    }
    if (!improved) {
      for (let i = 0; i < chosen.length; i++) {
        const next = chosen.slice()
        next.splice(i, 1)
        const trial = evalCost(next)
        if (trial.c < cur.c - 1e-9) { chosen = next; cur = trial; improved = true; break }
      }
    }
  }

  const placements = cur.placeable.map(c => ({
    session: { ...c.template, distance: c.distance, duration: c.duration, activityTag: c.activityTag, id: c.id },
    weekday: cur.assign.get(c),
  }))
  return { placements, fit: fitOf(target, cur.proj) }
}

// Re-solve a single slot: pick the best different candidate for one weekday,
// honoring that day's intensity tag. Returns { session, weekday } or null.
export function replaceSlot(target, ctx, _frozenChosen, openWeekday) {
  const { candidates, dayTags = {} } = ctx
  const tag = dayTags[openWeekday] || null
  if (tag === 'rest') return null
  let best = null
  for (const c of candidates) {
    const pen = tagMismatch(c, tag)
    if (pen === Infinity) continue
    if (best === null || pen < best.pen) best = { pen, cand: c }
  }
  return best
    ? {
        session: { ...best.cand.template, distance: best.cand.distance, duration: best.cand.duration, activityTag: best.cand.activityTag, id: best.cand.id },
        weekday: openWeekday,
      }
    : null
}
