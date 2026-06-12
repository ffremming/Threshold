# Training Quality Dimensions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a five-dimension training-quality model (strength, endurance, VO2max, speed, threshold) scored 0–100 per week from the plan, with a per-session load number, a week-plan radar+bars widget, an analysis over-time chart (weekly-stimulus + buildup views), and a muscle-frequency heatmap.

**Architecture:** A pure scoring engine in `src/utils/dimensions/` turns each session into per-quality stimulus + a unified load (per-block physiology when structured, zone-weighted fallback otherwise), aggregates per week against fixed reference doses, and derives a decay-accumulated buildup series. UI components in `src/components/dimensions/` consume the engine and mount into the existing week-plan (`WeekOverview`), session detail (`WorkoutDetailModal`), and `AnalysisDashboard`. No schema/persistence changes — scores are derived on the fly.

**Tech Stack:** React 18 (JS, no TS), Vite, Vitest + Testing Library, Chart.js v4 / react-chartjs-2, `react-body-highlighter`, Tailwind v4 design tokens.

**Reference spec:** `docs/superpowers/specs/2026-06-12-training-quality-dimensions-design.md`

---

## File Structure

**New — engine (pure, fully TDD):**
- `src/utils/dimensions/constants.js` — `QUALITIES`, `QUALITY_COLORS`, `ZONE_WEIGHTS`, `SPRINT_WEIGHT`, `REFERENCE_DOSE`, `TAU`, `STRENGTH_K`, `COVERAGE_K`, strength-activity set.
- `src/utils/dimensions/strength.js` — `muscleScore`, `coverageFactor`, `strengthDose`, `musclesWorkedFromSession`.
- `src/utils/dimensions/scoreSession.js` — `scoreSession(workout)` → `{ load, dims, musclesWorked, fidelity }`; structured + fallback paths; `emptyDims()`, `addDims()`.
- `src/utils/dimensions/scoreWeek.js` — `scoreWeek(workouts)`, `weekScore(rawDose)`, `buildupSeries(weeklyStimulus)`.
- `src/utils/dimensions/index.js` — public re-exports.
- Tests co-located: `constants.test.js`, `strength.test.js`, `scoreSession.test.js`, `scoreWeek.test.js`.

**New — UI components:**
- `src/components/dimensions/QualityRadar.jsx` (+ `.css`) — inline SVG pentagon radar.
- `src/components/dimensions/QualityBars.jsx` (+ `.css`) — horizontal 0–100 bars.
- `src/components/dimensions/QualityWidget.jsx` — radar + bars composite (week-plan).
- `src/components/dimensions/SessionLoadDetail.jsx` (+ `.css`) — load number + quality-share bar.
- `src/components/dimensions/QualityTrendChart.jsx` — analysis 2-view (stimulus/buildup) Chart.js.
- `src/components/dimensions/MuscleHeatmap.jsx` — wraps body chart with frequency coloring.

**Modified — integration:**
- `src/utils/index.js` — re-export `./dimensions`.
- `src/components/AdminDashboard/WeekOverview.jsx` — mount `QualityWidget` + `MuscleHeatmap` (heatmap only if week has strength).
- `src/App/WorkoutDetailModal.jsx` — mount `SessionLoadDetail` at the bottom of the detail.
- `src/components/AnalysisDashboard/sections/ChartGrid.jsx` (or a new section) — mount `QualityTrendChart`; mount `MuscleHeatmap` (windowed).

---

## Verified engine math (use these exact values)

**Strength per-muscle saturation** (`STRENGTH_K = 0.25`): `muscleScore(sets) = 100*(1-e^(-0.25*sets))` → 3→52.8, 6→77.7, 9→89.5.
**Coverage** (`COVERAGE_K = 1.714`): `coverageFactor(n) = n/(n+1.714)` → 4→0.70, 8→0.82.
**Strength dose:** `mean(perMuscleScores) * coverageFactor(nMuscles)`.
**Zone→quality weights per work-minute** (`ZONE_WEIGHTS`):
```
1: { endurance:1.00, threshold:0.00, vo2max:0.00, speed:0.00 }
2: { endurance:0.90, threshold:0.10, vo2max:0.00, speed:0.00 }
3: { endurance:0.45, threshold:0.55, vo2max:0.05, speed:0.00 }
4: { endurance:0.15, threshold:0.55, vo2max:0.40, speed:0.00 }
5: { endurance:0.05, threshold:0.20, vo2max:0.75, speed:0.05 }
```
**Sprint reps:** `SPRINT_WEIGHT = { speed:0.85, vo2max:0.15, endurance:0, threshold:0 }`.
**Reference doses (calibrated so a hard week ≈ 80–90):** Calibrated in Task 8 — start `{ threshold:55, vo2max:28, endurance:300, speed:18, strength:55 }` and adjust against the calibration test.
**Decay τ (weeks):** `{ speed:2, vo2max:3, threshold:4, endurance:6, strength:7 }`. `buildupSeries`: `cap[q] = cap[q]*e^(-1/τ) + stimulus[q]*(1-e^(-1/τ))` (steady-state = input).

---

## Task 1: Engine constants

**Files:**
- Create: `src/utils/dimensions/constants.js`
- Test: `src/utils/dimensions/constants.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest'
import { QUALITIES, ZONE_WEIGHTS, REFERENCE_DOSE, TAU, STRENGTH_K, COVERAGE_K, QUALITY_COLORS } from './constants'

describe('dimensions constants', () => {
  it('defines the five qualities', () => {
    expect(QUALITIES).toEqual(['strength', 'endurance', 'vo2max', 'speed', 'threshold'])
  })
  it('has a colour for every quality', () => {
    QUALITIES.forEach(q => expect(QUALITY_COLORS[q]).toMatch(/^#/))
  })
  it('has a reference dose and tau for every quality', () => {
    QUALITIES.forEach(q => {
      expect(REFERENCE_DOSE[q]).toBeGreaterThan(0)
      expect(TAU[q]).toBeGreaterThan(0)
    })
  })
  it('zone weight rows exist for zones 1-5', () => {
    for (let z = 1; z <= 5; z++) expect(ZONE_WEIGHTS[z]).toBeTruthy()
  })
  it('exposes saturation constants', () => {
    expect(STRENGTH_K).toBeCloseTo(0.25)
    expect(COVERAGE_K).toBeCloseTo(1.714, 2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/utils/dimensions/constants.test.js` → FAIL (module not found).

- [ ] **Step 3: Write implementation**

```js
// src/utils/dimensions/constants.js
export const QUALITIES = ['strength', 'endurance', 'vo2max', 'speed', 'threshold']

export const QUALITY_COLORS = {
  threshold: '#2563eb',
  endurance: '#10b981',
  vo2max: '#f97316',
  speed: '#8b5cf6',
  strength: '#ec4899',
}

// Human-friendly labels (reuse existing English UI tone).
export const QUALITY_LABELS = {
  strength: 'Strength',
  endurance: 'Endurance',
  vo2max: 'VO2max',
  speed: 'Speed',
  threshold: 'Threshold',
}

// Per work-minute distribution of a minute in a given intensity zone across qualities.
export const ZONE_WEIGHTS = {
  1: { endurance: 1.0, threshold: 0.0, vo2max: 0.0, speed: 0.0 },
  2: { endurance: 0.9, threshold: 0.1, vo2max: 0.0, speed: 0.0 },
  3: { endurance: 0.45, threshold: 0.55, vo2max: 0.05, speed: 0.0 },
  4: { endurance: 0.15, threshold: 0.55, vo2max: 0.4, speed: 0.0 },
  5: { endurance: 0.05, threshold: 0.2, vo2max: 0.75, speed: 0.05 },
}

// Sprint / maximal short reps go mostly to speed.
export const SPRINT_WEIGHT = { speed: 0.85, vo2max: 0.15, endurance: 0, threshold: 0 }

// Weekly dose that equals 100 for each quality (calibrated in the calibration task).
export const REFERENCE_DOSE = {
  threshold: 55,
  vo2max: 28,
  endurance: 300,
  speed: 18,
  strength: 55,
}

// Decay time constants (weeks) for the buildup view. Fast qualities fade first.
export const TAU = { speed: 2, vo2max: 3, threshold: 4, endurance: 6, strength: 7 }

// Strength saturation tuning.
export const STRENGTH_K = 0.25
export const COVERAGE_K = 1.714

// Activity tags treated as strength (mirror src/sessionBlocks/units.js STRENGTH_ACTIVITIES).
export const STRENGTH_ACTIVITIES = new Set(['strength', 'calisthenics', 'plyometric', 'crossfit'])
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/utils/dimensions/constants.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/dimensions/constants.js src/utils/dimensions/constants.test.js
git commit -m "feat(dimensions): engine constants for 5-quality scoring"
```

---

## Task 2: Strength saturation model

**Files:**
- Create: `src/utils/dimensions/strength.js`
- Test: `src/utils/dimensions/strength.test.js`

- [ ] **Step 1: Write the failing test** (anchors are the user's spec values)

```js
import { describe, it, expect } from 'vitest'
import { muscleScore, coverageFactor, strengthDose } from './strength'

describe('muscleScore saturation', () => {
  it('hits the user anchors 3->~50, 6->~80, 9->~90', () => {
    expect(muscleScore(3)).toBeGreaterThanOrEqual(50)
    expect(muscleScore(3)).toBeLessThan(56)
    expect(muscleScore(6)).toBeGreaterThanOrEqual(76)
    expect(muscleScore(6)).toBeLessThan(81)
    expect(muscleScore(9)).toBeGreaterThanOrEqual(88)
    expect(muscleScore(9)).toBeLessThan(91)
  })
  it('is monotonic increasing and bounded by 100', () => {
    expect(muscleScore(1)).toBeLessThan(muscleScore(2))
    expect(muscleScore(20)).toBeLessThan(100)
    expect(muscleScore(0)).toBe(0)
  })
})

describe('coverageFactor', () => {
  it('saturates: ~4 muscles ~0.70, ~8 ~0.82', () => {
    expect(coverageFactor(4)).toBeCloseTo(0.7, 1)
    expect(coverageFactor(8)).toBeGreaterThan(0.8)
    expect(coverageFactor(0)).toBe(0)
  })
})

describe('strengthDose', () => {
  it('rewards more muscles but with diminishing returns', () => {
    const oneBig = strengthDose({ quadriceps: 5 })
    const fourGroups = strengthDose({ quadriceps: 5, hamstrings: 4, calves: 3, abdominals: 3 })
    expect(fourGroups).toBeGreaterThan(oneBig)
    // doubling muscles should NOT double the score (saturation)
    expect(fourGroups).toBeLessThan(oneBig * 2.5)
  })
  it('returns 0 for no muscles', () => {
    expect(strengthDose({})).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/utils/dimensions/strength.test.js` → FAIL.

- [ ] **Step 3: Write implementation**

```js
// src/utils/dimensions/strength.js
import { STRENGTH_K, COVERAGE_K } from './constants'

export function muscleScore(sets) {
  if (!sets || sets <= 0) return 0
  return 100 * (1 - Math.exp(-STRENGTH_K * sets))
}

export function coverageFactor(nMuscles) {
  if (!nMuscles || nMuscles <= 0) return 0
  return nMuscles / (nMuscles + COVERAGE_K)
}

// musclesWorked: { [muscle]: totalSets }
export function strengthDose(musclesWorked) {
  const muscles = Object.keys(musclesWorked || {})
  if (muscles.length === 0) return 0
  const perMuscle = muscles.map(m => muscleScore(musclesWorked[m]))
  const mean = perMuscle.reduce((a, b) => a + b, 0) / perMuscle.length
  return mean * coverageFactor(muscles.length)
}
```

- [ ] **Step 4: Run test to verify it passes** — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/dimensions/strength.js src/utils/dimensions/strength.test.js
git commit -m "feat(dimensions): strength saturation + coverage model"
```

---

## Task 3: Muscles-worked extraction from a session

**Files:**
- Modify: `src/utils/dimensions/strength.js` (add `musclesWorkedFromSession`)
- Test: `src/utils/dimensions/strength.test.js` (append)

Background: structured strength sections are `{ kind:'exercise', exerciseId, sets, reps, loadKg }`. The exercise→muscles mapping comes from the strength library. For the engine we accept a resolver so the function stays pure and testable.

- [ ] **Step 1: Append failing test**

```js
import { musclesWorkedFromSession } from './strength'

describe('musclesWorkedFromSession', () => {
  const resolveMuscles = (exerciseId) => ({
    squat: ['quadriceps', 'glutes'],
    bench: ['chest', 'triceps'],
  }[exerciseId] || [])

  it('sums sets per muscle across exercise sections', () => {
    const workout = {
      activityTag: 'strength',
      blocks: { sections: [
        { kind: 'exercise', exerciseId: 'squat', sets: 5 },
        { kind: 'exercise', exerciseId: 'bench', sets: 4 },
      ] },
    }
    const m = musclesWorkedFromSession(workout, resolveMuscles)
    expect(m).toEqual({ quadriceps: 5, glutes: 5, chest: 4, triceps: 4 })
  })

  it('returns empty for a non-strength / blockless session', () => {
    expect(musclesWorkedFromSession({ activityTag: 'run' }, resolveMuscles)).toEqual({})
  })
})
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement**

```js
// append to src/utils/dimensions/strength.js
import { getSections } from '../../sessionBlocks'

export function musclesWorkedFromSession(workout, resolveMuscles) {
  const out = {}
  const sections = getSections(workout?.blocks, workout?.activityTag) || []
  for (const s of sections) {
    if (s.kind !== 'exercise') continue
    const sets = Number(s.sets) || 0
    if (sets <= 0) continue
    for (const muscle of resolveMuscles(s.exerciseId) || []) {
      out[muscle] = (out[muscle] || 0) + sets
    }
  }
  return out
}
```

- [ ] **Step 4: Run to verify it passes** — PASS. (If `getSections` import path differs, confirm via `src/sessionBlocks/index.js` exports.)

- [ ] **Step 5: Commit**

```bash
git add src/utils/dimensions/strength.js src/utils/dimensions/strength.test.js
git commit -m "feat(dimensions): extract muscles-worked from session blocks"
```

---

## Task 4: Dimension dose helpers (empty/add/zone)

**Files:**
- Create: `src/utils/dimensions/scoreSession.js` (helpers first)
- Test: `src/utils/dimensions/scoreSession.test.js`

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest'
import { emptyDims, addDims, doseFromMinutesInZone } from './scoreSession'

describe('dose helpers', () => {
  it('emptyDims is all zero for the five qualities', () => {
    expect(emptyDims()).toEqual({ strength: 0, endurance: 0, vo2max: 0, speed: 0, threshold: 0 })
  })
  it('addDims accumulates in place', () => {
    const a = emptyDims()
    addDims(a, { endurance: 5, threshold: 2 })
    addDims(a, { threshold: 3 })
    expect(a.endurance).toBe(5)
    expect(a.threshold).toBe(5)
  })
  it('doseFromMinutesInZone splits a Z4 minute toward threshold+vo2max', () => {
    const d = doseFromMinutesInZone(10, 4)
    expect(d.threshold).toBeCloseTo(5.5)
    expect(d.vo2max).toBeCloseTo(4.0)
    expect(d.endurance).toBeCloseTo(1.5)
    expect(d.speed).toBe(0)
  })
  it('zone 1 is pure endurance', () => {
    expect(doseFromMinutesInZone(30, 1)).toMatchObject({ endurance: 30, threshold: 0, vo2max: 0 })
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement helpers**

```js
// src/utils/dimensions/scoreSession.js
import { QUALITIES, ZONE_WEIGHTS } from './constants'

export function emptyDims() {
  return { strength: 0, endurance: 0, vo2max: 0, speed: 0, threshold: 0 }
}

export function addDims(target, add) {
  for (const q of QUALITIES) target[q] += add[q] || 0
  return target
}

export function doseFromMinutesInZone(minutes, zone) {
  const w = ZONE_WEIGHTS[zone] || ZONE_WEIGHTS[2]
  const out = emptyDims()
  for (const q of Object.keys(w)) out[q] += minutes * w[q]
  return out
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/utils/dimensions/scoreSession.js src/utils/dimensions/scoreSession.test.js
git commit -m "feat(dimensions): dose helpers (empty/add/zone-split)"
```

---

## Task 5: scoreSession — structured path + load

**Files:**
- Modify: `src/utils/dimensions/scoreSession.js`
- Test: `src/utils/dimensions/scoreSession.test.js` (append)

Behavior: when `workout.blocks.sections` exist, walk each section. For distance/duration sections use their work-minutes (reuse `computeSectionWorkMinutes` from `sessionBlocks`) and the section's intensity zone → `doseFromMinutesInZone`; for `sprint` use `SPRINT_WEIGHT × reps-derived seconds`; for `exercise` add to `musclesWorked` and contribute strength dose. `load` = sum of block loads (cardio: workMinutes × zone-derived intensity factor consistent with existing `getWorkoutIntensityFactor`; strength: scaled strength dose). Returns `{ load, dims, musclesWorked, fidelity:'structured' }`.

- [ ] **Step 1: Append failing test**

```js
import { scoreSession } from './scoreSession'

describe('scoreSession (structured)', () => {
  const resolveMuscles = (id) => ({ squat: ['quadriceps', 'glutes'] }[id] || [])

  it('scores a Z4 interval run toward vo2max+threshold with a load', () => {
    const workout = {
      activityTag: 'run',
      blocks: { sections: [
        { kind: 'warmup', durationMin: 12, zone: 1 },
        { kind: 'interval', reps: 5, repMinutes: 4, zone: 4 },
        { kind: 'cooldown', durationMin: 8, zone: 1 },
      ] },
    }
    const r = scoreSession(workout, { resolveMuscles })
    expect(r.fidelity).toBe('structured')
    expect(r.dims.vo2max).toBeGreaterThan(0)
    expect(r.dims.threshold).toBeGreaterThan(0)
    expect(r.dims.threshold).toBeGreaterThan(r.dims.vo2max) // 0.55 vs 0.40 per Z4 minute
    expect(r.load).toBeGreaterThan(0)
    expect(r.musclesWorked).toEqual({})
  })

  it('scores a strength session via musclesWorked', () => {
    const workout = {
      activityTag: 'strength',
      blocks: { sections: [{ kind: 'exercise', exerciseId: 'squat', sets: 5 }] },
    }
    const r = scoreSession(workout, { resolveMuscles })
    expect(r.dims.strength).toBeGreaterThan(0)
    expect(r.dims.endurance).toBe(0)
    expect(r.musclesWorked).toEqual({ quadriceps: 5, glutes: 5 })
    expect(r.load).toBeGreaterThan(0)
  })
})
```

> Note: section zone field name — confirm whether sections carry an explicit `zone`. If intensity comes from the workout's `intensityZone` rather than per-section, derive the section zone from `normalizeIntensityZone(workout.type, workout.intensityZone)` and pass it down. Adjust the test fixtures to the real shape after inspecting `src/sessionBlocks/sections.js`.

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement structured path** (pseudocode-complete; finalize field access against real section shape)

```js
// append to src/utils/dimensions/scoreSession.js
import { getSections } from '../../sessionBlocks'
import { computeSectionWorkMinutes } from '../../sessionBlocks/sections'
import { normalizeIntensityZone } from '../intensity'
import { SPRINT_WEIGHT } from './constants'
import { strengthDose, musclesWorkedFromSession } from './strength'

const STRENGTH_LOAD_SCALE = 0.9 // tune so strength load is comparable to cardio

function sectionZone(section, workout) {
  if (section.zone) return section.zone
  return normalizeIntensityZone(workout?.type, workout?.intensityZone) || 2
}

function cardioBlockLoad(minutes, zone) {
  // mirror getWorkoutIntensityFactor shape: 0.75 + zone*0.35
  return minutes * (0.75 + zone * 0.35)
}

export function scoreSession(workout, { resolveMuscles } = {}) {
  const sections = getSections(workout?.blocks, workout?.activityTag)
  if (!sections || sections.length === 0) {
    return scoreSessionFallback(workout) // Task 6
  }
  const dims = emptyDims()
  let load = 0
  for (const s of sections) {
    if (s.kind === 'exercise') {
      // strength handled in aggregate below
      continue
    }
    if (s.kind === 'sprint') {
      const seconds = (Number(s.reps) || 0) * (Number(s.sprintSec) || 0)
      const minutes = seconds / 60
      for (const q of Object.keys(SPRINT_WEIGHT)) dims[q] += minutes * SPRINT_WEIGHT[q]
      load += cardioBlockLoad(minutes, 5)
      continue
    }
    const minutes = computeSectionWorkMinutes(s, workout?.activityTag) || 0
    if (minutes <= 0) continue
    const zone = (s.kind === 'warmup' || s.kind === 'cooldown') ? 1 : sectionZone(s, workout)
    addDims(dims, doseFromMinutesInZone(minutes, zone))
    load += cardioBlockLoad(minutes, zone)
  }
  // strength aggregate
  const musclesWorked = resolveMuscles ? musclesWorkedFromSession(workout, resolveMuscles) : {}
  const sDose = strengthDose(musclesWorked)
  if (sDose > 0) {
    dims.strength += sDose
    load += sDose * STRENGTH_LOAD_SCALE
  }
  return { load: Math.round(load), dims, musclesWorked, fidelity: 'structured' }
}
```

- [ ] **Step 4: Run → PASS** (after aligning fixture field names with the real section shape).

- [ ] **Step 5: Commit**

```bash
git add src/utils/dimensions/scoreSession.js src/utils/dimensions/scoreSession.test.js
git commit -m "feat(dimensions): scoreSession structured path + load"
```

---

## Task 6: scoreSession — text-only fallback

**Files:**
- Modify: `src/utils/dimensions/scoreSession.js` (`scoreSessionFallback`)
- Test: `src/utils/dimensions/scoreSession.test.js` (append)

Behavior: no blocks → estimate duration (`estimateWorkoutDuration`), normalize zone(s) from `type`+`intensityZone`, split the estimated minutes across qualities via `doseFromMinutesInZone` (average across tagged zones). Strength-tagged activities route to a duration proxy → strength dose (no muscle data; `musclesWorked:{}`). Returns `fidelity:'estimated'`.

- [ ] **Step 1: Append failing test**

```js
import { estimateWorkoutDuration } from '../load'

describe('scoreSession (fallback, no blocks)', () => {
  it('scores a text-only easy run as endurance', () => {
    const r = scoreSession({ activityTag: 'run', type: 'continuous', intensityZone: [2], distance: '10 km' })
    expect(r.fidelity).toBe('estimated')
    expect(r.dims.endurance).toBeGreaterThan(0)
    expect(r.dims.vo2max).toBe(0)
    expect(r.load).toBeGreaterThan(0)
  })
  it('scores a text-only strength session as strength via duration proxy', () => {
    const r = scoreSession({ activityTag: 'strength', type: 'continuous', notes: '45 min' })
    expect(r.dims.strength).toBeGreaterThan(0)
    expect(r.musclesWorked).toEqual({})
  })
  it('an empty/unknown session yields zero dims but does not throw', () => {
    const r = scoreSession({})
    expect(r.dims).toEqual({ strength: 0, endurance: 0, vo2max: 0, speed: 0, threshold: 0 })
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement fallback**

```js
// append to src/utils/dimensions/scoreSession.js
import { estimateWorkoutDuration } from '../load'
import { normalizeIntensityZones } from '../intensity'
import { STRENGTH_ACTIVITIES } from './constants'

const STRENGTH_PROXY_PER_MIN = 1.1 // dose per strength-minute (tune in calibration)

export function scoreSessionFallback(workout) {
  const dims = emptyDims()
  const minutes = estimateWorkoutDuration(workout) || 0

  if (STRENGTH_ACTIVITIES.has(workout?.activityTag)) {
    const sDose = Math.min(100, minutes * STRENGTH_PROXY_PER_MIN)
    dims.strength += sDose
    return { load: Math.round(sDose * 0.9), dims, musclesWorked: {}, fidelity: 'estimated' }
  }

  if (minutes > 0) {
    const zones = normalizeIntensityZones(workout?.type, workout?.intensityZone)
    const list = zones && zones.length ? zones : [2]
    const per = minutes / list.length
    let load = 0
    for (const z of list) {
      addDims(dims, doseFromMinutesInZone(per, z))
      load += per * (0.75 + z * 0.35)
    }
    return { load: Math.round(load), dims, musclesWorked: {}, fidelity: 'estimated' }
  }
  return { load: 0, dims, musclesWorked: {}, fidelity: 'estimated' }
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/utils/dimensions/scoreSession.js src/utils/dimensions/scoreSession.test.js
git commit -m "feat(dimensions): scoreSession text-only fallback path"
```

---

## Task 7: scoreWeek + weekScore normalization

**Files:**
- Create: `src/utils/dimensions/scoreWeek.js`
- Test: `src/utils/dimensions/scoreWeek.test.js`

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest'
import { scoreWeek, weekScore } from './scoreWeek'
import { REFERENCE_DOSE } from './constants'

describe('weekScore normalization', () => {
  it('maps raw dose to 0-100 against the reference dose, clamped', () => {
    const s = weekScore({ threshold: REFERENCE_DOSE.threshold, vo2max: 0 })
    expect(s.threshold).toBe(100)
    expect(s.vo2max).toBe(0)
  })
  it('clamps above 100', () => {
    expect(weekScore({ threshold: REFERENCE_DOSE.threshold * 3 }).threshold).toBe(100)
  })
})

describe('scoreWeek', () => {
  it('aggregates session doses and exposes musclesWorked + perSession + load', () => {
    const resolveMuscles = (id) => ({ squat: ['quadriceps', 'glutes'] }[id] || [])
    const workouts = [
      { activityTag: 'run', type: 'continuous', intensityZone: [2], distance: '10 km' },
      { activityTag: 'strength', blocks: { sections: [{ kind: 'exercise', exerciseId: 'squat', sets: 5 }] } },
    ]
    const r = scoreWeek(workouts, { resolveMuscles })
    expect(r.dims.endurance).toBeGreaterThan(0)
    expect(r.dims.strength).toBeGreaterThan(0)
    expect(r.musclesWorked.quadriceps).toBe(5)
    expect(r.load).toBeGreaterThan(0)
    expect(r.perSession).toHaveLength(2)
    Object.values(r.dims).forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100) })
  })
  it('an empty week is all zeros and has no muscle data', () => {
    const r = scoreWeek([], {})
    expect(r.dims).toEqual({ strength: 0, endurance: 0, vo2max: 0, speed: 0, threshold: 0 })
    expect(Object.keys(r.musclesWorked)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```js
// src/utils/dimensions/scoreWeek.js
import { QUALITIES, REFERENCE_DOSE } from './constants'
import { emptyDims, addDims, scoreSession } from './scoreSession'
import { strengthDose } from './strength'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export function weekScore(rawDose) {
  const out = {}
  for (const q of QUALITIES) {
    out[q] = Math.round(clamp((100 * (rawDose[q] || 0)) / REFERENCE_DOSE[q], 0, 100))
  }
  return out
}

export function scoreWeek(workouts, opts = {}) {
  const raw = emptyDims()
  const musclesWorked = {}
  let load = 0
  const perSession = []
  for (const w of workouts || []) {
    const s = scoreSession(w, opts)
    addDims(raw, s.dims)
    load += s.load
    for (const m of Object.keys(s.musclesWorked)) musclesWorked[m] = (musclesWorked[m] || 0) + s.musclesWorked[m]
    perSession.push({ workout: w, ...s })
  }
  return { dims: weekScore(raw), rawDims: raw, load: Math.round(load), musclesWorked, perSession }
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/utils/dimensions/scoreWeek.js src/utils/dimensions/scoreWeek.test.js
git commit -m "feat(dimensions): weekly aggregation + reference normalization"
```

---

## Task 8: Calibrate reference doses (tuning test)

**Files:**
- Modify: `src/utils/dimensions/constants.js` (`REFERENCE_DOSE`, proxy constants)
- Test: `src/utils/dimensions/scoreWeek.test.js` (append a calibration test)

Goal: a representative **hard-but-sustainable** week lands ~80–90 on its dominant quality; an **easy/off** week lands low. Adjust `REFERENCE_DOSE` until the test passes.

- [ ] **Step 1: Append calibration test**

```js
describe('calibration: realistic weeks land in sensible ranges', () => {
  const z = (min, zone) => ({ activityTag: 'run', type: 'continuous', intensityZone: [zone], notes: `${min} min` })

  it('a hard threshold week scores threshold ~75-95', () => {
    const week = [
      { activityTag: 'run', blocks: { sections: [ { kind:'warmup', durationMin:12, zone:1 }, { kind:'interval', reps:5, repMinutes:6, zone:3 }, { kind:'cooldown', durationMin:8, zone:1 } ] } },
      { activityTag: 'run', blocks: { sections: [ { kind:'warmup', durationMin:12, zone:1 }, { kind:'interval', reps:4, repMinutes:8, zone:3 }, { kind:'cooldown', durationMin:8, zone:1 } ] } },
      { activityTag: 'run', blocks: { sections: [ { kind:'interval', reps:6, repMinutes:5, zone:4 } ] } },
      z(70, 1), z(60, 2),
    ]
    const r = scoreWeek(week, {})
    expect(r.dims.threshold).toBeGreaterThanOrEqual(75)
    expect(r.dims.threshold).toBeLessThanOrEqual(95)
  })

  it('an easy recovery week scores every quality below 40', () => {
    const r = scoreWeek([z(40, 1), z(35, 1)], {})
    Object.values(r.dims).forEach(v => expect(v).toBeLessThan(40))
  })
})
```

- [ ] **Step 2: Run → likely FAIL** (threshold too low/high with the seed reference values).

- [ ] **Step 3: Tune `REFERENCE_DOSE.threshold`** (and others if needed) in `constants.js` until both tests pass. Document the chosen values with a one-line comment explaining the calibration target. Re-run after each change: `npx vitest run src/utils/dimensions/scoreWeek.test.js`.

- [ ] **Step 4: Run full engine suite → PASS** — `npx vitest run src/utils/dimensions/`.

- [ ] **Step 5: Commit**

```bash
git add src/utils/dimensions/constants.js src/utils/dimensions/scoreWeek.test.js
git commit -m "feat(dimensions): calibrate reference doses to realistic week ranges"
```

---

## Task 9: buildupSeries (decay accumulation)

**Files:**
- Modify: `src/utils/dimensions/scoreWeek.js` (`buildupSeries`)
- Test: `src/utils/dimensions/scoreWeek.test.js` (append)

- [ ] **Step 1: Append failing test**

```js
import { buildupSeries } from './scoreWeek'

describe('buildupSeries', () => {
  it('crests during a block then fades when stimulus stops', () => {
    const stim = [
      { threshold: 30 }, { threshold: 50 }, { threshold: 70 }, { threshold: 85 }, { threshold: 90 }, { threshold: 90 },
      { threshold: 0 }, { threshold: 0 }, { threshold: 0 },
    ]
    const out = buildupSeries(stim)
    const peak = Math.max(...out.map(w => w.threshold))
    expect(out[5].threshold).toBeCloseTo(peak, 0) // peak at end of block
    expect(out[8].threshold).toBeLessThan(out[5].threshold) // faded after stopping
  })

  it('speed fades faster than endurance after stopping (tau ordering)', () => {
    const stim = [
      { speed: 80, endurance: 80 }, { speed: 80, endurance: 80 }, { speed: 80, endurance: 80 },
      { speed: 0, endurance: 0 }, { speed: 0, endurance: 0 }, { speed: 0, endurance: 0 },
    ]
    const out = buildupSeries(stim)
    expect(out[5].speed).toBeLessThan(out[5].endurance)
  })

  it('steady-state approaches the input level', () => {
    const stim = Array.from({ length: 30 }, () => ({ endurance: 60 }))
    const out = buildupSeries(stim)
    expect(out[29].endurance).toBeGreaterThan(55)
    expect(out[29].endurance).toBeLessThanOrEqual(60.5)
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```js
// append to src/utils/dimensions/scoreWeek.js
import { TAU } from './constants'

export function buildupSeries(weeklyStimulus) {
  const decay = {}
  for (const q of QUALITIES) decay[q] = Math.exp(-1 / TAU[q])
  const cap = emptyDims()
  const out = []
  for (const wk of weeklyStimulus || []) {
    for (const q of QUALITIES) cap[q] = cap[q] * decay[q] + (wk[q] || 0) * (1 - decay[q])
    out.push({ ...cap })
  }
  return out
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit + expose public API**

```js
// src/utils/dimensions/index.js
export * from './constants'
export { muscleScore, coverageFactor, strengthDose, musclesWorkedFromSession } from './strength'
export { scoreSession, scoreSessionFallback, emptyDims, addDims, doseFromMinutesInZone } from './scoreSession'
export { scoreWeek, weekScore, buildupSeries } from './scoreWeek'
```

```js
// add to src/utils/index.js (alongside existing re-exports)
export * from './dimensions'
```

```bash
git add src/utils/dimensions/ src/utils/index.js
git commit -m "feat(dimensions): buildup decay series + public engine API"
```

---

## Task 10: Muscle resolver bridge (engine ↔ strength library)

**Files:**
- Create: `src/components/dimensions/useMuscleResolver.js`
- Test: none (thin adapter over existing tested library); covered by component tests.

Provide a `resolveMuscles(exerciseId)` backed by the existing exercise library so components can pass it to the engine. Inspect `src/strength/library.js` for the lookup (exercise by id → `primaryMuscles`/`secondaryMuscles` using `DATASET_MUSCLES` vocabulary).

- [ ] **Step 1: Implement adapter**

```js
// src/components/dimensions/useMuscleResolver.js
import { getExerciseById } from '../../strength/library' // confirm exact export name

export function makeMuscleResolver() {
  return (exerciseId) => {
    const ex = getExerciseById?.(exerciseId)
    if (!ex) return []
    return [...(ex.primaryMuscles || []), ...(ex.secondaryMuscles || [])]
  }
}
```

- [ ] **Step 2: Smoke-check** in a scratch test that a known exercise id returns a non-empty muscle list; delete the scratch after confirming the real export name.

- [ ] **Step 3: Commit**

```bash
git add src/components/dimensions/useMuscleResolver.js
git commit -m "feat(dimensions): muscle resolver bridging engine and exercise library"
```

---

## Task 11: QualityBars component

**Files:**
- Create: `src/components/dimensions/QualityBars.jsx`, `QualityBars.css`
- Test: `src/components/dimensions/QualityBars.test.jsx`

**Interface:** `<QualityBars dims={{strength,endurance,vo2max,speed,threshold}} />` — renders one labelled 0–100 bar per quality in fixed order (threshold, endurance, speed, vo2max, strength), colored via `QUALITY_COLORS`, value shown with `th-num`.

**Acceptance:**
- [ ] Renders all five quality labels and their integer values.
- [ ] Bar width % equals the score; uses `QUALITY_COLORS`.
- [ ] Test: render with sample dims, assert each label + value present (`getByText('Threshold')`, `getByText('81')`).
- [ ] Commit: `feat(dimensions): QualityBars component`.

---

## Task 12: QualityRadar component

**Files:**
- Create: `src/components/dimensions/QualityRadar.jsx`, `QualityRadar.css`
- Test: `src/components/dimensions/QualityRadar.test.jsx`

**Interface:** `<QualityRadar dims={...} size={220} />` — inline SVG pentagon, five axes (same order as bars), grid rings at 25/50/75/100, filled data polygon (accent stroke + translucent fill). Vertex for axis i at angle `-90° + i*72°`, radius `= score/100 * R`.

**Acceptance:**
- [ ] Renders an `<svg>` with a `<polygon>` whose points reflect the five scores.
- [ ] Pure presentational, no business logic.
- [ ] Test: render, assert `container.querySelector('svg polygon')` exists and point count = 5.
- [ ] Commit: `feat(dimensions): QualityRadar SVG component`.

---

## Task 13: QualityWidget (radar + bars composite)

**Files:**
- Create: `src/components/dimensions/QualityWidget.jsx`
- Test: `src/components/dimensions/QualityWidget.test.jsx`

**Interface:** `<QualityWidget dims={...} title="Training quality" />` — `Card` containing `QualityRadar` (left) + `QualityBars` (right), responsive stack on narrow. Uses existing `Card` from `components/ui`.

**Acceptance:**
- [ ] Renders both child components with the same dims.
- [ ] Test: render, assert both a radar `svg` and the five bar labels appear.
- [ ] Commit: `feat(dimensions): QualityWidget radar+bars composite`.

---

## Task 14: SessionLoadDetail component

**Files:**
- Create: `src/components/dimensions/SessionLoadDetail.jsx`, `SessionLoadDetail.css`
- Test: `src/components/dimensions/SessionLoadDetail.test.jsx`

**Interface:** `<SessionLoadDetail score={scoreSessionResult} />` where `score = { load, dims }`. Renders: "Session load" label + big `th-num` load value; a thin stacked quality-share bar (segment widths = each quality's share of total dose); a small legend of contributing qualities with %; the hint "Load = sum of every block."

**Acceptance:**
- [ ] Shows the load number.
- [ ] Share bar segments sum to 100% of the contributing qualities (zero-dose qualities omitted).
- [ ] Test: render with `{ load: 118, dims: { threshold: 40, vo2max: 54, endurance: 24, speed:0, strength:0 } }`; assert "118" present and three legend entries.
- [ ] Commit: `feat(dimensions): SessionLoadDetail load + quality breakdown`.

---

## Task 15: Mount SessionLoadDetail in the session detail

**Files:**
- Modify: `src/App/WorkoutDetailModal.jsx` (this file is already modified in the working tree — integrate carefully, append at the bottom of the detail body)

**Approach:** compute `const score = useMemo(() => scoreSession(workout, { resolveMuscles }), [workout])` using `makeMuscleResolver()`; render `<SessionLoadDetail score={score} />` at the bottom of the detail content, after existing sections. Do not alter the collapsed card.

**Acceptance:**
- [ ] Opening a session detail shows the load block at the bottom.
- [ ] No change to collapsed card / header.
- [ ] Manual check via `npm run dev`; existing `WorkoutDetailModal` tests still pass (`npx vitest run src/App`).
- [ ] Commit: `feat(dimensions): show session load in detail view`.

---

## Task 16: Mount QualityWidget + MuscleHeatmap on the week-plan page

**Files:**
- Create: `src/components/dimensions/MuscleHeatmap.jsx`
- Modify: `src/components/AdminDashboard/WeekOverview.jsx`

**MuscleHeatmap interface:** `<MuscleHeatmap musclesWorked={{muscle:sets}} title=... />` — reuses `MuscleMap` / `react-body-highlighter` + `DATASET_TO_HIGHLIGHTER`; color intensity ramps with sets per muscle (normalize to max in the set; map to a light→accent ramp). Returns `null` if `musclesWorked` is empty.

**WeekOverview integration:**
- Compute `const weekScores = useMemo(() => scoreWeek(weekWorkouts, { resolveMuscles }), [weekWorkouts])`.
- Render `<QualityWidget dims={weekScores.dims} />` in the week summary area.
- Render `<MuscleHeatmap musclesWorked={weekScores.musclesWorked} />` — which self-hides when the week has no strength (empty muscles map), satisfying "only if the week has strength."

**Acceptance:**
- [ ] A week with strength shows the heatmap; a pure-cardio week does not.
- [ ] The radar+bars widget shows the week's five scores.
- [ ] `WeekOverview` tests still pass (`npx vitest run src/components/AdminDashboard/WeekOverview.test.jsx`); add a test asserting the widget renders and the heatmap is absent for a cardio-only week.
- [ ] Commit: `feat(dimensions): week-plan quality widget + muscle heatmap`.

---

## Task 17: QualityTrendChart (analysis, two views)

**Files:**
- Create: `src/components/dimensions/QualityTrendChart.jsx`
- Test: `src/components/dimensions/QualityTrendChart.test.jsx`

**Interface:** `<QualityTrendChart weeklyScores={[{week, dims}]} nowIndex={n} />`.
- Toggle state `view: 'stimulus' | 'buildup'`.
- `stimulus`: five Chart.js line datasets of `dims[q]` per week.
- `buildup`: `buildupSeries(weeklyScores.map(w => w.dims))` → five line datasets.
- Shared: 0–100 y-axis; legend chips toggle datasets; `nowMarkerPlugin`-style divider at `nowIndex`; weeks after `nowIndex` rendered with dashed segment (use segment styling or a second dataset slice); smoothed `tension: 0.34`; `QUALITY_COLORS`.

**Acceptance:**
- [ ] Toggling switches the dataset between raw and decayed series.
- [ ] Five lines colored per `QUALITY_COLORS`; legend present.
- [ ] Test: render with a 12-week fixture; assert the toggle buttons exist and a `<canvas>` renders; clicking the toggle updates an exposed `data-view` attribute.
- [ ] Commit: `feat(dimensions): analysis quality trend chart (stimulus + buildup)`.

---

## Task 18: Mount QualityTrendChart + windowed MuscleHeatmap in AnalysisDashboard

**Files:**
- Modify: `src/components/AnalysisDashboard/sections/ChartGrid.jsx` (or add a new section component `QualitySection.jsx` and mount it from `AnalysisDashboard/index.jsx`).

**Approach:**
- Build `weeklyScores` for the visible analysis window: `visibleWeeks.map(week => ({ week, dims: scoreWeek(workoutsForWeek(week), { resolveMuscles }).dims }))`.
- Aggregate `musclesWorked` across the window for the heatmap.
- Determine `nowIndex` from the current week within the window.
- Render `<QualityTrendChart weeklyScores={weeklyScores} nowIndex={nowIndex} />` and `<MuscleHeatmap musclesWorked={windowMuscles} title="Muscles trained (window)" />`.

**Acceptance:**
- [ ] Analysis view shows the two-view trend chart over the selected window.
- [ ] Heatmap reflects muscles worked across the window.
- [ ] Existing analysis tests pass; add a smoke test that the section renders with a multi-week fixture.
- [ ] Commit: `feat(dimensions): mount quality trend + muscle heatmap in analysis`.

---

## Task 19: Full verification pass

- [ ] **Step 1: Run the entire test suite** — `npx vitest run` → all pass (engine + components + pre-existing).
- [ ] **Step 2: Lint/build** — `npm run build` (Vite) → succeeds with no new errors.
- [ ] **Step 3: Manual smoke** — `npm run dev`; verify: (a) week-plan radar+bars+load+heatmap on a week with strength, (b) session detail load block, (c) analysis two-view toggle + windowed heatmap. Capture anything off.
- [ ] **Step 4: Self-review the diff** — `git diff main --stat` to confirm only intended files changed; the feature commits are separable from pre-existing WIP.
- [ ] **Step 5: Hand off for the single review** (per chosen delivery).

---

## Self-Review (run against the spec)

**Spec coverage:**
- Five qualities, 0–100, fixed reference dose → Tasks 1,7,8. ✓
- Per-block physiology + fallback → Tasks 5,6. ✓
- Strength saturation + muscle coverage + heatmap → Tasks 2,3,16,18. ✓
- Per-session load in card detail → Tasks 14,15. ✓
- Week-plan radar+bars → Tasks 11,12,13,16. ✓
- Analysis two views (stimulus + buildup w/ decay) → Tasks 9,17,18. ✓
- Muscle heatmap (week-plan if strength; analysis windowed) → Tasks 16,18. ✓
- No schema change; derived on the fly → engine is pure; integration uses `useMemo`. ✓

**Open verifications flagged for execution (resolve against real code, not guesses):**
1. Section intensity source — explicit `section.zone` vs workout-level `intensityZone` (Task 5 note).
2. `computeSectionWorkMinutes` / `getSections` exact import paths (`src/sessionBlocks/`).
3. `normalizeIntensityZone(s)` exact export names in `src/utils/intensity.js`.
4. Exercise→muscle lookup export name in `src/strength/library.js` (Task 10).
5. `react-body-highlighter` data prop shape via existing `MuscleMap.jsx` (Task 16).

These are interface confirmations, not design questions — adjust field access to match, keep behavior per tests.
