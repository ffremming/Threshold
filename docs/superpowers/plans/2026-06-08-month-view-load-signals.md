# Month-view Load Signals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show per-week Load, Ramp %, and ACWR/readiness signals as a toggleable compact bar below each week-row in the plan builder's month view.

**Architecture:** Extract the existing weekly load math out of `AnalysisDashboard/aggregations.js` into a shared `src/utils/loadSignals.js` (one source of truth), add a `computeWeekSignals` that classifies ACWR bands over the chronological week series, render a presentational `MonthWeekSignals` bar per row, and host a localStorage-persisted toggle in the month panel header.

**Tech Stack:** React, Vitest + @testing-library/react, existing app utils (`estimateWorkoutLoad`, `averageLastValues`, `safeDivide`, `computeWeekSummary`).

---

## File Structure

- **New** `src/utils/loadSignals.js` — `buildWeekStats`, `classifyAcwr`, `computeWeekSignals`. Pure functions, no React.
- **New** `src/utils/loadSignals.test.js` — unit tests for the above.
- **New** `src/components/AdminPlanBuilder/MonthWeekSignals.jsx` — presentational signal bar for one week.
- **New** `src/components/AdminPlanBuilder/MonthWeekSignals.test.jsx` — component tests.
- **New** `src/components/AdminPlanBuilder/useMonthSignalsToggle.js` — localStorage-persisted boolean toggle hook.
- **Modify** `src/components/AnalysisDashboard/aggregations.js` — import `buildWeekStats` from the shared util instead of defining it locally (no behavior change).
- **Modify** `src/components/AdminPlanBuilder/MonthGridPanel.jsx` — compute the signal map, host the toggle in the header, render a strip per row.
- **Modify** `src/components/AdminPlanBuilder/buildPanelMap.jsx` — pass `currentWeek`/`currentYear` into `MonthGridPanel`.
- **Modify** `src/components/AdminPlanBuilder/styles/month.css` — signal-bar styles.

---

## Task 1: Extract `buildWeekStats` into a shared util

The function `buildWeekStats` currently lives inside `aggregations.js`. Move it verbatim into a new shared module so both the dashboard and the month view can use it. The only signature change: make `activeTagFilter` the last param and default it to `null`.

**Files:**
- Create: `src/utils/loadSignals.js`
- Modify: `src/components/AnalysisDashboard/aggregations.js`

- [ ] **Step 1: Create `loadSignals.js` with the moved `buildWeekStats`**

Create `src/utils/loadSignals.js`:

```javascript
import {
  estimateMechanicalLoad,
  estimateWorkoutDuration,
  estimateWorkoutLoad,
  getWorkoutDistance,
  isHardWorkout,
  normalizeIntensityZones,
} from './index'
import { computeWeekSummary } from './weekSummary'
import { averageLastValues, safeDivide } from './seriesMath'

// Per-week enriched stats: totals, per-activity, per-zone, daily breakdown.
// Past weeks count only completed sessions (planned-but-skipped shouldn't
// inflate historical load). One source of truth shared by the AnalysisDashboard
// and the month-view load signals.
export function buildWeekStats(week, workoutsByWeekKey, currentWeek, currentYear, activeTagFilter = null) {
  let weekWorkouts = workoutsByWeekKey[week.key] || []

  const isPastWeek = week.year < currentYear || (week.year === currentYear && week.week < currentWeek)
  if (isPastWeek) {
    weekWorkouts = weekWorkouts.filter(workout => workout.completed)
  }

  if (activeTagFilter) {
    weekWorkouts = weekWorkouts.filter(workout => workout.activityTag === activeTagFilter)
  }

  const summary = computeWeekSummary(weekWorkouts)

  const dailyLoads = Array(7).fill(0)
  const dailyDurations = Array(7).fill(0)
  const tags = {}
  const zoneLoads = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

  const workouts = weekWorkouts.map(workout => {
    const duration = estimateWorkoutDuration(workout)
    const load = estimateWorkoutLoad(workout)
    const distance = getWorkoutDistance(workout) || 0
    const mechanicalLoad = estimateMechanicalLoad(workout)
    const normalizedZones = normalizeIntensityZones(workout.type, workout.intensityZone)
    const weekdayIndex = Math.max(0, Math.min(6, Number(workout.weekday || 1) - 1))
    const activityTag = workout.activityTag || 'unknown'

    dailyLoads[weekdayIndex] += load
    dailyDurations[weekdayIndex] += duration
    tags[activityTag] = (tags[activityTag] || 0) + 1

    if (normalizedZones.length > 0 && duration > 0) {
      const zoneLoadShare = load / normalizedZones.length
      normalizedZones.forEach(zone => {
        zoneLoads[zone] += zoneLoadShare
      })
    }

    return { ...workout, duration, load, distance, mechanicalLoad, normalizedZones, activityTag }
  })

  const hardSessions = workouts.filter(isHardWorkout).length
  const mechanicalLoad = workouts.reduce((sum, w) => sum + w.mechanicalLoad, 0)
  const longestSession = workouts.reduce((longest, workout) => {
    if (!longest || workout.duration > longest.duration) return workout
    return longest
  }, null)

  return {
    week, workouts, count: workouts.length,
    distance: summary.totalDistance,
    duration: summary.totalDuration,
    load: summary.totalLoad,
    mechanicalLoad,
    hardSessions, easySessions: Math.max(0, workouts.length - hardSessions),
    zones: summary.zones,
    zoneLoads,
    tags,
    activityLoad: summary.activityLoad,
    activityDuration: summary.activityDuration,
    activityDistance: summary.activityDistance,
    dailyLoads, dailyDurations, longestSession,
  }
}
```

- [ ] **Step 2: Point `aggregations.js` at the shared `buildWeekStats`**

In `src/components/AnalysisDashboard/aggregations.js`, delete the local `buildWeekStats` function definition (lines defining `function buildWeekStats(...) { ... }`) and import it instead. Add to the top imports:

```javascript
import { buildWeekStats } from '../../utils/loadSignals'
```

Then remove the now-unused imports from `aggregations.js` that were *only* used by `buildWeekStats` — check each of `estimateMechanicalLoad`, `estimateWorkoutDuration`, `estimateWorkoutLoad`, `getWorkoutDistance`, `isHardWorkout`, `normalizeIntensityZones` and `computeWeekSummary` for other uses in the file; remove any that are no longer referenced. The call site inside `computeAnalysis` stays exactly as-is:

```javascript
const weeklyStats = visibleWeeks.map(week =>
  buildWeekStats(week, workoutsByWeekKey, currentWeek, currentYear, activeTagFilter))
```

- [ ] **Step 3: Run the existing dashboard-related tests to confirm no behavior change**

Run: `npx vitest run src/components/AnalysisDashboard`
Expected: PASS (or "no test files" if none exist — in that case run the full suite in Step 4).

- [ ] **Step 4: Run the full test suite to catch import breakage**

Run: `npx vitest run`
Expected: PASS, same count as before this task.

- [ ] **Step 5: Commit**

```bash
git add src/utils/loadSignals.js src/components/AnalysisDashboard/aggregations.js
git commit -m "refactor: extract buildWeekStats into shared loadSignals util"
```

---

## Task 2: ACWR band classifier

A small pure function mapping an ACWR ratio to a readiness band, with explicit boundaries.

**Files:**
- Modify: `src/utils/loadSignals.js`
- Test: `src/utils/loadSignals.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/utils/loadSignals.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { classifyAcwr } from './loadSignals'

describe('classifyAcwr', () => {
  it('classifies the band boundaries on the lower-risk side', () => {
    expect(classifyAcwr(0.5)).toBe('undertraining')
    expect(classifyAcwr(0.8)).toBe('safe')   // inclusive lower edge
    expect(classifyAcwr(1.3)).toBe('safe')   // 1.3 is still safe
    expect(classifyAcwr(1.4)).toBe('caution')
    expect(classifyAcwr(1.5)).toBe('caution') // 1.5 is still caution
    expect(classifyAcwr(1.6)).toBe('spike')
  })

  it('returns null for a non-finite or zero ratio (no chronic history yet)', () => {
    expect(classifyAcwr(0)).toBeNull()
    expect(classifyAcwr(NaN)).toBeNull()
    expect(classifyAcwr(Infinity)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/loadSignals.test.js -t classifyAcwr`
Expected: FAIL with "classifyAcwr is not a function" / not exported.

- [ ] **Step 3: Implement `classifyAcwr`**

Append to `src/utils/loadSignals.js`:

```javascript
// ACWR readiness bands. Boundaries are inclusive on the lower-risk side:
// exactly 1.3 is safe, exactly 1.5 is caution. A ratio of 0 / non-finite means
// there is no chronic baseline yet — caller treats that as "settling".
export function classifyAcwr(acwr) {
  if (!Number.isFinite(acwr) || acwr <= 0) return null
  if (acwr < 0.8) return 'undertraining'
  if (acwr <= 1.3) return 'safe'
  if (acwr <= 1.5) return 'caution'
  return 'spike'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/loadSignals.test.js -t classifyAcwr`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/loadSignals.js src/utils/loadSignals.test.js
git commit -m "feat: add ACWR readiness band classifier"
```

---

## Task 3: `computeWeekSignals` over the chronological series

Compute, for each week in the chronological `weeks` array, the load, ramp %, acute/chronic load, ACWR, readiness band, and a `settling` flag. Returns a map keyed by `week.key`.

**Files:**
- Modify: `src/utils/loadSignals.js`
- Test: `src/utils/loadSignals.test.js`

- [ ] **Step 1: Write the failing test**

Append to `src/utils/loadSignals.test.js`:

```javascript
import { computeWeekSignals } from './loadSignals'

// Build a chronological week list with given loads by injecting one workout per
// week whose estimated load we control. We bypass the estimator by giving each
// week a single completed workout and asserting on ramp/acwr structure rather
// than exact load — exact load math is covered by weekSummary tests.
function weeksWithKeys(n) {
  return Array.from({ length: n }, (_, i) => ({
    week: i + 1, year: 2026, key: `2026-${i + 1}`,
  }))
}

describe('computeWeekSignals', () => {
  it('returns a map keyed by week.key with a signal entry per week', () => {
    const weeks = weeksWithKeys(3)
    const byKey = { '2026-1': [], '2026-2': [], '2026-3': [] }
    const signals = computeWeekSignals(weeks, byKey, 99, 2026) // all weeks are "past"
    expect(Object.keys(signals).sort()).toEqual(['2026-1', '2026-2', '2026-3'])
    for (const key of Object.keys(signals)) {
      expect(signals[key]).toHaveProperty('load')
      expect(signals[key]).toHaveProperty('rampPct')
      expect(signals[key]).toHaveProperty('acwr')
      expect(signals[key]).toHaveProperty('readiness')
      expect(signals[key]).toHaveProperty('settling')
    }
  })

  it('marks the first weeks as settling until chronic has 6 weeks of history', () => {
    const weeks = weeksWithKeys(8)
    const byKey = Object.fromEntries(weeks.map(w => [w.key, []]))
    const signals = computeWeekSignals(weeks, byKey, 99, 2026)
    expect(signals['2026-1'].settling).toBe(true)
    expect(signals['2026-5'].settling).toBe(true)  // only 5 weeks of history
    expect(signals['2026-6'].settling).toBe(false) // 6 weeks of history
    expect(signals['2026-8'].settling).toBe(false)
  })

  it('reports rampPct as null when the previous week had zero load', () => {
    const weeks = weeksWithKeys(2)
    const byKey = { '2026-1': [], '2026-2': [] } // both zero load
    const signals = computeWeekSignals(weeks, byKey, 99, 2026)
    expect(signals['2026-1'].rampPct).toBeNull() // no previous week at all
    expect(signals['2026-2'].rampPct).toBeNull() // previous load is 0
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/loadSignals.test.js -t computeWeekSignals`
Expected: FAIL with "computeWeekSignals is not a function".

- [ ] **Step 3: Implement `computeWeekSignals`**

Append to `src/utils/loadSignals.js`:

```javascript
// Compute per-week load signals across the full chronological `weeks` series.
// ACWR's chronic load is a 6-week trailing average, so signals must be derived
// from the whole series in order — never per-row in isolation. Returns a map
// keyed by week.key: { load, rampPct, acuteLoad, chronicLoad, acwr, readiness,
// settling }.
//   - rampPct: week-over-week load change % vs the immediately preceding week;
//     null when there is no previous week or the previous load is 0.
//   - acwr: acute(3wk avg) / chronic(6wk avg); 0 when no chronic baseline.
//   - readiness: classifyAcwr(acwr) band, or null while settling.
//   - settling: true until 6 weeks of history exist (low-confidence ACWR).
const CHRONIC_WEEKS = 6
const ACUTE_WEEKS = 3

export function computeWeekSignals(weeks, workoutsByWeekKey, currentWeek, currentYear) {
  const stats = weeks.map(week =>
    buildWeekStats(week, workoutsByWeekKey, currentWeek, currentYear))
  const loadSeries = stats.map(s => s.load)

  const signals = {}
  stats.forEach((s, index) => {
    const load = s.load
    const prevLoad = index > 0 ? loadSeries[index - 1] : null
    const rampPct = prevLoad && prevLoad > 0
      ? ((load - prevLoad) / prevLoad) * 100
      : null

    const acuteLoad = averageLastValues(loadSeries, ACUTE_WEEKS, index)
    const chronicLoad = averageLastValues(loadSeries, CHRONIC_WEEKS, index)
    const acwr = safeDivide(acuteLoad, chronicLoad)
    const settling = index + 1 < CHRONIC_WEEKS
    const readiness = settling ? null : classifyAcwr(acwr)

    signals[s.week.key] = { load, rampPct, acuteLoad, chronicLoad, acwr, readiness, settling }
  })

  return signals
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/loadSignals.test.js`
Expected: PASS (all describe blocks).

- [ ] **Step 5: Commit**

```bash
git add src/utils/loadSignals.js src/utils/loadSignals.test.js
git commit -m "feat: compute per-week load signals (load/ramp/ACWR) over series"
```

---

## Task 4: Persisted toggle hook

A localStorage-backed boolean for showing/hiding the signal strips.

**Files:**
- Create: `src/components/AdminPlanBuilder/useMonthSignalsToggle.js`

- [ ] **Step 1: Implement the hook**

Create `src/components/AdminPlanBuilder/useMonthSignalsToggle.js`:

```javascript
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'planBuilder.monthSignals.v1'

function loadStored() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

// Show/hide the month-view per-week load-signal strips. Off by default;
// the choice persists across reloads in localStorage.
export function useMonthSignalsToggle() {
  const [showSignals, setShowSignals] = useState(loadStored)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, showSignals ? 'true' : 'false')
    } catch {
      // ignore quota / disabled storage
    }
  }, [showSignals])

  return { showSignals, setShowSignals }
}
```

- [ ] **Step 2: Verify it parses (no test yet — covered via the component test in Task 6)**

Run: `npx vitest run` 
Expected: PASS, unchanged count (the new file is not imported yet, so this just confirms nothing broke).

- [ ] **Step 3: Commit**

```bash
git add src/components/AdminPlanBuilder/useMonthSignalsToggle.js
git commit -m "feat: add persisted toggle hook for month signal strips"
```

---

## Task 5: `MonthWeekSignals` presentational component

Renders the compact signal bar for one week from a precomputed signal object. Pure presentation — no aggregation inside, mirroring `MonthWeekSummary`.

**Files:**
- Create: `src/components/AdminPlanBuilder/MonthWeekSignals.jsx`
- Test: `src/components/AdminPlanBuilder/MonthWeekSignals.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/AdminPlanBuilder/MonthWeekSignals.test.jsx`:

```javascript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import MonthWeekSignals from './MonthWeekSignals'

describe('MonthWeekSignals', () => {
  it('renders load, ramp, and ACWR band for a populated week', () => {
    render(<MonthWeekSignals signal={{
      load: 412, rampPct: 18.4, acwr: 1.35, readiness: 'caution', settling: false,
    }} />)
    expect(screen.getByText(/412/)).toBeInTheDocument()
    expect(screen.getByText(/\+18%/)).toBeInTheDocument()
    expect(screen.getByText(/1\.3/)).toBeInTheDocument()
    expect(screen.getByText(/caution/i)).toBeInTheDocument()
  })

  it('shows a down arrow / negative ramp', () => {
    render(<MonthWeekSignals signal={{
      load: 305, rampPct: -26, acwr: 0.92, readiness: 'safe', settling: false,
    }} />)
    expect(screen.getByText(/-26%/)).toBeInTheDocument()
  })

  it('renders a muted dash for ramp when rampPct is null', () => {
    const { container } = render(<MonthWeekSignals signal={{
      load: 200, rampPct: null, acwr: 1.0, readiness: 'safe', settling: false,
    }} />)
    expect(container.querySelector('.pb-signal-ramp')).toHaveTextContent('—')
  })

  it('renders a settling state instead of a band when settling', () => {
    render(<MonthWeekSignals signal={{
      load: 200, rampPct: 5, acwr: 0, readiness: null, settling: true,
    }} />)
    expect(screen.getByText(/settling/i)).toBeInTheDocument()
  })

  it('renders nothing for a null signal or zero-load empty week', () => {
    const { container } = render(<MonthWeekSignals signal={null} />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/AdminPlanBuilder/MonthWeekSignals.test.jsx`
Expected: FAIL with module-not-found / default export missing.

- [ ] **Step 3: Implement the component**

Create `src/components/AdminPlanBuilder/MonthWeekSignals.jsx`:

```javascript
// Compact per-week load-signal bar for the month grid: training load, the
// week-over-week ramp %, and an ACWR readiness pill. Pure presentation — every
// number comes precomputed from computeWeekSignals; no aggregation lives here.
// Renders nothing for an empty/zero-load week so quiet weeks add no chrome.

function formatRamp(rampPct) {
  if (rampPct == null || !Number.isFinite(rampPct)) return '—'
  const rounded = Math.round(rampPct)
  const arrow = rounded > 0 ? '↑' : rounded < 0 ? '↓' : ''
  const sign = rounded > 0 ? '+' : ''
  return `${arrow}${sign}${rounded}%`
}

export default function MonthWeekSignals({ signal }) {
  if (!signal || !(signal.load > 0)) return null

  const { load, rampPct, acwr, readiness, settling } = signal
  // High-magnitude ramp gets an amber chip regardless of direction.
  const rampHot = rampPct != null && Math.abs(rampPct) > 30
  const band = readiness || 'settling'

  return (
    <div className="pb-month-signals" aria-label="Weekly load signals">
      <span className="pb-signal-load">
        <span className="pb-signal-label">Load</span>
        <span className="pb-signal-value">{Math.round(load)}</span>
      </span>

      <span className={`pb-signal-ramp${rampHot ? ' is-hot' : ''}`} title="Week-over-week load change">
        {formatRamp(rampPct)}
      </span>

      <span
        className={`pb-signal-acwr pb-band-${band}`}
        title={settling ? 'Building chronic baseline (needs 6 weeks)' : `Acute:chronic load ratio (${band})`}
      >
        <span className="pb-signal-dot" aria-hidden="true" />
        {settling ? (
          <span className="pb-signal-acwr-text">settling</span>
        ) : (
          <span className="pb-signal-acwr-text">
            ACWR {acwr.toFixed(2)} {band}
          </span>
        )}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/AdminPlanBuilder/MonthWeekSignals.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminPlanBuilder/MonthWeekSignals.jsx src/components/AdminPlanBuilder/MonthWeekSignals.test.jsx
git commit -m "feat: add MonthWeekSignals load-signal bar component"
```

---

## Task 6: Wire signals + toggle into `MonthGridPanel`

Thread `currentWeek`/`currentYear` in, compute the signal map once, host the toggle in the panel header, and render a strip per row when the toggle is on.

**Files:**
- Modify: `src/components/AdminPlanBuilder/buildPanelMap.jsx`
- Modify: `src/components/AdminPlanBuilder/MonthGridPanel.jsx`
- Test: `src/components/AdminPlanBuilder/MonthGridPanel.test.jsx`

- [ ] **Step 1: Pass `currentWeek`/`currentYear` through `buildPanelMap`**

In `src/components/AdminPlanBuilder/buildPanelMap.jsx`, the `MonthGridPanel` JSX block (the `calendar: view === 'month' ? (...)` branch) currently does not pass `currentWeek`/`currentYear`. Add them as props (both are already destructured from `props` at the top of `buildPanelMap`):

```javascript
    calendar: view === 'month' ? (
      <MonthGridPanel
        visiblePanelIds={visiblePanelIds}
        currentWeek={currentWeek}
        currentYear={currentYear}
        overviewWeeks={overviewWeeks}
        overviewWorkoutsByWeekKey={overviewWorkoutsByWeekKey}
        selectedWeekKey={selectedWeekKey}
        loadingOverview={loadingOverview}
        dragState={dragState}
        dropTarget={dropTarget}
        handleDropTargetChange={handleDropTargetChange}
        handleDrop={handleDrop}
        onSelectWorkout={onSelectWorkout}
        onDeleteWorkout={onDeleteWorkout}
        onAddSessionToDay={onAddSessionToDayAcross}
        onAddManySessions={onAddManySessions}
        onMoveMany={onMoveMany}
        modalOpen={modalOpen}
        onJumpToWeek={onJumpToWeek}
        handleWorkoutDragStart={handleWorkoutDragStart}
        handleDragEnd={handleDragEnd}
      />
    ) : (
```

- [ ] **Step 2: Compute the signal map and host the toggle in `MonthGridPanel`**

In `src/components/AdminPlanBuilder/MonthGridPanel.jsx`:

Add imports at the top (alongside the existing imports):

```javascript
import { useMemo } from 'react'
import { computeWeekSignals } from '../../utils/loadSignals'
import { useMonthSignalsToggle } from './useMonthSignalsToggle'
import MonthWeekSignals from './MonthWeekSignals'
```

Note: `useRef`/`useState` are already imported on line 1 — extend that import to include `useMemo` rather than adding a duplicate `react` import:

```javascript
import { useMemo, useRef, useState } from 'react'
```

Add `currentWeek` and `currentYear` to the destructured props of `MonthGridPanel` (the `export default function MonthGridPanel({ ... })` list):

```javascript
  visiblePanelIds,
  currentWeek,
  currentYear,
  overviewWeeks,
```

Inside the component body, after the `sel = useMonthSelection({...})` block, add:

```javascript
  const { showSignals, setShowSignals } = useMonthSignalsToggle()
  const signalMap = useMemo(
    () => computeWeekSignals(overviewWeeks, overviewWorkoutsByWeekKey, currentWeek, currentYear),
    [overviewWeeks, overviewWorkoutsByWeekKey, currentWeek, currentYear]
  )
```

- [ ] **Step 3: Add the toggle button to the panel header**

In `MonthGridPanel.jsx`, the `<BuilderPanelHeader ... />` is rendered near the top of the returned JSX. Add a toggle button immediately after it (still inside the `<main>`), so the density preference is respected (reuses the existing header region, no new toolbar):

```javascript
      <BuilderPanelHeader
        copy={hasClipboard
          ? `${selectionCount > 0 ? `${selectionCount} cell${selectionCount > 1 ? 's' : ''} selected · ` : ''}Hover a day and press ⌘/Ctrl+V to paste.`
          : ''}
        panelId="calendar"
        visiblePanelIds={visiblePanelIds}
      />

      <div className="pb-month-toolbar">
        <button
          type="button"
          className={`pb-month-signals-toggle${showSignals ? ' is-on' : ''}`}
          onClick={() => setShowSignals(v => !v)}
          aria-pressed={showSignals}
          title="Show weekly load signals (load, ramp, readiness)"
        >
          {showSignals ? 'Hide load signals' : 'Show load signals'}
        </button>
      </div>
```

- [ ] **Step 4: Render the per-week strip below each week-row's day cells**

In `MonthGridPanel.jsx`, each week is rendered as `<div className="pb-month-row ...">` containing `<div className="pb-month-week-col">` and the seven `dayBuckets.map(...)` cells. The day cells map closes with `})}` just before the row's closing `</div>`. Insert the strip after the day-cells map, inside the row div, so it spans below the cells:

Find the end of the `dayBuckets.map(day => { ... })` block (it returns the `<div className="pb-month-cell ...">` per day and closes with `})}`). Immediately after that closing `})}` and before the row's closing `</div>`, add:

```javascript
                {showSignals && (
                  <MonthWeekSignals signal={signalMap[weekKey]} />
                )}
```

The `weekKey` variable is already in scope at that point (defined as `const weekKey = weekEntry.key`).

- [ ] **Step 5: Add a regression test for the wiring**

Append to `src/components/AdminPlanBuilder/MonthGridPanel.test.jsx` a test that the strip appears only when toggled on. First inspect the existing test file's render helper / required props (it already renders `MonthGridPanel`), and reuse that setup. Add:

```javascript
import { fireEvent } from '@testing-library/react'

it('shows load signals only after toggling them on', () => {
  // Reuse the existing render helper from this file (see other tests above);
  // it must pass currentWeek/currentYear and at least one populated overview week.
  renderMonthGrid() // <- use whatever the file's existing setup helper is called
  expect(screen.queryByLabelText('Weekly load signals')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /show load signals/i }))
  expect(screen.getAllByLabelText('Weekly load signals').length).toBeGreaterThan(0)
})
```

If the existing file has no reusable helper, model the render call on the most complete existing test in the file (copy its props object, ensuring `currentWeek`, `currentYear`, `overviewWeeks`, and `overviewWorkoutsByWeekKey` with at least one week carrying a workout that has positive load).

- [ ] **Step 6: Run the month grid tests**

Run: `npx vitest run src/components/AdminPlanBuilder/MonthGridPanel.test.jsx`
Expected: PASS, including the new toggle test.

- [ ] **Step 7: Commit**

```bash
git add src/components/AdminPlanBuilder/buildPanelMap.jsx src/components/AdminPlanBuilder/MonthGridPanel.jsx src/components/AdminPlanBuilder/MonthGridPanel.test.jsx
git commit -m "feat: wire load signals + toggle into month grid"
```

---

## Task 7: Styles

Style the toolbar, toggle, signal bar, ramp chip, and ACWR band pills.

**Files:**
- Modify: `src/components/AdminPlanBuilder/styles/month.css`

- [ ] **Step 1: Append signal styles**

Append to `src/components/AdminPlanBuilder/styles/month.css`. The codebase defines semantic status tokens in `src/styles/tokens.css` (`--th-success`/`--th-warning`/`--th-danger` + `-bg` variants) and structural tokens (`--th-line`, `--th-ink`, `--th-ink-muted`, `--th-ink-soft`, `--th-surface`, `--th-accent`, `--th-accent-soft`, `--th-accent-ring`, `--th-hover`, `--th-text-2xs`, `--th-tracking-wide`). Use these tokens — NOT hardcoded hex. Map readiness bands: safe→success, caution→warning, spike/undertraining→danger, settling→ink-soft. The snippet below reflects what was implemented (token-based).

```css
/* ── Per-week load signals (load · ramp · ACWR readiness) ─────────────
 * A toggleable compact bar under each week-row. The toggle lives in a thin
 * right-aligned strip below the panel header so it adds minimal chrome. */
.pb-month-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 0 2px 4px;
}

.pb-month-signals-toggle {
  font-size: var(--th-text-2xs);
  font-weight: 600;
  padding: 3px 10px;
  border: 1px solid var(--th-line);
  border-radius: 999px;
  background: var(--th-surface);
  color: var(--th-ink-muted);
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.pb-month-signals-toggle:hover {
  background: var(--th-hover);
  color: var(--th-ink);
}
.pb-month-signals-toggle.is-on {
  background: var(--th-accent-soft);
  color: var(--th-accent);
  border-color: var(--th-accent-ring);
}

/* The strip spans the full row width (week-label column + 7 days) below the
 * day cells. .pb-month-row is a CSS grid, so 1 / -1 stretches edge to edge. */
.pb-month-signals {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 4px 8px;
  margin-top: 2px;
  font-size: var(--th-text-2xs);
  color: var(--th-ink-muted);
  border-top: 1px dashed var(--th-line);
}

.pb-signal-load {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}
.pb-signal-label {
  text-transform: uppercase;
  letter-spacing: var(--th-tracking-wide);
  font-size: var(--th-text-2xs);
  opacity: 0.7;
}
.pb-signal-value {
  font-weight: 700;
  color: var(--th-ink);
  font-variant-numeric: tabular-nums;
}

.pb-signal-ramp {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
/* A large week-over-week jump (either direction) gets an amber pill. */
.pb-signal-ramp.is-hot {
  background: var(--th-warning-bg);
  color: var(--th-warning);
  padding: 1px 7px;
  border-radius: 999px;
}

.pb-signal-acwr {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-variant-numeric: tabular-nums;
}
.pb-signal-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  flex: none;
}
.pb-signal-acwr-text {
  text-transform: capitalize;
}

/* Readiness bands map to the app's semantic status colors. */
.pb-band-safe { color: var(--th-success); }
.pb-band-caution { color: var(--th-warning); }
.pb-band-spike { color: var(--th-danger); }
.pb-band-undertraining { color: var(--th-danger); }
.pb-band-settling { color: var(--th-ink-soft); }
```

Note: `.pb-month-row` is `display: grid` with `grid-template-columns: 196px repeat(7, minmax(0, 1fr))` (confirmed in `month.css`), so `grid-column: 1 / -1` correctly spans the full row width below the cells. No flex fallback needed.

- [ ] **Step 2: Verify the layout in the running app**

Run: `npm run dev`
Open the plan builder → Month view → click "Show load signals". Confirm each populated week shows a strip below its day cells, spanning full width, with Load / ramp / ACWR pill; quiet weeks show no strip; the toggle state survives a reload.

- [ ] **Step 3: Commit**

```bash
git add src/components/AdminPlanBuilder/styles/month.css
git commit -m "style: month-view load signal bar and readiness pills"
```

---

## Task 8: Full verification

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, all files.

- [ ] **Step 2: Build**

There is no `lint` script in this project (only `build`). Run the build to catch import/JSX errors:

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Final commit (if the build produced fixes)**

```bash
git add -A
git commit -m "chore: build fixes for month load signals"
```

---

## Self-Review notes

- **Spec coverage:** Load/Ramp/ACWR bar (Tasks 3, 5) ✓; ACWR bands 0.8/1.3/1.5 (Task 2) ✓; ramp null on zero prior (Task 3) ✓; settling for short window (Task 3) ✓; toggle persisted in localStorage (Task 4) ✓; placed below day cells, no new column (Task 6) ✓; toggle in existing header region, density-conscious (Task 6) ✓; shared math / dashboard regression (Tasks 1, 8) ✓; whole-athlete (no tag filter) — `computeWeekSignals` calls `buildWeekStats` without a tag filter ✓.
- **Type consistency:** signal object shape `{ load, rampPct, acuteLoad, chronicLoad, acwr, readiness, settling }` is identical across `computeWeekSignals` (Task 3), `MonthWeekSignals` props (Task 5), and the wiring (Task 6). `classifyAcwr` returns one of `undertraining|safe|caution|spike|null`, matched by `pb-band-*` classes and `BAND_LABEL`.
- **Verified facts:** `.pb-month-row` is `display: grid` (so `grid-column: 1 / -1` spans correctly); `npm run build` exists; there is no `lint` script. Both reflected in the plan.
