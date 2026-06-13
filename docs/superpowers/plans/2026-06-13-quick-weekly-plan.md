# Quick Weekly Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a **Plan** subpage to the plan builder where a coach sets per-week distance/time/distribution/quality targets with a progression ramp, then a constraint solver fills a selected period from the session bank to hit those targets, building around existing sessions.

**Architecture:** Layered. Pure utils first (`weekTargetTypes`, `planRamp` ramp engine, `planSolver` constraint solver), then persistence (extend `planReducers` + `usePlan`), then a controller hook (`usePlanTargets`), then presentational components (`WeekRulePanel`, distribution/quality/day-tag/replace/generate controls, `PlanGridPanel`), then wiring (a third `plan` view tab). Everything reuses the existing `plans/{athleteId}` doc, `computeWeekSummary`/`scoreWeek` actuals, `onAddManySessions` atomic write, and the band/goal systems.

**Tech Stack:** React 18 (function components + hooks), Firebase Firestore, Vitest + @testing-library/react (jsdom), framer-motion + lucide-react (already in project). Pure JS (no TypeScript).

---

## File Structure

**New pure utils (no React, no Firestore):**
- `src/utils/weekTargetTypes.js` — `WeekTarget` shape consts, `weekTargetKey`, `normalizeDistribution`, `DEFAULT_DAY_TAGS`, `emptyWeekTarget`.
- `src/utils/planRamp.js` — `deriveWeekTargets(weeks, ctx)` ramp/deload/taper engine.
- `src/utils/planSolver.js` — `solveWeek(target, ctx)` constraint solver + `replaceSlot(...)`.

**Persistence (extend existing):**
- `src/utils/planReducers.js` — add `upsertWeekTarget`/`removeWeekTarget`/`setPlanSettings`; extend `normalizePlan`.
- `src/App/hooks/usePlan.js` — extend `EMPTY_PLAN`; add the three actions.

**Controller:**
- `src/components/AdminPlanBuilder/usePlanTargets.js` — owns editor state, persistence, generate, replace.

**Presentational components:**
- `src/components/AdminPlanBuilder/WeekRulePanel.jsx` — left-column rule editor + target-vs-actual bars.
- `src/components/AdminPlanBuilder/DistributionEditor.jsx` — per-activity % editor.
- `src/components/AdminPlanBuilder/QualityFocusChips.jsx` — quality multi-select chips.
- `src/components/AdminPlanBuilder/DayIntensityTag.jsx` — hard/easy/rest cell control.
- `src/components/AdminPlanBuilder/ReplaceSessionButton.jsx` — per-session replace.
- `src/components/AdminPlanBuilder/GenerateBar.jsx` — week-range readout + Generate + plan settings.
- `src/components/AdminPlanBuilder/PlanGridPanel.jsx` — the Plan-view calendar grid.
- `src/components/AdminPlanBuilder/styles/plan.css` — Plan-page styling.

**Wiring (modify existing):**
- `src/components/AdminPlanBuilder/index.jsx` — third `plan` view tab.
- `src/components/AdminPlanBuilder/buildPanelMap.jsx` — route `view==='plan'` → `PlanGridPanel`.
- `src/components/AdminPlanBuilder/styles/index.css` — import `plan.css`.

**Verified facts (do not re-derive):**
- `computeWeekSummary(workouts)` → `{ count, totalDuration, totalDistance, totalLoad, activityDuration{tag→min}, activityDistance{tag→km}, activityLoad{tag→trimp}, zones{1..5} }` — `src/utils/weekSummary.js:73`.
- `scoreWeek(workouts, opts)` → `{ dims (0–100 per quality), rawDims, load, ... }` — `src/utils/dimensions/scoreWeek.js:24`.
- `QUALITIES = ['strength','endurance','muscular_endurance','vo2max','speed','threshold']`, `QUALITY_LABELS`, `QUALITY_COLORS`, `QUALITY_ORDER` — `src/utils/dimensions/constants.js`. Re-exported via `src/utils/index.js` (`export * from './dimensions'`).
- `sessionCategories(workout, opts)` → array of qualities a session trains (≥25% of max dose) — `src/utils/sessionCategory.js:57`.
- `ACTIVITY_TAG_MAP[tag] = { value, label, icon, color, bg, group }` — `src/utils/activity.js:65`. `getSessionDomain(tag)` → `'distance'|'strength'|'duration'` from `src/sessionBlocks/units` (re-exported via `intensity.js`). Strength tags: `STRENGTH_ACTIVITIES = new Set(['strength','calisthenics','plyometric','crossfit'])` (`dimensions/constants.js:116`).
- `formatDurationLabel(min)`, `formatKmValue(km)` — `src/utils/load.js:78,93` (re-exported via index? **NO** — load.js IS re-exported: `src/utils/index.js:5 export * from './load'`. So import from `'../../utils'`).
- `onAddManySessions(items)` where `items = [{ session, week, year, weekday }]` — atomic batched insert — `templateInsertActions.js:158`.
- `usePlan` `writeField(field, nextArray)` writes one field via `setDoc(merge)` — `src/App/hooks/usePlan.js:52`.
- `planReducers.upsertById`/`removeById` are module-private; the public reducers wrap them. `normalizePlan` at `planReducers.js:113`.
- `VIEW_TABS` lives in `src/components/AdminPlanBuilder/index.jsx:14`; `view` state at line 50; `buildPanelMap` called at line 98.
- UI primitives: `Chip`, `Button`, `SportPicker`, `Tabs` from `src/components/ui` (`src/components/ui/index.jsx`).
- Overview week entries carry `{ week, year, monday, sunday, key }`; week key = `${year}-${String(week).padStart(2,'0')}` (`getWeekKey`).
- Vitest config: jsdom env, tests co-located as `*.test.js[x]`. Run a single file with `npx vitest run <path>`.

---

## Task 1: weekTargetTypes — target shape + helpers

**Files:**
- Create: `src/utils/weekTargetTypes.js`
- Test: `src/utils/weekTargetTypes.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/utils/weekTargetTypes.test.js
import { describe, it, expect } from 'vitest'
import {
  weekTargetKey, normalizeDistribution, emptyWeekTarget, DEFAULT_PLAN_SETTINGS,
} from './weekTargetTypes'

describe('weekTargetKey', () => {
  it('zero-pads the week to a stable year-week key', () => {
    expect(weekTargetKey(3, 2026)).toBe('2026-03')
    expect(weekTargetKey(40, 2026)).toBe('2026-40')
  })
})

describe('normalizeDistribution', () => {
  it('returns {} for null/empty', () => {
    expect(normalizeDistribution(null)).toEqual({})
    expect(normalizeDistribution({})).toEqual({})
  })
  it('scales shares to sum to 100, dropping non-positive', () => {
    const out = normalizeDistribution({ run: 30, bike: 10, swim: 0 })
    expect(out.run).toBeCloseTo(75)
    expect(out.bike).toBeCloseTo(25)
    expect(out.swim).toBeUndefined()
  })
  it('passes through an already-100 split unchanged', () => {
    expect(normalizeDistribution({ run: 50, bike: 50 })).toEqual({ run: 50, bike: 50 })
  })
})

describe('emptyWeekTarget', () => {
  it('builds a base target keyed by week/year with empty fields', () => {
    const t = emptyWeekTarget(5, 2026, 'id-1')
    expect(t).toMatchObject({
      id: 'id-1', week: 5, year: 2026, base: false,
      distanceKm: null, durationMin: null, distribution: null,
      qualities: [], dayTags: {}, deload: false,
    })
  })
})

describe('DEFAULT_PLAN_SETTINGS', () => {
  it('has sane ramp/deload defaults', () => {
    expect(DEFAULT_PLAN_SETTINGS).toMatchObject({
      rampPct: 5, deloadEveryN: 0, deloadPct: 60, taperPct: 40, taperWeeks: 2,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/weekTargetTypes.test.js`
Expected: FAIL — cannot resolve `./weekTargetTypes`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/utils/weekTargetTypes.js
// Shape + helpers for per-week training targets stored on plans/{athleteId}.
// Pure: no React, no Firestore. A weekTarget is keyed by (week, year); the
// distribution maps activityTag → percentage of weekly volume.

// Stable key for a (week, year) pair — zero-padded week so string sort = time
// order within a year. Mirrors getWeekKey's format.
export function weekTargetKey(week, year) {
  return `${year}-${String(week).padStart(2, '0')}`
}

// Normalize an activity distribution to percentages summing to 100. Drops
// non-positive shares; returns {} when nothing positive remains. Tolerant of
// raw weights (e.g. {run:30,bike:10} → {run:75,bike:25}).
export function normalizeDistribution(dist) {
  if (!dist) return {}
  const entries = Object.entries(dist).filter(([, v]) => Number(v) > 0)
  const total = entries.reduce((s, [, v]) => s + Number(v), 0)
  if (total <= 0) return {}
  const out = {}
  for (const [tag, v] of entries) out[tag] = (Number(v) / total) * 100
  return out
}

// A blank week target (a non-base, fully unconstrained week).
export function emptyWeekTarget(week, year, id) {
  return {
    id,
    week: Number(week),
    year: Number(year),
    base: false,
    distanceKm: null,
    durationMin: null,
    distribution: null,
    qualities: [],
    dayTags: {},
    deload: false,
  }
}

// Default block-level ramp configuration when the user first enables the ramp.
export const DEFAULT_PLAN_SETTINGS = {
  rampPct: 5,        // +5%/week build-up
  deloadEveryN: 0,   // recurring deload cadence off by default
  deloadPct: 60,     // deload week = 60% of ramped volume
  taperPct: 40,      // A-race final week = 40% of ramped volume
  taperWeeks: 2,     // taper over the final 2 weeks before an A-race
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/weekTargetTypes.test.js`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/utils/weekTargetTypes.js src/utils/weekTargetTypes.test.js
git commit -m "feat(plan): week-target shape + distribution/key helpers"
```

---

## Task 2: planRamp — ramp/deload/taper engine

**Files:**
- Create: `src/utils/planRamp.js`
- Test: `src/utils/planRamp.test.js`

Context: `deriveWeekTargets(weeks, ctx)` walks weeks chronologically. `weeks` is an array of `{ week, year }` (chronological). `ctx = { weekTargets, planSettings, bands, goals }`. Returns a `Map<key, { distanceKm, durationMin, source }>` (key from `weekTargetKey`). A week with a typed value wins; otherwise it ramps from the running pre-reduction value; deload/taper bend it down. Reductions do NOT lower the running base (build resumes after a deload).

Bands carry `startDate`/`endDate` as ms epoch (per the bands model); a week overlaps a reduction band if the band's `type` is `recovery` or `taper` and its range intersects the week's Mon–Sun. Goals carry `date` (`YYYY-MM-DD`) and `priority`.

- [ ] **Step 1: Write the failing test**

```js
// src/utils/planRamp.test.js
import { describe, it, expect } from 'vitest'
import { deriveWeekTargets } from './planRamp'
import { weekTargetKey } from './weekTargetTypes'

// Helper: chronological weeks 1..n in 2026.
const weeks = n => Array.from({ length: n }, (_, i) => ({ week: i + 1, year: 2026 }))
const base = (week, distanceKm, durationMin) => ({
  id: `w${week}`, week, year: 2026, base: true, distanceKm, durationMin,
  distribution: null, qualities: [], dayTags: {}, deload: false,
})
const get = (map, week) => map.get(weekTargetKey(week, 2026))

describe('deriveWeekTargets', () => {
  it('with no planSettings, only typed weeks get targets', () => {
    const map = deriveWeekTargets(weeks(3), {
      weekTargets: [base(1, 10, 60)], planSettings: null, bands: [], goals: [],
    })
    expect(get(map, 1)).toMatchObject({ distanceKm: 10, durationMin: 60, source: 'typed' })
    expect(get(map, 2)).toBeUndefined()
  })

  it('ramps following weeks from the base by rampPct', () => {
    const map = deriveWeekTargets(weeks(3), {
      weekTargets: [base(1, 100, 600)],
      planSettings: { rampPct: 10, deloadEveryN: 0, deloadPct: 60, taperPct: 40, taperWeeks: 2 },
      bands: [], goals: [],
    })
    expect(get(map, 1)).toMatchObject({ distanceKm: 100, source: 'typed' })
    expect(get(map, 2)).toMatchObject({ distanceKm: 110, source: 'ramped' })
    expect(get(map, 3).distanceKm).toBeCloseTo(121)
  })

  it('a typed override mid-ramp wins and reseeds the ramp', () => {
    const map = deriveWeekTargets(weeks(4), {
      weekTargets: [base(1, 100, 600), { ...base(3, 200, 1200) }],
      planSettings: { rampPct: 10, deloadEveryN: 0, deloadPct: 60, taperPct: 40, taperWeeks: 2 },
      bands: [], goals: [],
    })
    expect(get(map, 2).distanceKm).toBeCloseTo(110)   // ramped from 100
    expect(get(map, 3)).toMatchObject({ distanceKm: 200, source: 'typed' })
    expect(get(map, 4).distanceKm).toBeCloseTo(220)   // ramps from the override
  })

  it('cadence deload reduces every Nth week and the build resumes after', () => {
    const map = deriveWeekTargets(weeks(5), {
      weekTargets: [base(1, 100, 600)],
      planSettings: { rampPct: 10, deloadEveryN: 4, deloadPct: 50, taperPct: 40, taperWeeks: 2 },
      bands: [], goals: [],
    })
    // weeks 1..3 ramp; week 4 (index 4 % 4 === 0) deloads to 50% of its ramped value
    const ramped4 = 100 * 1.1 ** 3            // ≈ 133.1
    expect(get(map, 4)).toMatchObject({ source: 'deload' })
    expect(get(map, 4).distanceKm).toBeCloseTo(ramped4 * 0.5)
    // week 5 resumes from the pre-deload ramped value, not the reduced one
    expect(get(map, 5).distanceKm).toBeCloseTo(100 * 1.1 ** 4)
  })

  it('manual deload flag reduces that week', () => {
    const map = deriveWeekTargets(weeks(2), {
      weekTargets: [base(1, 100, 600), { ...base(2, null, null), base: false, deload: true }],
      planSettings: { rampPct: 10, deloadEveryN: 0, deloadPct: 60, taperPct: 40, taperWeeks: 2 },
      bands: [], goals: [],
    })
    expect(get(map, 2)).toMatchObject({ source: 'deload' })
    expect(get(map, 2).distanceKm).toBeCloseTo(110 * 0.6)
  })

  it('tapers the weeks before a priority-A goal, stepping down to taperPct', () => {
    // A-race in week 4. taperWeeks=2 → weeks 3 and 4 taper, week 4 lowest.
    const map = deriveWeekTargets(weeks(4), {
      weekTargets: [base(1, 100, 600)],
      planSettings: { rampPct: 0, deloadEveryN: 0, deloadPct: 60, taperPct: 40, taperWeeks: 2 },
      bands: [],
      goals: [{ id: 'g', date: '2026-01-22', priority: 'A' }], // week 4 of 2026 (Mon 2026-01-19..Sun 01-25)
    })
    expect(get(map, 3)).toMatchObject({ source: 'taper' })
    expect(get(map, 4)).toMatchObject({ source: 'taper' })
    // final taper week is the lowest (== taperPct of ramped 100)
    expect(get(map, 4).distanceKm).toBeCloseTo(40)
    expect(get(map, 3).distanceKm).toBeGreaterThan(get(map, 4).distanceKm)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/planRamp.test.js`
Expected: FAIL — cannot resolve `./planRamp`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/utils/planRamp.js
// Pure ramp/deload/taper engine. Given chronological weeks and the plan's typed
// targets + settings + bands + goals, resolve a distance/time target for every
// week. Typed values win; otherwise ramp from the running pre-reduction value;
// deload/taper bend the displayed value down without lowering the running base
// (so the build resumes after a deload).

import { weekTargetKey } from './weekTargetTypes'
import { getMondayOfWeek } from './week'

const DAY_MS = 24 * 60 * 60 * 1000

// Mon..Sun epoch-ms bounds for an ISO (week, year).
function weekBounds(week, year) {
  const monday = getMondayOfWeek(week, year)        // Date at local midnight Monday
  const start = monday.getTime()
  const end = start + 7 * DAY_MS - 1                 // end of Sunday
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

// For a priority-A goal, how many weeks (0-based, counting back from the goal's
// week) is this week into the taper window? Returns -1 if not tapering.
// 0 = the goal's own week (lowest), up to taperWeeks-1 = first taper week.
function taperPosition(week, year, goals, taperWeeks) {
  if (!Array.isArray(goals) || taperWeeks <= 0) return -1
  const { start, end } = weekBounds(week, year)
  let best = -1
  for (const g of goals) {
    if (g.priority !== 'A' || !g.date) return -1 === best ? best : best // skip non-A
  }
  for (const g of goals) {
    if (g.priority !== 'A' || !g.date) continue
    const goalMs = new Date(`${g.date}T00:00:00`).getTime()
    // Which taper week is this? Distance in whole weeks from this week's Monday
    // to the goal's week.
    if (goalMs < start) continue                     // goal already past this week
    const weeksUntil = Math.floor((goalMs - start) / (7 * DAY_MS))
    if (goalMs >= start && goalMs <= end) {
      // goal is in THIS week → position 0 (lowest)
      if (best === -1 || 0 < best) best = 0
    } else if (weeksUntil >= 1 && weeksUntil <= taperWeeks - 1) {
      const pos = weeksUntil                         // 1..taperWeeks-1
      if (best === -1 || pos < best) best = pos
    }
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
  let idx = 0 // index within the block, for cadence deloads

  for (const { week, year } of weeks) {
    const key = weekTargetKey(week, year)
    const typed = byKey.get(key)
    const hasTyped = typed && (typed.distanceKm != null || typed.durationMin != null)

    if (hasTyped) {
      const distanceKm = typed.distanceKm != null ? typed.distanceKm : prevDist
      const durationMin = typed.durationMin != null ? typed.durationMin : prevDur
      out.set(key, { distanceKm, durationMin, source: 'typed' })
      prevDist = distanceKm
      prevDur = durationMin
      idx += 1
      continue
    }

    if (!planSettings || prevDist == null) {
      // No ramp or nothing to ramp from → untargeted week (skip).
      idx += 1
      continue
    }

    // Ramp up from the running base.
    const factor = 1 + (planSettings.rampPct || 0) / 100
    const rampedDist = prevDist * factor
    const rampedDur = prevDur != null ? prevDur * factor : null
    // Advance the running base to the ramped value (reductions never lower it).
    prevDist = rampedDist
    prevDur = rampedDur
    idx += 1

    // Determine a reduction, priority: taper > band > cadence > manual.
    const tpos = taperPosition(week, year, goals, planSettings.taperWeeks)
    if (tpos >= 0) {
      // Linear step-down: position 0 (goal week) = taperPct; earlier weeks higher.
      const tw = Math.max(1, planSettings.taperWeeks)
      const frac = planSettings.taperPct / 100
      // pos (tw-1 .. 0) → factor from ~1 down to taperPct.
      const t = (tw - 1 - tpos) / Math.max(1, tw - 1) // 0 at first taper week, 1 at goal week
      const reduce = 1 - t * (1 - frac)               // 1 → frac
      out.set(key, { distanceKm: rampedDist * reduce, durationMin: rampedDur != null ? rampedDur * reduce : null, source: 'taper' })
      continue
    }

    const cadenceHit = planSettings.deloadEveryN > 0 && idx % planSettings.deloadEveryN === 0
    const bandHit = weekInReductionBand(week, year, bands)
    const manualHit = typed?.deload === true
    if (bandHit || cadenceHit || manualHit) {
      const f = planSettings.deloadPct / 100
      out.set(key, { distanceKm: rampedDist * f, durationMin: rampedDur != null ? rampedDur * f : null, source: 'deload' })
      continue
    }

    out.set(key, { distanceKm: rampedDist, durationMin: rampedDur, source: 'ramped' })
  }

  return out
}
```

NOTE: This depends on `getMondayOfWeek(week, year)` from `src/utils/week.js`. Before implementing, verify the export name:

Run: `grep -n "export function getMondayOfWeek\|export const getMondayOfWeek\|getMonday" src/utils/week.js`

If the function has a different name (e.g. `mondayOfIsoWeek`, `getWeekMonday`), use that name in the import and `weekBounds`. If no Monday helper exists, derive it from an existing date helper (search `src/utils/week.js` and `src/utils/weekday.js` for a `YYYY-MM-DD`/Date-from-week function and adapt). Do not invent a name.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/planRamp.test.js`
Expected: PASS. If the A-race taper test's week math is off (the goal date `2026-01-22` must fall in ISO week 4 of 2026 — verify with the project's own week util; adjust the fixture date to land in week 4 if the project uses a different ISO convention), fix the fixture, not the engine.

- [ ] **Step 5: Commit**

```bash
git add src/utils/planRamp.js src/utils/planRamp.test.js
git commit -m "feat(plan): ramp/deload/taper week-target derivation engine"
```

---

## Task 3: planSolver — constraint solver

**Files:**
- Create: `src/utils/planSolver.js`
- Test: `src/utils/planSolver.test.js`

Context: `solveWeek(target, ctx)` picks bank templates to add to a week so the projected week (existing + chosen) best hits `target`. Volume-first objective. `ctx = { existingSessions, bank, dayTags, resolveMuscles }`.

- `target` = `{ distanceKm, durationMin, distribution, qualities }` (distribution & qualities optional).
- `existingSessions` = sessions already on the calendar this week (each has `weekday`, scored via `computeWeekSummary`/`scoreSession`).
- `bank` = template list; each pre-scored to `{ template, duration, distance, activityTag, categories }`.
- `dayTags` = `{ [weekday]: 'hard'|'easy'|'rest' }`.

The solver: pre-filters candidates, greedily seeds to reach volume, then runs local search (swap/add/remove) to lower cost. Returns `{ placements: [{ session, weekday }], fit }`.

To keep the solver pure and testable, it takes **pre-scored** primitives via injected functions so tests don't need the full dimensions engine. Signature: `solveWeek(target, { existingTotals, candidates, dayTags, maxAdds })` where `candidates = [{ id, template, duration, distance, activityTag, qualities: string[] }]` and `existingTotals = { distance, durationMin, byActivity: {tag:{distance,duration}}, byQuality: {q: rawDose} }`. A thin wrapper in `usePlanTargets` builds these from the real engines.

- [ ] **Step 1: Write the failing test**

```js
// src/utils/planSolver.test.js
import { describe, it, expect } from 'vitest'
import { solveWeek } from './planSolver'

const cand = (id, activityTag, distance, duration, qualities = []) =>
  ({ id, template: { id, title: id, activityTag }, activityTag, distance, duration, qualities })

const EMPTY_TOTALS = { distance: 0, durationMin: 0, byActivity: {}, byQuality: {} }

describe('solveWeek', () => {
  it('reaches a volume target from the bank on empty days', () => {
    const target = { distanceKm: 30, durationMin: 180, distribution: null, qualities: [] }
    const candidates = [cand('a', 'run', 10, 60, ['endurance']), cand('b', 'run', 10, 60, ['endurance'])]
    const { placements, fit } = solveWeek(target, {
      existingTotals: EMPTY_TOTALS, candidates, dayTags: {}, maxAdds: 7,
    })
    const dist = placements.reduce((s, p) => s + p.session.distance, 0)
    expect(dist).toBeGreaterThanOrEqual(20)        // got close to 30 with 10km candidates
    expect(fit.distanceKm).toBeDefined()
  })

  it('counts existing sessions and only fills the gap', () => {
    const target = { distanceKm: 20, durationMin: 120, distribution: null, qualities: [] }
    const existingTotals = { distance: 15, durationMin: 90, byActivity: { run: { distance: 15, duration: 90 } }, byQuality: {} }
    const candidates = [cand('a', 'run', 10, 60, ['endurance']), cand('b', 'run', 10, 60, ['endurance'])]
    const { placements } = solveWeek(target, { existingTotals, candidates, dayTags: {}, maxAdds: 7 })
    // already at 15/20 → adding one 10km session (→25) overshoots less than two; expect exactly 1 add
    expect(placements.length).toBe(1)
  })

  it('never places on a rest day', () => {
    const target = { distanceKm: 100, durationMin: 600, distribution: null, qualities: [] }
    const candidates = Array.from({ length: 10 }, (_, i) => cand(`c${i}`, 'run', 10, 60, ['endurance']))
    const dayTags = { 1: 'rest', 2: 'rest', 3: 'rest', 4: 'rest', 5: 'rest', 6: 'rest', 7: 'rest' }
    const { placements } = solveWeek(target, { existingTotals: EMPTY_TOTALS, candidates, dayTags, maxAdds: 7 })
    expect(placements.length).toBe(0)               // all days rest → nothing placed
  })

  it('prefers high-intensity candidates on hard days, easy on easy days', () => {
    const target = { distanceKm: 20, durationMin: 120, distribution: null, qualities: ['vo2max'] }
    const hard = cand('hard', 'run', 10, 60, ['vo2max'])
    const easy = cand('easy', 'run', 10, 60, ['endurance'])
    const { placements } = solveWeek(target, {
      existingTotals: EMPTY_TOTALS, candidates: [hard, easy],
      dayTags: { 1: 'hard', 2: 'easy' }, maxAdds: 2,
    })
    const byDay = Object.fromEntries(placements.map(p => [p.weekday, p.session.id]))
    expect(byDay[1]).toBe('hard')
    expect(byDay[2]).toBe('easy')
  })

  it('serves the activity distribution among volume-reaching options', () => {
    const target = { distanceKm: 20, durationMin: 120, distribution: { run: 50, bike: 50 }, qualities: [] }
    const candidates = [
      cand('r1', 'run', 10, 60, ['endurance']),
      cand('b1', 'bike', 10, 60, ['endurance']),
      cand('r2', 'run', 10, 60, ['endurance']),
    ]
    const { placements } = solveWeek(target, { existingTotals: EMPTY_TOTALS, candidates, dayTags: {}, maxAdds: 2 })
    const tags = placements.map(p => p.session.activityTag).sort()
    expect(tags).toEqual(['bike', 'run'])           // one of each, not two runs
  })

  it('degrades gracefully with a thin bank (no crash, reports shortfall)', () => {
    const target = { distanceKm: 100, durationMin: 600, distribution: null, qualities: ['threshold'] }
    const candidates = [cand('only', 'run', 5, 30, ['endurance'])]
    const { placements, fit } = solveWeek(target, { existingTotals: EMPTY_TOTALS, candidates, dayTags: {}, maxAdds: 7 })
    expect(placements.length).toBeGreaterThan(0)
    expect(fit.distanceKm).toBeLessThan(100)        // shortfall reflected, no throw
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/planSolver.test.js`
Expected: FAIL — cannot resolve `./planSolver`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/utils/planSolver.js
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

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]

function candidateIsHigh(c) {
  return (c.qualities || []).some(q => HIGH_INTENSITY.has(q))
}

// Penalty for placing candidate c on a day with the given tag (0 = perfect fit).
function tagMismatch(c, tag) {
  if (!tag || tag === 'rest') return tag === 'rest' ? Infinity : 0
  const high = candidateIsHigh(c)
  if (tag === 'hard' && !high) return TAG_PENALTY
  if (tag === 'easy' && high) return TAG_PENALTY
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
function cost(target, proj, chosen, dayAssign) {
  let c = 0
  if (target.distanceKm > 0) c += W_DIST * Math.abs(proj.distance - target.distanceKm) / target.distanceKm
  if (target.durationMin > 0) c += W_TIME * Math.abs(proj.durationMin - target.durationMin) / target.durationMin

  // Activity distribution (L1 over shares) — only if a distribution is set.
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
  // (or existing high) session — proportional shortfall.
  const qf = target.qualities || []
  if (qf.length > 0) {
    const served = new Set()
    for (const ch of chosen) for (const q of ch.qualities || []) served.add(q)
    let missing = 0
    for (const q of qf) if (!served.has(q)) missing += 1
    c += W_QUAL * (missing / qf.length)
  }

  // Per-placement tag penalties.
  for (const p of chosen) c += tagMismatch(p, dayAssign.get(p) || null)
  return c
}

// Assign chosen candidates to the best eligible (non-rest) weekday, greedily by
// tag fit, one session per day. Returns a Map(candidate → weekday) and leaves
// unassignable candidates out.
function assignDays(chosen, dayTags) {
  const usedDays = new Set()
  const assign = new Map()
  const placeable = []
  // Sort so high-intensity get first crack at hard days.
  const order = [...chosen].sort((a, b) => Number(candidateIsHigh(b)) - Number(candidateIsHigh(a)))
  for (const c of order) {
    let bestDay = null
    let bestPen = Infinity
    for (const d of WEEKDAYS) {
      if (usedDays.has(d)) continue
      const tag = dayTags[d] || null
      if (tag === 'rest') continue
      const pen = tagMismatch(c, tag)
      if (pen < bestPen) { bestPen = pen; bestDay = d }
    }
    if (bestDay != null) { usedDays.add(bestDay); assign.set(c, bestDay); placeable.push(c) }
  }
  return { assign, placeable }
}

export function solveWeek(target, ctx) {
  const { existingTotals, candidates, dayTags = {}, maxAdds = 7 } = ctx
  const restCount = WEEKDAYS.filter(d => dayTags[d] === 'rest').length
  const slotCap = Math.max(0, Math.min(maxAdds, WEEKDAYS.length - restCount))
  if (slotCap === 0 || !candidates?.length) {
    const proj = project(existingTotals, [])
    return { placements: [], fit: fitOf(target, proj) }
  }

  // Pre-filter: keep candidates matching a focus quality OR a distributed
  // activity OR (if neither set) everything.
  const wantTags = target.distribution ? new Set(Object.keys(target.distribution)) : null
  const wantQual = (target.qualities || []).length ? new Set(target.qualities) : null
  let pool = candidates.filter(c => {
    if (!wantTags && !wantQual) return true
    const tagOk = wantTags ? wantTags.has(c.activityTag) : false
    const qOk = wantQual ? (c.qualities || []).some(q => wantQual.has(q)) : false
    return tagOk || qOk
  })
  if (pool.length === 0) pool = candidates.slice() // thin-bank fallback: use all

  // Greedy seed: repeatedly add the candidate that most lowers cost.
  let chosen = []
  function evalCost(list) {
    const { assign, placeable } = assignDays(list, dayTags)
    const proj = project(existingTotals, placeable)
    return { c: cost(target, proj, placeable, assign), assign, placeable, proj }
  }
  let cur = evalCost(chosen)
  while (chosen.length < slotCap) {
    let best = null
    for (const c of pool) {
      const trial = evalCost([...chosen, c])
      if (trial.placeable.length <= chosen.length) continue // couldn't place (no day)
      if (best === null || trial.c < best.c) best = { c: trial.c, cand: c, state: trial }
    }
    if (!best || best.c >= cur.c) break // no add improves
    chosen = [...chosen, best.cand]
    cur = best.state
  }

  // Local search: try swapping each chosen for a pool candidate; keep improvements.
  let improved = true
  let guard = 0
  while (improved && guard < 200) {
    improved = false
    guard += 1
    for (let i = 0; i < chosen.length; i++) {
      for (const c of pool) {
        if (chosen.includes(c)) continue
        const next = chosen.slice()
        next[i] = c
        const trial = evalCost(next)
        if (trial.c < cur.c - 1e-9) { chosen = next; cur = trial; improved = true; break }
      }
      if (improved) break
    }
    // Try dropping a session if removal lowers cost (overshoot case).
    if (!improved) {
      for (let i = 0; i < chosen.length; i++) {
        const next = chosen.slice(); next.splice(i, 1)
        const trial = evalCost(next)
        if (trial.c < cur.c - 1e-9) { chosen = next; cur = trial; improved = true; break }
      }
    }
  }

  const placements = cur.placeable.map(c => ({ session: c.template ? { ...c.template, distance: c.distance, duration: c.duration, activityTag: c.activityTag, id: c.id } : c, weekday: cur.assign.get(c) }))
  return { placements, fit: fitOf(target, cur.proj) }
}

function project0(existingTotals) { return project(existingTotals, []) }
function fitOf(target, proj) {
  return {
    distanceKm: proj.distance,
    durationMin: proj.durationMin,
    targetDistanceKm: target.distanceKm,
    targetDurationMin: target.durationMin,
  }
}

// Re-solve a single slot: freeze everyone except `slotSession`'s slot and pick
// the best different candidate for that one weekday.
export function replaceSlot(target, ctx, frozenChosen, openWeekday) {
  const { candidates, dayTags = {} } = ctx
  const tag = dayTags[openWeekday] || null
  if (tag === 'rest') return null
  let best = null
  for (const c of candidates) {
    const pen = tagMismatch(c, tag)
    if (pen === Infinity) continue
    if (best === null || pen < best.pen) best = { pen, cand: c }
  }
  return best ? { session: { ...best.cand.template, distance: best.cand.distance, duration: best.cand.duration, activityTag: best.cand.activityTag }, weekday: openWeekday } : null
}
```

NOTE: `project0` is unused scaffolding — delete it before committing if lint flags it. Keep the implementation minimal; the tests above define the contract.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/planSolver.test.js`
Expected: PASS. If the "exactly 1 add" test is brittle (overshoot tie-breaking), adjust the cost comparison to `>= cur.c` (already there) so equal-cost adds are rejected; the greedy stops when no add strictly improves.

- [ ] **Step 5: Commit**

```bash
git add src/utils/planSolver.js src/utils/planSolver.test.js
git commit -m "feat(plan): volume-first constraint solver (seed + local search)"
```

---

## Task 4: planReducers — week-target reducers

**Files:**
- Modify: `src/utils/planReducers.js`
- Test: `src/utils/planReducers.test.js` (extend existing)

- [ ] **Step 1: Write the failing test (append to existing file)**

```js
// Append to src/utils/planReducers.test.js
import {
  upsertWeekTarget, removeWeekTarget, setPlanSettings,
} from './planReducers'

describe('week targets', () => {
  it('normalizePlan includes weekTargets and planSettings, tolerating legacy docs', () => {
    expect(normalizePlan(undefined)).toEqual({
      bands: [], notes: [], goals: [], weekTargets: [], planSettings: null,
    })
    expect(normalizePlan({ weekTargets: [{ id: 't' }], planSettings: { rampPct: 5 } }))
      .toMatchObject({ weekTargets: [{ id: 't' }], planSettings: { rampPct: 5 } })
  })

  it('upsertWeekTarget collapses duplicates on (week, year)', () => {
    const plan = { weekTargets: [{ id: 'a', week: 3, year: 2026, distanceKm: 10 }] }
    const next = upsertWeekTarget(plan, { id: 'b', week: 3, year: 2026, distanceKm: 20 }, NOW)
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ id: 'b', distanceKm: 20 })
  })

  it('upsertWeekTarget updates the same id in place', () => {
    const plan = { weekTargets: [{ id: 'a', week: 3, year: 2026, distanceKm: 10 }] }
    const next = upsertWeekTarget(plan, { id: 'a', week: 3, year: 2026, distanceKm: 99 }, NOW)
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ id: 'a', distanceKm: 99, updatedAt: NOW })
  })

  it('removeWeekTarget drops by id', () => {
    const plan = { weekTargets: [{ id: 'a' }, { id: 'b' }] }
    expect(removeWeekTarget(plan, 'a')).toEqual([{ id: 'b' }])
  })

  it('setPlanSettings merges patch onto existing settings', () => {
    expect(setPlanSettings({ planSettings: null }, { rampPct: 8 }, NOW))
      .toMatchObject({ rampPct: 8, updatedAt: NOW })
    expect(setPlanSettings({ planSettings: { rampPct: 5, deloadPct: 60 } }, { rampPct: 8 }, NOW))
      .toMatchObject({ rampPct: 8, deloadPct: 60, updatedAt: NOW })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/planReducers.test.js`
Expected: FAIL — `upsertWeekTarget` etc. not exported.

- [ ] **Step 3: Write minimal implementation**

In `src/utils/planReducers.js`, add the import at the top (after the existing `bandKind` import):

```js
import { weekTargetKey } from './weekTargetTypes'
```

Add these reducers (after the `removeGoal` block, before the note-thread helpers):

```js
// ── Week targets ─────────────────────────────────────────────────────
// One target per (week, year). Upsert collapses any existing target sharing the
// incoming target's week+year (other than the one being edited by id), so a
// week never carries two targets. Mirrors upsertGoal but with a composite key.
export function upsertWeekTarget(plan, target, now) {
  const existing = Array.isArray(plan?.weekTargets) ? plan.weekTargets : []
  const key = weekTargetKey(target.week, target.year)
  const survivors = existing.filter(
    t => t.id === target.id || weekTargetKey(t.week, t.year) !== key,
  )
  return upsertById(survivors, target, now)
}
export function removeWeekTarget(plan, id) {
  return removeById(plan?.weekTargets, id)
}

// Block-level ramp settings: a single object (not an array). Merge the patch
// onto the current settings and stamp updatedAt.
export function setPlanSettings(plan, patch, now) {
  const current = plan?.planSettings || {}
  return { ...current, ...patch, updatedAt: now }
}
```

Update `normalizePlan` (the existing function) to include the new fields:

```js
export function normalizePlan(raw) {
  return {
    bands: Array.isArray(raw?.bands) ? raw.bands : [],
    notes: Array.isArray(raw?.notes) ? raw.notes : [],
    goals: Array.isArray(raw?.goals) ? raw.goals : [],
    weekTargets: Array.isArray(raw?.weekTargets) ? raw.weekTargets : [],
    planSettings: raw?.planSettings && typeof raw.planSettings === 'object' ? raw.planSettings : null,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/planReducers.test.js`
Expected: PASS (existing band/note/goal tests still pass; the `normalizePlan('fills missing arrays')` test must be updated to expect the two new fields — update that existing assertion to include `weekTargets: [], planSettings: null`).

- [ ] **Step 5: Commit**

```bash
git add src/utils/planReducers.js src/utils/planReducers.test.js
git commit -m "feat(plan): week-target + plan-settings reducers"
```

---

## Task 5: usePlan — wire the new actions

**Files:**
- Modify: `src/App/hooks/usePlan.js`

No new test file (the hook is a thin Firestore wrapper; reducers are tested in Task 4). Verify with the existing suite.

- [ ] **Step 1: Extend EMPTY_PLAN and imports**

In `src/App/hooks/usePlan.js`, change the reducer import to add the three new reducers:

```js
import {
  normalizePlan,
  upsertBand as reduceUpsertBand, removeBand as reduceRemoveBand,
  upsertNote as reduceUpsertNote, removeNote as reduceRemoveNote,
  upsertGoal as reduceUpsertGoal, removeGoal as reduceRemoveGoal,
  upsertWeekTarget as reduceUpsertWeekTarget, removeWeekTarget as reduceRemoveWeekTarget,
  setPlanSettings as reduceSetPlanSettings,
} from '../../utils/planReducers'
```

Change `EMPTY_PLAN`:

```js
const EMPTY_PLAN = { bands: [], notes: [], goals: [], weekTargets: [], planSettings: null }
```

- [ ] **Step 2: Add the action callbacks**

After the `removeGoal` callback (around line 82), add:

```js
  const upsertWeekTarget = useCallback(
    target => writeField('weekTargets', reduceUpsertWeekTarget(planRef.current, target, now())),
    [writeField])
  const removeWeekTarget = useCallback(
    id => writeField('weekTargets', reduceRemoveWeekTarget(planRef.current, id)),
    [writeField])
  const setPlanSettings = useCallback(
    patch => writeField('planSettings', reduceSetPlanSettings(planRef.current, patch, now())),
    [writeField])
```

Add them to the returned `planActions`:

```js
    planActions: {
      upsertBand, removeBand, upsertNote, removeNote, upsertGoal, removeGoal,
      upsertWeekTarget, removeWeekTarget, setPlanSettings,
    },
```

NOTE: `writeField('planSettings', obj)` writes an object, not an array — `writeField` does `setDoc(merge)` with `{ [field]: nextValue }`, which works for any value type. Confirm by reading `writeField` (lines 52-59): it sets `[field]: nextArray` — the param name says "Array" but the value is written verbatim, so an object is fine.

- [ ] **Step 3: Run the existing suite to confirm nothing broke**

Run: `npx vitest run src/utils/planReducers.test.js src/utils/weekTargetTypes.test.js`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/App/hooks/usePlan.js
git commit -m "feat(plan): expose week-target + plan-settings actions from usePlan"
```

---

## Task 6: QualityFocusChips — quality multi-select

**Files:**
- Create: `src/components/AdminPlanBuilder/QualityFocusChips.jsx`
- Test: `src/components/AdminPlanBuilder/QualityFocusChips.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/AdminPlanBuilder/QualityFocusChips.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import QualityFocusChips from './QualityFocusChips'

describe('QualityFocusChips', () => {
  it('renders a chip per quality and marks selected ones', () => {
    render(<QualityFocusChips selected={['threshold']} onChange={() => {}} />)
    const thr = screen.getByRole('button', { name: /threshold/i })
    expect(thr).toHaveAttribute('aria-pressed', 'true')
    const vo2 = screen.getByRole('button', { name: /vo2max/i })
    expect(vo2).toHaveAttribute('aria-pressed', 'false')
  })

  it('toggles a quality on click', () => {
    const onChange = vi.fn()
    render(<QualityFocusChips selected={['threshold']} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /vo2max/i }))
    expect(onChange).toHaveBeenCalledWith(['threshold', 'vo2max'])
    fireEvent.click(screen.getByRole('button', { name: /threshold/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/AdminPlanBuilder/QualityFocusChips.test.jsx`
Expected: FAIL — cannot resolve `./QualityFocusChips`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/components/AdminPlanBuilder/QualityFocusChips.jsx
import { QUALITY_ORDER, QUALITY_LABELS, QUALITY_COLORS } from '../../utils'

// Multi-select chips for the week's quality focus. Selected chips fill with the
// quality color; clicking toggles membership. Pure controlled component.
export default function QualityFocusChips({ selected = [], onChange }) {
  const set = new Set(selected)
  function toggle(q) {
    const next = new Set(set)
    if (next.has(q)) next.delete(q)
    else next.add(q)
    // Preserve QUALITY_ORDER for a stable, readable result.
    onChange(QUALITY_ORDER.filter(x => next.has(x)))
  }
  return (
    <div className="pb-quality-chips">
      {QUALITY_ORDER.map(q => {
        const active = set.has(q)
        const color = QUALITY_COLORS[q]
        return (
          <button
            key={q}
            type="button"
            className={`pb-quality-chip${active ? ' is-active' : ''}`}
            aria-pressed={active}
            onClick={() => toggle(q)}
            style={active ? { background: color, borderColor: color, color: '#fff' } : { borderColor: color, color }}
          >
            {QUALITY_LABELS[q]}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/AdminPlanBuilder/QualityFocusChips.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminPlanBuilder/QualityFocusChips.jsx src/components/AdminPlanBuilder/QualityFocusChips.test.jsx
git commit -m "feat(plan): quality-focus chips"
```

---

## Task 7: DistributionEditor — per-activity %

**Files:**
- Create: `src/components/AdminPlanBuilder/DistributionEditor.jsx`
- Test: `src/components/AdminPlanBuilder/DistributionEditor.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/AdminPlanBuilder/DistributionEditor.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DistributionEditor from './DistributionEditor'

describe('DistributionEditor', () => {
  it('shows a row per active tag with its percentage and the running total', () => {
    render(<DistributionEditor value={{ run: 60, bike: 40 }} onChange={() => {}} />)
    expect(screen.getByLabelText(/run %/i)).toHaveValue(60)
    expect(screen.getByLabelText(/bike %/i)).toHaveValue(40)
    expect(screen.getByText(/100%/)).toBeInTheDocument()
  })

  it('edits a tag percentage', () => {
    const onChange = vi.fn()
    render(<DistributionEditor value={{ run: 60, bike: 40 }} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/run %/i), { target: { value: '70' } })
    expect(onChange).toHaveBeenCalledWith({ run: 70, bike: 40 })
  })

  it('warns when the total is not 100', () => {
    render(<DistributionEditor value={{ run: 60, bike: 30 }} onChange={() => {}} />)
    expect(screen.getByText(/90%/)).toHaveClass('is-off')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/AdminPlanBuilder/DistributionEditor.test.jsx`
Expected: FAIL — cannot resolve `./DistributionEditor`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/components/AdminPlanBuilder/DistributionEditor.jsx
import { useState } from 'react'
import { ACTIVITY_TAG_MAP } from '../../utils'
import { SportPicker } from '../ui'

// Editor for a week's activity distribution: a numeric % per chosen activity
// plus a SportPicker to add a tag. Controlled: `value` is { tag: pct }, onChange
// returns the next map. Shows a running total that flags when not ~100%.
export default function DistributionEditor({ value = {}, onChange }) {
  const [adding, setAdding] = useState(false)
  const entries = Object.entries(value)
  const total = entries.reduce((s, [, v]) => s + Number(v || 0), 0)
  const off = Math.round(total) !== 100 && entries.length > 0

  function setPct(tag, pct) {
    onChange({ ...value, [tag]: pct })
  }
  function removeTag(tag) {
    const next = { ...value }
    delete next[tag]
    onChange(next)
  }
  function addTag(tag) {
    if (tag && value[tag] == null) onChange({ ...value, [tag]: 0 })
    setAdding(false)
  }

  return (
    <div className="pb-dist-editor">
      {entries.map(([tag, pct]) => {
        const meta = ACTIVITY_TAG_MAP[tag]
        return (
          <div key={tag} className="pb-dist-row">
            <span className="pb-dist-tag" style={{ color: meta?.color }}>{meta?.label || tag}</span>
            <input
              type="number"
              min="0"
              max="100"
              aria-label={`${meta?.label || tag} %`}
              value={pct}
              onChange={e => setPct(tag, Number(e.target.value))}
            />
            <button type="button" className="pb-dist-remove" aria-label={`Remove ${meta?.label || tag}`} onClick={() => removeTag(tag)}>×</button>
          </div>
        )
      })}
      <div className="pb-dist-foot">
        <span className={`pb-dist-total${off ? ' is-off' : ''}`}>{Math.round(total)}%</span>
        {adding ? (
          <SportPicker value={null} onChange={addTag} />
        ) : (
          <button type="button" className="pb-dist-add" onClick={() => setAdding(true)}>+ activity</button>
        )}
      </div>
    </div>
  )
}
```

NOTE: Verify `SportPicker`'s props before relying on them — read `src/components/ui/SportPicker.jsx`. If its change handler is `onSelect` or it requires different props, adapt the `<SportPicker>` usage (and the `addTag` wiring) to match. The test does not exercise SportPicker, so the suite passes regardless; correctness of the add-control is verified manually in Task 12.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/AdminPlanBuilder/DistributionEditor.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminPlanBuilder/DistributionEditor.jsx src/components/AdminPlanBuilder/DistributionEditor.test.jsx
git commit -m "feat(plan): activity-distribution editor"
```

---

## Task 8: DayIntensityTag + ReplaceSessionButton — small day-cell controls

**Files:**
- Create: `src/components/AdminPlanBuilder/DayIntensityTag.jsx`
- Create: `src/components/AdminPlanBuilder/ReplaceSessionButton.jsx`
- Test: `src/components/AdminPlanBuilder/DayIntensityTag.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/AdminPlanBuilder/DayIntensityTag.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DayIntensityTag from './DayIntensityTag'

describe('DayIntensityTag', () => {
  it('cycles none → hard → easy → rest → none on click', () => {
    const onChange = vi.fn()
    const { rerender } = render(<DayIntensityTag value={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenLastCalledWith('hard')
    rerender(<DayIntensityTag value="hard" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenLastCalledWith('easy')
    rerender(<DayIntensityTag value="easy" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenLastCalledWith('rest')
    rerender(<DayIntensityTag value="rest" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('labels the current tag', () => {
    render(<DayIntensityTag value="hard" onChange={() => {}} />)
    expect(screen.getByRole('button')).toHaveAccessibleName(/hard/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/AdminPlanBuilder/DayIntensityTag.test.jsx`
Expected: FAIL — cannot resolve `./DayIntensityTag`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/components/AdminPlanBuilder/DayIntensityTag.jsx
// A tiny cycling control in a Plan-view day-cell header: none → hard → easy →
// rest → none. Colors hint intensity. Controlled by `value` ('hard'|'easy'|
// 'rest'|null) and `onChange`.
const CYCLE = [null, 'hard', 'easy', 'rest']
const LABELS = { hard: 'Hard', easy: 'Easy', rest: 'Rest' }
const COLORS = { hard: '#ef4444', easy: '#22c55e', rest: '#94a3b8' }

export default function DayIntensityTag({ value = null, onChange }) {
  const next = () => {
    const i = CYCLE.indexOf(value ?? null)
    onChange(CYCLE[(i + 1) % CYCLE.length])
  }
  const label = value ? LABELS[value] : 'Set intensity'
  return (
    <button
      type="button"
      className={`pb-day-tag${value ? ` is-${value}` : ''}`}
      aria-label={label}
      title={label}
      onClick={next}
      style={value ? { background: COLORS[value], color: '#fff' } : undefined}
    >
      {value ? LABELS[value][0] : '·'}
    </button>
  )
}
```

```jsx
// src/components/AdminPlanBuilder/ReplaceSessionButton.jsx
import { RefreshCw } from 'lucide-react'

// Per-session replace affordance shown on the Plan page. Calls onReplace(workout)
// which re-solves that single slot for the next-best bank candidate.
export default function ReplaceSessionButton({ workout, onReplace }) {
  return (
    <button
      type="button"
      className="pb-replace-btn"
      aria-label={`Replace ${workout.title || 'session'}`}
      title="Replace with a similar session"
      onClick={e => { e.stopPropagation(); onReplace(workout) }}
    >
      <RefreshCw size={12} aria-hidden="true" />
    </button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/AdminPlanBuilder/DayIntensityTag.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminPlanBuilder/DayIntensityTag.jsx src/components/AdminPlanBuilder/ReplaceSessionButton.jsx src/components/AdminPlanBuilder/DayIntensityTag.test.jsx
git commit -m "feat(plan): day-intensity tag + replace-session controls"
```

---

## Task 9: WeekRulePanel — left-column rule editor + bars

**Files:**
- Create: `src/components/AdminPlanBuilder/WeekRulePanel.jsx`
- Test: `src/components/AdminPlanBuilder/WeekRulePanel.test.jsx`

Context: replaces `MonthWeekSummary` in the Plan-view left column. Shows distance/time inputs (or a ramped read-out), the distribution editor, quality chips, day-tag-free (tags live in cells), and target-vs-actual bars computed from `computeWeekSummary`/`scoreWeek` of that week's workouts. Props: `{ weekTarget, resolvedTarget, workouts, onChange }` where `resolvedTarget` is the ramp output `{ distanceKm, durationMin, source }` (or null), `onChange(patch)` persists a week-target patch.

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/AdminPlanBuilder/WeekRulePanel.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WeekRulePanel from './WeekRulePanel'

const target = {
  id: 't', week: 3, year: 2026, base: true, distanceKm: 30, durationMin: 180,
  distribution: { run: 100 }, qualities: ['threshold'], dayTags: {}, deload: false,
}

describe('WeekRulePanel', () => {
  it('shows distance and time target inputs', () => {
    render(<WeekRulePanel weekTarget={target} resolvedTarget={{ distanceKm: 30, durationMin: 180, source: 'typed' }} workouts={[]} onChange={() => {}} />)
    expect(screen.getByLabelText(/distance/i)).toHaveValue(30)
    expect(screen.getByLabelText(/time/i)).toHaveValue(180)
  })

  it('edits the distance target', () => {
    const onChange = vi.fn()
    render(<WeekRulePanel weekTarget={target} resolvedTarget={{ distanceKm: 30, durationMin: 180, source: 'typed' }} workouts={[]} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/distance/i), { target: { value: '40' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ distanceKm: 40, base: true }))
  })

  it('renders a ramped read-out when the week is derived', () => {
    const derived = { ...target, base: false, distanceKm: null, durationMin: null }
    render(<WeekRulePanel weekTarget={derived} resolvedTarget={{ distanceKm: 33, durationMin: 198, source: 'ramped' }} workouts={[]} onChange={() => {}} />)
    expect(screen.getByText(/33/)).toBeInTheDocument()
    expect(screen.getByText(/ramped/i)).toBeInTheDocument()
  })

  it('renders a distance progress bar with a target notch', () => {
    render(<WeekRulePanel weekTarget={target} resolvedTarget={{ distanceKm: 30, durationMin: 180, source: 'typed' }} workouts={[]} onChange={() => {}} />)
    expect(screen.getByTestId('bar-distance')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/AdminPlanBuilder/WeekRulePanel.test.jsx`
Expected: FAIL — cannot resolve `./WeekRulePanel`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/components/AdminPlanBuilder/WeekRulePanel.jsx
import { computeWeekSummary } from '../../utils/weekSummary'
import { scoreWeek } from '../../utils/dimensions'
import { formatDurationLabel, formatKmValue } from '../../utils'
import { QUALITY_LABELS, QUALITY_COLORS } from '../../utils'
import DistributionEditor from './DistributionEditor'
import QualityFocusChips from './QualityFocusChips'

// One horizontal target-vs-actual bar: actual fills, target notch marks the aim.
function MetricBar({ testid, actual, target, color, label, format }) {
  const max = Math.max(actual, target || 0, 1)
  const actualPct = Math.min(100, (actual / max) * 100)
  const targetPct = target > 0 ? Math.min(100, (target / max) * 100) : null
  const met = target > 0 && actual >= target * 0.95
  return (
    <div className="pb-bar-row" data-testid={testid}>
      <span className="pb-bar-label">{label}</span>
      <div className="pb-bar">
        <span className="pb-bar-fill" style={{ width: `${actualPct}%`, background: met ? color : '#f59e0b' }} />
        {targetPct != null && <span className="pb-bar-notch" style={{ left: `${targetPct}%` }} />}
      </div>
      <span className="pb-bar-num">{format(actual)}{target > 0 ? ` / ${format(target)}` : ''}</span>
    </div>
  )
}

// The Plan-view left-column rule editor + progress bars for ONE week.
export default function WeekRulePanel({ weekTarget, resolvedTarget, workouts, onChange }) {
  const summary = computeWeekSummary(workouts || [])
  const dims = scoreWeek(workouts || []).dims
  const t = weekTarget || {}
  const resolved = resolvedTarget || { distanceKm: t.distanceKm, durationMin: t.durationMin, source: t.base ? 'typed' : null }
  const isDerived = !t.base && t.distanceKm == null && t.durationMin == null && resolved.source && resolved.source !== 'typed'

  return (
    <div className="pb-rule-panel">
      <div className="pb-rule-volume">
        {isDerived ? (
          <div className="pb-rule-derived">
            <span className="pb-rule-derived-val">{formatKmValue(resolved.distanceKm || 0)} · {formatDurationLabel(Math.round(resolved.durationMin || 0))}</span>
            <span className="pb-rule-source">{resolved.source}</span>
          </div>
        ) : (
          <>
            <label className="pb-rule-field">
              <span>Distance (km)</span>
              <input
                type="number" min="0" aria-label="Distance (km)"
                value={t.distanceKm ?? ''}
                onChange={e => onChange({ distanceKm: e.target.value === '' ? null : Number(e.target.value), base: true })}
              />
            </label>
            <label className="pb-rule-field">
              <span>Time (min)</span>
              <input
                type="number" min="0" aria-label="Time (min)"
                value={t.durationMin ?? ''}
                onChange={e => onChange({ durationMin: e.target.value === '' ? null : Number(e.target.value), base: true })}
              />
            </label>
          </>
        )}
      </div>

      <div className="pb-rule-bars">
        <MetricBar testid="bar-distance" label="km" actual={summary.totalDistance} target={resolved.distanceKm || 0} color="#3b82f6" format={formatKmValue} />
        <MetricBar testid="bar-time" label="time" actual={summary.totalDuration} target={resolved.durationMin || 0} color="#6366f1" format={v => formatDurationLabel(Math.round(v))} />
      </div>

      <DistributionEditor value={t.distribution || {}} onChange={dist => onChange({ distribution: dist })} />

      <QualityFocusChips selected={t.qualities || []} onChange={qs => onChange({ qualities: qs })} />

      {(t.qualities || []).length > 0 && (
        <ul className="pb-rule-quality-actuals">
          {(t.qualities || []).map(q => (
            <li key={q} className="pb-rule-qa">
              <span className="pb-rule-qa-label" style={{ color: QUALITY_COLORS[q] }}>{QUALITY_LABELS[q]}</span>
              <div className="pb-bar">
                <span className="pb-bar-fill" style={{ width: `${dims[q] || 0}%`, background: QUALITY_COLORS[q] }} />
              </div>
              <span className="pb-bar-num">{dims[q] || 0}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="pb-rule-load">Load {summary.totalLoad}</div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/AdminPlanBuilder/WeekRulePanel.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminPlanBuilder/WeekRulePanel.jsx src/components/AdminPlanBuilder/WeekRulePanel.test.jsx
git commit -m "feat(plan): week rule panel with target-vs-actual bars"
```

---

## Task 10: usePlanTargets — controller hook

**Files:**
- Create: `src/components/AdminPlanBuilder/usePlanTargets.js`
- Test: `src/components/AdminPlanBuilder/usePlanTargets.test.jsx`

Context: bridges the pure utils to React + persistence. Owns the week-range selection, builds solver inputs from the real engines (`computeWeekSummary`/`scoreSession`/`sessionCategories`), runs the ramp + solver, and calls `planActions` + `onAddManySessions`. Props: `{ plan, planActions, overviewWeeks, overviewWorkoutsByWeekKey, templates, onAddManySessions, resolveMuscles }`.

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/AdminPlanBuilder/usePlanTargets.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePlanTargets } from './usePlanTargets'

const weeks = [
  { week: 1, year: 2026, monday: new Date('2026-01-05'), sunday: new Date('2026-01-11'), key: '2026-01' },
  { week: 2, year: 2026, monday: new Date('2026-01-12'), sunday: new Date('2026-01-18'), key: '2026-02' },
]

const baseProps = (over = {}) => ({
  plan: { bands: [], notes: [], goals: [], weekTargets: [], planSettings: null },
  planActions: { upsertWeekTarget: vi.fn(), removeWeekTarget: vi.fn(), setPlanSettings: vi.fn() },
  overviewWeeks: weeks,
  overviewWorkoutsByWeekKey: { '2026-01': [], '2026-02': [] },
  templates: [{ id: 'r', title: 'Run', activityTag: 'run', type: 'continuous', intensityZone: [2], blocks: { sections: [{ kind: 'steady', distanceKm: 10, durationMin: 60 }] } }],
  onAddManySessions: vi.fn(),
  resolveMuscles: () => [],
  ...over,
})

describe('usePlanTargets', () => {
  it('setTarget upserts a week target with the patch + ids', () => {
    const props = baseProps()
    const { result } = renderHook(() => usePlanTargets(props))
    act(() => result.current.setTarget(1, 2026, { distanceKm: 30, base: true }))
    expect(props.planActions.upsertWeekTarget).toHaveBeenCalledWith(
      expect.objectContaining({ week: 1, year: 2026, distanceKm: 30, base: true, id: expect.any(String) }),
    )
  })

  it('setDayTag merges into the week target dayTags', () => {
    const props = baseProps({
      plan: { bands: [], notes: [], goals: [], weekTargets: [{ id: 'a', week: 1, year: 2026, dayTags: {} }], planSettings: null },
    })
    const { result } = renderHook(() => usePlanTargets(props))
    act(() => result.current.setDayTag(1, 2026, 3, 'hard'))
    expect(props.planActions.upsertWeekTarget).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a', dayTags: { 3: 'hard' } }),
    )
  })

  it('generate solves selected weeks and calls onAddManySessions with placements', () => {
    const props = baseProps({
      plan: { bands: [], notes: [], goals: [], weekTargets: [{ id: 'a', week: 1, year: 2026, base: true, distanceKm: 20, durationMin: 120, distribution: null, qualities: [], dayTags: {} }], planSettings: null },
    })
    const { result } = renderHook(() => usePlanTargets(props))
    act(() => result.current.generate([{ week: 1, year: 2026 }]))
    expect(props.onAddManySessions).toHaveBeenCalled()
    const items = props.onAddManySessions.mock.calls[0][0]
    expect(items.length).toBeGreaterThan(0)
    expect(items[0]).toMatchObject({ week: 1, year: 2026, weekday: expect.any(Number) })
  })

  it('generate with no targeted weeks adds nothing', () => {
    const props = baseProps()
    const { result } = renderHook(() => usePlanTargets(props))
    act(() => result.current.generate([{ week: 1, year: 2026 }]))
    expect(props.onAddManySessions).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/AdminPlanBuilder/usePlanTargets.test.jsx`
Expected: FAIL — cannot resolve `./usePlanTargets`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/components/AdminPlanBuilder/usePlanTargets.js
import { useCallback, useMemo } from 'react'
import { computeWeekSummary } from '../../utils/weekSummary'
import { scoreSession } from '../../utils/dimensions'
import { sessionCategories } from '../../utils/sessionCategory'
import { sessionDuration, sessionDistance } from '../../utils/weekSummary'
import { weekTargetKey, emptyWeekTarget, normalizeDistribution } from '../../utils/weekTargetTypes'
import { deriveWeekTargets } from '../../utils/planRamp'
import { solveWeek, replaceSlot } from '../../utils/planSolver'

// Stable-ish id generator. crypto.randomUUID exists in jsdom + browsers.
const newId = () => (globalThis.crypto?.randomUUID?.() || `wt-${Math.round(performance.now() * 1000)}`)

// Build solver candidates from the template bank: each gets duration/distance
// and the qualities it trains (via sessionCategories). Memoized by the caller.
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
function existingTotals(workouts, resolveMuscles) {
  const s = computeWeekSummary(workouts || [], { resolveMuscles })
  const byActivity = {}
  for (const tag of new Set([...Object.keys(s.activityDistance), ...Object.keys(s.activityDuration)])) {
    byActivity[tag] = { distance: s.activityDistance[tag] || 0, duration: s.activityDuration[tag] || 0 }
  }
  return { distance: s.totalDistance, durationMin: s.totalDuration, byActivity, byQuality: {} }
}

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

  // Solve a single week into placements (existing + chosen).
  const solveForWeek = useCallback((week, year) => {
    const key = weekTargetKey(week, year)
    const t = targetByKey.get(key)
    const r = resolved.get(key)
    const distanceKm = (r?.distanceKm ?? t?.distanceKm) || 0
    const durationMin = (r?.durationMin ?? t?.durationMin) || 0
    if (!t && !distanceKm && !durationMin) return { placements: [], target: null }
    const target = {
      distanceKm, durationMin,
      distribution: t?.distribution ? normalizeDistribution(t.distribution) : null,
      qualities: t?.qualities || [],
    }
    const workouts = overviewWorkoutsByWeekKey?.[key] || []
    const restCount = Object.values(t?.dayTags || {}).filter(x => x === 'rest').length
    const usedDays = new Set(workouts.map(w => Number(w.weekday)))
    const maxAdds = Math.max(0, 7 - restCount - usedDays.size)
    const { placements } = solveWeek(target, {
      existingTotals: existingTotals(workouts, resolveMuscles),
      candidates, dayTags: t?.dayTags || {}, maxAdds,
    })
    // Avoid placing on days that already have a session (one add per empty day).
    const filtered = placements.filter(p => !usedDays.has(p.weekday))
    return { placements: filtered, target }
  }, [targetByKey, resolved, overviewWorkoutsByWeekKey, candidates, resolveMuscles])

  // Generate across a list of {week,year}: one batched insert.
  const generate = useCallback(range => {
    const items = []
    for (const { week, year } of range || []) {
      const { placements } = solveForWeek(week, year)
      for (const p of placements) items.push({ session: p.session.template || p.session, week, year, weekday: p.weekday })
    }
    if (items.length) onAddManySessions(items)
  }, [solveForWeek, onAddManySessions])

  // Replace a single placed session: re-solve its slot for the next-best candidate.
  const replaceSession = useCallback(workout => {
    const week = Number(workout.week)
    const year = Number(workout.year)
    const key = weekTargetKey(week, year)
    const t = targetByKey.get(key)
    const r = resolved.get(key)
    const target = {
      distanceKm: (r?.distanceKm ?? t?.distanceKm) || 0,
      durationMin: (r?.durationMin ?? t?.durationMin) || 0,
      distribution: t?.distribution ? normalizeDistribution(t.distribution) : null,
      qualities: t?.qualities || [],
    }
    const swap = replaceSlot(target, { candidates, dayTags: t?.dayTags || {} }, [], Number(workout.weekday))
    return swap // caller wires delete-old + insert-new; null = no candidate
  }, [targetByKey, resolved, candidates])

  return { resolved, getTarget, setTarget, setDayTag, setSettings, generate, replaceSession, solveForWeek }
}
```

NOTE: `sessionDuration`/`sessionDistance` are exported from `src/utils/weekSummary.js` (verified: lines 16, 25). The import above pulls them from there. If they are NOT exported (re-check), import the equivalent from `src/utils/load.js` (`estimateWorkoutDuration`, `getWorkoutDistance`) and the block totals from `src/sessionBlocks`. Verify before implementing.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/AdminPlanBuilder/usePlanTargets.test.jsx`
Expected: PASS. The generate test relies on the solver placing the 10km run template toward a 20km target on empty days — it should place at least one.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminPlanBuilder/usePlanTargets.js src/components/AdminPlanBuilder/usePlanTargets.test.jsx
git commit -m "feat(plan): usePlanTargets controller (ramp + solve + generate)"
```

---

## Task 11: PlanGridPanel + GenerateBar — the Plan-view calendar

**Files:**
- Create: `src/components/AdminPlanBuilder/PlanGridPanel.jsx`
- Create: `src/components/AdminPlanBuilder/GenerateBar.jsx`
- Create: `src/components/AdminPlanBuilder/styles/plan.css`
- Test: `src/components/AdminPlanBuilder/PlanGridPanel.test.jsx`

Context: a calendar grid mirroring `MonthGridPanel`'s week-rows + 7-day structure, but the left column renders `<WeekRulePanel>` and each day cell shows session chips with a `<ReplaceSessionButton>`, a `<DayIntensityTag>` in the header, and the existing "+" affordance. A top `<GenerateBar>` holds the week-range selection + Generate + plan settings.

Read `MonthGridPanel.jsx` first to copy its grid markup (the `.pb-month-row` / `.pb-month-cell` structure, `data-date`, the "+" button) so the Plan grid visually matches. Keep it leaner: no marquee multi-select of sessions, no drag-move — week-range selection is simple click-first/click-last on the week label.

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/AdminPlanBuilder/PlanGridPanel.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import PlanGridPanel from './PlanGridPanel'

const weeks = [
  { week: 1, year: 2026, monday: new Date('2026-01-05'), sunday: new Date('2026-01-11'), key: '2026-01' },
]
const baseProps = (over = {}) => ({
  overviewWeeks: weeks,
  overviewWorkoutsByWeekKey: { '2026-01': [{ id: 'w1', title: 'Easy run', activityTag: 'run', weekday: 1, week: 1, year: 2026 }] },
  plan: { bands: [], notes: [], goals: [], weekTargets: [], planSettings: null },
  planActions: { upsertWeekTarget: vi.fn(), removeWeekTarget: vi.fn(), setPlanSettings: vi.fn() },
  templates: [],
  onAddManySessions: vi.fn(),
  onAddSessionToDay: vi.fn(),
  onSelectWorkout: vi.fn(),
  onDeleteWorkout: vi.fn(),
  resolveMuscles: () => [],
  ...over,
})

describe('PlanGridPanel', () => {
  it('renders a week row with the rule panel and 7 day cells', () => {
    render(<PlanGridPanel {...baseProps()} />)
    expect(screen.getByLabelText(/distance \(km\)/i)).toBeInTheDocument()
    expect(screen.getByText('Easy run')).toBeInTheDocument()
  })

  it('shows a replace button on a placed session', () => {
    render(<PlanGridPanel {...baseProps()} />)
    expect(screen.getByRole('button', { name: /replace easy run/i })).toBeInTheDocument()
  })

  it('has a Generate control', () => {
    render(<PlanGridPanel {...baseProps()} />)
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/AdminPlanBuilder/PlanGridPanel.test.jsx`
Expected: FAIL — cannot resolve `./PlanGridPanel`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/components/AdminPlanBuilder/GenerateBar.jsx
import { Sparkles } from 'lucide-react'
import { Button } from '../ui'

// Top bar for the Plan view: shows the selected week range and a Generate button
// that fills the range from the bank. `selection` = [{week,year}, ...].
export default function GenerateBar({ selection, onGenerate, settings, onSettingsChange }) {
  const count = selection?.length || 0
  return (
    <div className="pb-generate-bar">
      <span className="pb-generate-info">
        {count > 0 ? `${count} week${count > 1 ? 's' : ''} selected` : 'Select weeks to generate'}
      </span>
      <label className="pb-generate-ramp">
        Ramp %
        <input
          type="number" min="0" max="20"
          value={settings?.rampPct ?? 0}
          onChange={e => onSettingsChange({ rampPct: Number(e.target.value) })}
        />
      </label>
      <Button variant="primary" disabled={count === 0} onClick={onGenerate}>
        <Sparkles size={14} aria-hidden="true" /> Generate
      </Button>
    </div>
  )
}
```

```jsx
// src/components/AdminPlanBuilder/PlanGridPanel.jsx
import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { weekTargetKey } from '../../utils/weekTargetTypes'
import { usePlanTargets } from './usePlanTargets'
import WeekRulePanel from './WeekRulePanel'
import DayIntensityTag from './DayIntensityTag'
import ReplaceSessionButton from './ReplaceSessionButton'
import GenerateBar from './GenerateBar'
import './styles/plan.css'

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]

// The Plan-view calendar. Mirrors the month grid (week rows × 7 day columns) but
// the left column is a per-week rule editor and each day cell carries an
// intensity tag and per-session Replace buttons. A top bar generates a selected
// week range from the bank to hit each week's targets.
export default function PlanGridPanel({
  overviewWeeks, overviewWorkoutsByWeekKey, plan, planActions, templates,
  onAddManySessions, onAddSessionToDay, onSelectWorkout, onDeleteWorkout, resolveMuscles,
}) {
  const targets = usePlanTargets({
    plan, planActions, overviewWeeks, overviewWorkoutsByWeekKey, templates,
    onAddManySessions, resolveMuscles,
  })
  const [selection, setSelection] = useState([]) // [{week,year}]

  const inSelection = (week, year) =>
    selection.some(s => s.week === week && s.year === year)

  function toggleWeekSelect(week, year) {
    setSelection(prev => inSelection(week, year)
      ? prev.filter(s => !(s.week === week && s.year === year))
      : [...prev, { week, year }])
  }

  function handleReplace(workout) {
    const swap = targets.replaceSession(workout)
    if (swap && swap.session) {
      // Delete the old session and insert the replacement on the same day.
      onDeleteWorkout(workout)
      onAddManySessions([{ session: swap.session, week: Number(workout.week), year: Number(workout.year), weekday: Number(workout.weekday) }])
    }
  }

  const settings = plan?.planSettings || { rampPct: 0 }

  return (
    <div className="pb-plan-panel">
      <GenerateBar
        selection={selection}
        onGenerate={() => targets.generate(selection)}
        settings={settings}
        onSettingsChange={targets.setSettings}
      />
      <div className="pb-plan-grid">
        {(overviewWeeks || []).map(w => {
          const key = weekTargetKey(w.week, w.year)
          const workouts = overviewWorkoutsByWeekKey?.[key] || []
          const weekTarget = targets.getTarget(w.week, w.year)
          const resolvedTarget = targets.resolved.get(key) || null
          return (
            <div key={key} className={`pb-plan-row${inSelection(w.week, w.year) ? ' is-selected' : ''}`}>
              <div className="pb-plan-rule-col">
                <button
                  type="button"
                  className="pb-plan-week-btn"
                  onClick={() => toggleWeekSelect(w.week, w.year)}
                  aria-pressed={inSelection(w.week, w.year)}
                >
                  W{w.week}
                </button>
                <WeekRulePanel
                  weekTarget={weekTarget}
                  resolvedTarget={resolvedTarget}
                  workouts={workouts}
                  onChange={patch => targets.setTarget(w.week, w.year, patch)}
                />
              </div>
              {WEEKDAYS.map(wd => {
                const dayWorkouts = workouts.filter(x => Number(x.weekday) === wd)
                const tag = weekTarget?.dayTags?.[wd] || null
                return (
                  <div key={wd} className="pb-plan-cell">
                    <div className="pb-plan-cell-head">
                      <DayIntensityTag value={tag} onChange={t => targets.setDayTag(w.week, w.year, wd, t)} />
                    </div>
                    {dayWorkouts.map(workout => (
                      <div key={workout.id} className="pb-plan-chip" onClick={() => onSelectWorkout(workout)}>
                        <span className="pb-plan-chip-title">{workout.title}</span>
                        <ReplaceSessionButton workout={workout} onReplace={handleReplace} />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="pb-plan-add"
                      aria-label={`Add session to week ${w.week} day ${wd}`}
                      onClick={() => onAddSessionToDay(w.week, w.year, wd)}
                    >
                      <Plus size={12} aria-hidden="true" />
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

```css
/* src/components/AdminPlanBuilder/styles/plan.css */
.pb-plan-panel { display: flex; flex-direction: column; gap: 8px; }

.pb-generate-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 12px; border-bottom: 1px solid var(--th-line, #e2e8f0);
}
.pb-generate-info { font-size: 0.8rem; color: var(--th-ink-soft, #64748b); }
.pb-generate-ramp { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; }
.pb-generate-ramp input { width: 48px; }

.pb-plan-grid { display: flex; flex-direction: column; }
.pb-plan-row {
  display: grid; grid-template-columns: 220px repeat(7, minmax(0, 1fr));
  border-bottom: 1px solid var(--th-line, #e2e8f0);
}
.pb-plan-row.is-selected { background: var(--th-accent-wash, #eff6ff); }

.pb-plan-rule-col { padding: 8px; border-right: 1px solid var(--th-line, #e2e8f0); }
.pb-plan-week-btn { font-weight: 600; font-size: 0.8rem; margin-bottom: 6px; cursor: pointer; }
.pb-plan-week-btn[aria-pressed="true"] { color: var(--th-accent, #2563eb); }

.pb-plan-cell { min-height: 96px; padding: 4px; border-right: 1px solid var(--th-line, #f1f5f9); position: relative; }
.pb-plan-cell-head { display: flex; justify-content: flex-end; }
.pb-day-tag {
  width: 18px; height: 18px; border-radius: 50%; border: 1px solid var(--th-line, #cbd5e1);
  font-size: 0.6rem; line-height: 1; cursor: pointer; background: transparent;
}

.pb-plan-chip {
  display: flex; align-items: center; justify-content: space-between; gap: 4px;
  padding: 3px 6px; margin-top: 4px; border-radius: 6px;
  background: var(--th-surface, #fff); border: 1px solid var(--th-line, #e2e8f0);
  font-size: 0.72rem; cursor: pointer;
}
.pb-replace-btn { border: none; background: transparent; cursor: pointer; color: var(--th-ink-soft, #94a3b8); }
.pb-replace-btn:hover { color: var(--th-accent, #2563eb); }

.pb-plan-add {
  position: absolute; bottom: 4px; right: 4px; width: 18px; height: 18px;
  border-radius: 50%; border: 1px dashed var(--th-line, #cbd5e1); background: transparent; cursor: pointer;
}

/* Rule panel internals */
.pb-rule-panel { display: flex; flex-direction: column; gap: 6px; }
.pb-rule-field { display: flex; flex-direction: column; font-size: 0.68rem; gap: 2px; }
.pb-rule-field input { width: 100%; }
.pb-rule-derived { display: flex; align-items: baseline; gap: 6px; }
.pb-rule-source { font-size: 0.6rem; text-transform: uppercase; color: var(--th-ink-soft, #94a3b8); }
.pb-bar-row, .pb-rule-qa { display: grid; grid-template-columns: 32px 1fr auto; align-items: center; gap: 4px; font-size: 0.65rem; }
.pb-bar { position: relative; height: 6px; border-radius: 3px; background: var(--th-line, #e2e8f0); overflow: hidden; }
.pb-bar-fill { position: absolute; inset: 0 auto 0 0; border-radius: 3px; }
.pb-bar-notch { position: absolute; top: -1px; bottom: -1px; width: 2px; background: var(--th-ink, #0f172a); }
.pb-quality-chips { display: flex; flex-wrap: wrap; gap: 3px; }
.pb-quality-chip { font-size: 0.6rem; padding: 1px 6px; border-radius: 999px; border: 1px solid; background: transparent; cursor: pointer; }
.pb-dist-editor { display: flex; flex-direction: column; gap: 2px; }
.pb-dist-row { display: grid; grid-template-columns: 1fr 48px auto; align-items: center; gap: 4px; font-size: 0.65rem; }
.pb-dist-foot { display: flex; align-items: center; justify-content: space-between; font-size: 0.62rem; }
.pb-dist-total.is-off { color: #f59e0b; font-weight: 600; }
.pb-rule-load { font-size: 0.62rem; color: var(--th-ink-soft, #94a3b8); }
```

NOTE on `onAddSessionToDay`: in the month view path the signature is `onAddSessionToDayAcross(week, year, weekday)` (see `buildPanelMap.jsx:79` which passes `onAddSessionToDayAcross` AS `onAddSessionToDay` into `MonthGridPanel`). For the Plan panel, wire the same across-week handler. In Task 12 the panel receives `onAddSessionToDayAcross` and passes it as `onAddSessionToDay`. The test stubs it, so the unit test is agnostic; match the month-view wiring in Task 12.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/AdminPlanBuilder/PlanGridPanel.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminPlanBuilder/PlanGridPanel.jsx src/components/AdminPlanBuilder/GenerateBar.jsx src/components/AdminPlanBuilder/styles/plan.css src/components/AdminPlanBuilder/PlanGridPanel.test.jsx
git commit -m "feat(plan): Plan-view calendar grid + generate bar"
```

---

## Task 12: Wire the Plan view tab

**Files:**
- Modify: `src/components/AdminPlanBuilder/index.jsx`
- Modify: `src/components/AdminPlanBuilder/buildPanelMap.jsx`

- [ ] **Step 1: Add the `plan` tab to VIEW_TABS**

In `src/components/AdminPlanBuilder/index.jsx`, change `VIEW_TABS`:

```js
const VIEW_TABS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'plan', label: 'Plan' },
]
```

- [ ] **Step 2: Route `view==='plan'` to PlanGridPanel in buildPanelMap**

In `src/components/AdminPlanBuilder/buildPanelMap.jsx`, add the import at the top:

```js
import PlanGridPanel from './PlanGridPanel'
```

Add a `resolveMuscles` to the destructured props (it may need threading from `index.jsx`; if not present there, import the default resolver). Then change the `calendar` value to branch on `plan` first:

```js
    calendar: view === 'plan' ? (
      <PlanGridPanel
        overviewWeeks={overviewWeeks}
        overviewWorkoutsByWeekKey={overviewWorkoutsByWeekKey}
        plan={plan}
        planActions={planActions}
        templates={templates}
        onAddManySessions={onAddManySessions}
        onAddSessionToDay={onAddSessionToDayAcross}
        onSelectWorkout={onSelectWorkout}
        onDeleteWorkout={onDeleteWorkout}
        resolveMuscles={undefined}
      />
    ) : view === 'month' ? (
      <MonthGridPanel
        /* ...unchanged... */
```

`resolveMuscles={undefined}` lets `usePlanTargets` fall back to the default resolver inside `computeWeekSummary`/`scoreSession` (both default it). No new threading needed.

- [ ] **Step 3: Confirm the import of `onAddSessionToDayAcross` exists in buildPanelMap's props**

It is already destructured (`buildPanelMap.jsx:33`). No change needed beyond using it.

- [ ] **Step 4: Run the full plan-builder test suite + build**

Run: `npx vitest run src/components/AdminPlanBuilder/`
Expected: PASS (all existing + new tests).

Run: `npm run build`
Expected: build succeeds (no import errors, no unused-import failures — remove any dead scaffolding flagged).

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminPlanBuilder/index.jsx src/components/AdminPlanBuilder/buildPanelMap.jsx
git commit -m "feat(plan): add Plan view tab wiring"
```

---

## Task 13: Import plan.css globally + final verification

**Files:**
- Modify: `src/components/AdminPlanBuilder/styles/index.css`

- [ ] **Step 1: Ensure plan.css is imported**

`PlanGridPanel.jsx` already imports `./styles/plan.css` directly, so it loads with the component. Additionally add it to the style index for consistency with the other panel styles. In `src/components/AdminPlanBuilder/styles/index.css`, add near the other `@import` lines (check the file first for the import style — it may use `@import './month.css';`):

```css
@import './plan.css';
```

If `index.css` does not use `@import` (e.g. styles are imported per-component), skip this step — the direct import in `PlanGridPanel.jsx` is sufficient. Do not duplicate-load.

- [ ] **Step 2: Run the entire test suite**

Run: `npx vitest run`
Expected: PASS — all suites green.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Manual smoke (document, do not automate)**

Start `npm run dev`, open the plan builder, click the **Plan** tab. Verify:
- Left column shows per-week rule panels with distance/time inputs.
- Typing distance on one week + setting Ramp % shows ramped read-outs on later weeks.
- Quality chips and distribution editor persist (reload keeps them).
- Tagging a day hard/easy/rest persists.
- Selecting weeks + Generate places bank sessions into empty days; bars update.
- Replace on a session swaps it for a similar one.

- [ ] **Step 5: Commit (if index.css changed)**

```bash
git add src/components/AdminPlanBuilder/styles/index.css
git commit -m "feat(plan): load Plan-view styles"
```

---

## Self-Review Notes

**Spec coverage check:**
- Per-week distance/time/distribution/quality targets → Tasks 1, 4, 9 (`weekTargetTypes`, reducers, `WeekRulePanel`). ✓
- Progression ramp (base + 0–20% + override) → Task 2 (`planRamp`), Task 9 inputs, Task 11 GenerateBar ramp input. ✓
- Deload by band / A-race taper / every-Nth / manual → Task 2 (all four paths tested). ✓
- Day hard/easy/rest tags, generator respects → Task 8 (`DayIntensityTag`), Task 3 (solver tag eligibility), Task 10 (threads tags into solver). ✓
- Bank-only fill, count existing, fill gap, never destroy → Task 3 (`existingTotals`, `maxAdds`), Task 10 (`solveForWeek` filters used days; generate only adds). ✓
- Select weeks → Generate (one batched write) → Task 11 selection + Task 10 `generate` → `onAddManySessions`. ✓
- Per-session Replace → Task 8 button, Task 3 `replaceSlot`, Task 10 `replaceSession`, Task 11 `handleReplace`. ✓
- Target-vs-actual bars → Task 9 (`MetricBar`, quality actuals from `scoreWeek`). ✓
- New Plan subpage (3rd tab) → Task 12. ✓
- Persistence on `plans/{athleteId}` (no new collection) → Tasks 4, 5. ✓
- Volume-first solver priority → Task 3 weights `W_DIST=W_TIME=1.0 > W_ACT=W_QUAL=0.4`, tested. ✓

**Placeholder scan:** No TBD/TODO. Every code step has full code. The few NOTEs are explicit verification instructions for export names that must be confirmed against source before coding (getMondayOfWeek, SportPicker props, sessionDuration/Distance exports) — these are guardrails, not placeholders, because the surrounding code is complete and the verification is a one-line grep.

**Type consistency:** `weekTargetKey(week, year)` used identically across Tasks 1/2/4/10/11. `solveWeek(target, { existingTotals, candidates, dayTags, maxAdds })` signature consistent between Task 3 (def) and Task 10 (call). `planActions.{upsertWeekTarget,removeWeekTarget,setPlanSettings}` consistent across Tasks 4/5/10. `resolvedTarget` shape `{distanceKm,durationMin,source}` consistent between Task 2 output, Task 9 prop, Task 11 pass-through. `placements: [{session, weekday}]` consistent Task 3 → 10 → 11.

**Known risk flagged for the implementer:** the A-race taper week-math fixture in Task 2 must align with the project's ISO-week convention — the test note says adjust the fixture date (not the engine) if week 4 of 2026 maps differently.
