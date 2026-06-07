# Coach Week Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the coach panel's interactive week-plan page (PlanTab) with a read-only weekly overview of the selected week's planned training: total hours, hours-by-activity doughnut, km-by-activity list, and intensity-zone distribution.

**Architecture:** Extract the per-week aggregation from the analysis dashboard's private `buildWeekStats` into a pure shared helper `computeWeekSummary(workouts)` (adding per-activity distance, which is currently missing). Add a presentational `WeekOverview` component that renders the four blocks from that summary, and rewrite `PlanTab` to render `WeekNav` + `WeekOverview` only.

**Tech Stack:** React 18, react-chartjs-2 + Chart.js (already registered), Vitest, existing utils (`estimateWorkoutDuration`, `getWorkoutDistance`, `estimateWorkoutLoad`, `normalizeIntensityZones`, `formatDurationLabel`, `formatKmValue`, `ACTIVITY_TAG_MAP`, `ZONE_COLORS`).

---

## File Structure

- **Create** `src/utils/weekSummary.js` — pure `computeWeekSummary(workouts)`; one responsibility: turn a week's workouts into totals + per-activity + per-zone breakdowns.
- **Create** `src/utils/weekSummary.test.js` — Vitest unit tests.
- **Create** `src/components/AdminDashboard/WeekOverview.jsx` — presentational; consumes `computeWeekSummary`, renders summary row + 2 doughnuts + km list.
- **Create** `src/components/AdminDashboard/WeekOverview.css` — minimal grid/list styling.
- **Modify** `src/components/AnalysisDashboard/aggregations.js` — refactor `buildWeekStats` to call `computeWeekSummary` for shared fields; keep analysis-only extras. Behavior unchanged.
- **Modify** `src/components/AdminDashboard/tabs/PlanTab.jsx` — rewrite to render `WeekNav` + `WeekOverview` only (view-only).

Reused (no change): `Page`, `WeekNav`, `EmptyState` from `../../ui`; `ChartCard`, `Stat` from `AnalysisDashboard/sections/primitives`; `doughnutOptions` from `AnalysisDashboard/charts/options`; `buildZoneDoughnutData` from `AnalysisDashboard/charts/data`; `Doughnut` from `react-chartjs-2`.

---

## Task 1: `computeWeekSummary` pure helper

**Files:**
- Create: `src/utils/weekSummary.js`
- Test: `src/utils/weekSummary.test.js`

- [ ] **Step 1: Write the failing test**

`src/utils/weekSummary.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { computeWeekSummary } from './weekSummary'

// distance is a string the estimators parse ("x km"); duration comes from notes text.
const run = {
  activityTag: 'run', type: 'rolig', intensityZone: [2],
  distance: '10 km', notes: '60 min',
}
const intervals = {
  activityTag: 'run', type: 'interval', intensityZone: [3, 4],
  distance: '8 km', notes: '40 min',
}
const strength = {
  activityTag: 'strength', type: 'styrke', intensityZone: [], notes: '45 min',
}

describe('computeWeekSummary', () => {
  it('returns zeroed structures for an empty week', () => {
    const s = computeWeekSummary([])
    expect(s.count).toBe(0)
    expect(s.totalDuration).toBe(0)
    expect(s.totalDistance).toBe(0)
    expect(s.activityDuration).toEqual({})
    expect(s.activityDistance).toEqual({})
    expect(s.zones).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
  })

  it('sums totals and groups by activity tag', () => {
    const s = computeWeekSummary([run, intervals, strength])
    expect(s.count).toBe(3)
    expect(s.totalDuration).toBe(145)           // 60 + 40 + 45
    expect(s.totalDistance).toBe(18)            // 10 + 8 (strength has none)
    expect(s.activityDuration.run).toBe(100)    // 60 + 40
    expect(s.activityDuration.strength).toBe(45)
    expect(s.activityDistance.run).toBe(18)
    expect(s.activityDistance.strength).toBeUndefined() // no distance recorded
  })

  it('splits a workout duration evenly across its normalized zones', () => {
    // run: zone [2], 60 min -> all 60 to zone 2
    // intervals: zones [3,4], 40 min -> 20 to zone 3, 20 to zone 4
    const s = computeWeekSummary([run, intervals])
    expect(s.zones[2]).toBe(60)
    expect(s.zones[3]).toBe(20)
    expect(s.zones[4]).toBe(20)
    expect(s.zones[1]).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/weekSummary.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/utils/weekSummary.js`**

```js
import { estimateWorkoutDuration, estimateWorkoutLoad, getWorkoutDistance } from './load'
import { normalizeIntensityZones } from './intensity'

// Pure: turn a week's workouts into totals + per-activity + per-zone breakdowns.
// Counts ALL provided workouts (no completion/past-week filtering — that stays
// in the analysis dashboard). Zone minutes split a workout's duration evenly
// across its normalized zones, matching buildWeekStats.
export function computeWeekSummary(workouts) {
  const activityDuration = {}
  const activityDistance = {}
  const activityLoad = {}
  const zones = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

  let totalDuration = 0
  let totalDistance = 0
  let totalLoad = 0

  for (const workout of workouts || []) {
    const duration = estimateWorkoutDuration(workout)
    const load = estimateWorkoutLoad(workout)
    const distance = getWorkoutDistance(workout) || 0
    const normalizedZones = normalizeIntensityZones(workout.type, workout.intensityZone)
    const tag = workout.activityTag || 'unknown'

    totalDuration += duration
    totalDistance += distance
    totalLoad += load

    activityDuration[tag] = (activityDuration[tag] || 0) + duration
    activityLoad[tag] = (activityLoad[tag] || 0) + load
    if (distance > 0) activityDistance[tag] = (activityDistance[tag] || 0) + distance

    if (normalizedZones.length > 0 && duration > 0) {
      const share = duration / normalizedZones.length
      normalizedZones.forEach(zone => { zones[zone] += share })
    }
  }

  return {
    count: (workouts || []).length,
    totalDuration,
    totalDistance,
    totalLoad,
    activityDuration,
    activityDistance,
    activityLoad,
    zones,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/weekSummary.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/weekSummary.js src/utils/weekSummary.test.js
git commit -m "feat(week-overview): computeWeekSummary pure helper"
```

---

## Task 2: Refactor `buildWeekStats` to reuse `computeWeekSummary`

This keeps one source of truth for the shared math and surfaces `activityDistance`
to the analysis dashboard (harmless). Analysis numbers must stay identical.

**Files:**
- Modify: `src/components/AnalysisDashboard/aggregations.js`

- [ ] **Step 1: Read the current `buildWeekStats`**

Run: `sed -n '1,80p' src/components/AnalysisDashboard/aggregations.js`
Confirm it imports the estimators and computes `activityLoad`, `activityDuration`,
`zones`, `zoneLoads`, `dailyLoads`, `dailyDurations`, `mechanicalLoad`,
`hardSessions`, `longestSession`, and returns them with `week`, `workouts`, `count`,
`distance`, `duration`, `load`.

- [ ] **Step 2: Add the import**

At the top of `aggregations.js`, add to the existing imports:

```js
import { computeWeekSummary } from '../../utils/weekSummary'
```

- [ ] **Step 3: Use the summary for shared fields inside `buildWeekStats`**

After the line that computes the filtered `weekWorkouts` (post past-week and
activeTagFilter filtering) and BEFORE the manual reduction, insert:

```js
  const summary = computeWeekSummary(weekWorkouts)
```

Then replace the per-field manual accumulation that `computeWeekSummary` now
covers. Specifically:
- Keep the `workouts = weekWorkouts.map(...)` block (analysis needs the enriched
  per-workout objects with `mechanicalLoad`, `normalizedZones`, etc.) AND keep
  `dailyLoads`/`dailyDurations`/`zoneLoads`/`tags` accumulation inside it (those
  are analysis-only and not in the summary).
- Replace the final `duration`, `load`, `distance` reductions and the
  `activityLoad`/`activityDuration`/`zones` objects in the RETURN with the summary's
  values. The return becomes:

```js
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
```

Remove the now-redundant local `const activityLoad = {}`, `const activityDuration = {}`,
`const zones = {...}` declarations and their in-loop accumulation for those three
ONLY (leave `zoneLoads`, `dailyLoads`, `dailyDurations`, `tags` accumulation in the
loop). Keep the `duration`/`load`/`distance` `reduce` lines removed in favor of the
summary totals. The `longestSession`, `mechanicalLoad`, and `hardSessions`
computations stay as-is.

> Note: be careful — `zones` (from summary) replaces the in-loop `zones`, but
> `zoneLoads` is analysis-only and must remain accumulated in the loop. Do not
> remove `zoneLoads`.

- [ ] **Step 4: Run the analysis-affecting tests + full suite**

Run: `npx vitest run`
Expected: PASS — all existing tests (no analysis test should change behavior).

- [ ] **Step 5: Build to confirm no broken imports**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/AnalysisDashboard/aggregations.js
git commit -m "refactor(analysis): buildWeekStats reuses computeWeekSummary, adds activityDistance"
```

---

## Task 3: `WeekOverview` presentational component

**Files:**
- Create: `src/components/AdminDashboard/WeekOverview.jsx`
- Create: `src/components/AdminDashboard/WeekOverview.css`

- [ ] **Step 1: Implement `src/components/AdminDashboard/WeekOverview.jsx`**

```jsx
import { Doughnut } from 'react-chartjs-2'
import { EmptyState } from '../ui'
import { ChartCard, Stat } from '../AnalysisDashboard/sections/primitives'
import { doughnutOptions } from '../AnalysisDashboard/charts/options'
import { buildZoneDoughnutData } from '../AnalysisDashboard/charts/data'
import { computeWeekSummary } from '../../utils/weekSummary'
import {
  ACTIVITY_TAG_MAP, ZONE_COLORS, formatDurationLabel, formatKmValue,
} from '../../utils'
import './WeekOverview.css'

// Hours-by-activity doughnut (duration, not load).
function buildHoursByActivityData(activityDuration) {
  const entries = Object.entries(activityDuration)
    .filter(([, mins]) => mins > 0)
    .sort((a, b) => b[1] - a[1])
  return {
    labels: entries.map(([tag]) => ACTIVITY_TAG_MAP[tag]?.label || tag),
    datasets: [{
      data: entries.map(([, mins]) => Math.round(mins)),
      backgroundColor: entries.map(([tag]) => ACTIVITY_TAG_MAP[tag]?.color || '#94a3b8'),
      borderWidth: 0,
      hoverOffset: 10,
    }],
  }
}

export default function WeekOverview({ workouts }) {
  const summary = computeWeekSummary(workouts)

  if (summary.count === 0) {
    return (
      <EmptyState
        title="No sessions planned this week"
        description="Plan sessions from the session bank to see the week summary here."
      />
    )
  }

  const hoursData = buildHoursByActivityData(summary.activityDuration)
  const zoneData = buildZoneDoughnutData(summary.zones)
  const hasZones = Object.values(summary.zones).some(v => v > 0)

  const distanceList = Object.entries(summary.activityDistance)
    .sort((a, b) => b[1] - a[1])

  return (
    <div className="week-overview">
      <div className="wo-summary">
        <Stat label="Total time" value={formatDurationLabel(Math.round(summary.totalDuration))} />
        <Stat label="Total distance" value={formatKmValue(summary.totalDistance)} />
        <Stat label="Sessions" value={summary.count} />
        <Stat label="Total load" value={Math.round(summary.totalLoad)} />
      </div>

      <div className="wo-grid">
        <ChartCard title="Hours by activity">
          <Doughnut data={hoursData} options={doughnutOptions} />
        </ChartCard>

        <ChartCard title="Intensity zones" caption="Minutes in each zone">
          {hasZones
            ? <Doughnut data={zoneData} options={doughnutOptions} />
            : <p className="wo-empty-note">No zone data for this week.</p>}
        </ChartCard>

        <ChartCard title="Distance by activity">
          {distanceList.length === 0 ? (
            <p className="wo-empty-note">No distance recorded this week.</p>
          ) : (
            <ul className="wo-km-list">
              {distanceList.map(([tag, km]) => (
                <li key={tag}>
                  <span className="wo-km-dot" style={{ background: ACTIVITY_TAG_MAP[tag]?.color || '#94a3b8' }} />
                  <span className="wo-km-label">{ACTIVITY_TAG_MAP[tag]?.label || tag}</span>
                  <span className="wo-km-value">{formatKmValue(km)}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard title="Zone minutes">
          <ul className="wo-zone-list">
            {[1, 2, 3, 4, 5].map(z => (
              <li key={z}>
                <span className="wo-km-dot" style={{ background: ZONE_COLORS[z]?.border || '#94a3b8' }} />
                <span className="wo-km-label">Zone {z}</span>
                <span className="wo-km-value">{formatDurationLabel(Math.round(summary.zones[z]))}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>
    </div>
  )
}
```

> Note: confirm `Stat`, `ChartCard` prop names match `sections/primitives.jsx`
> (`Stat({label,value})`, `ChartCard({title,caption,children})` — verified) and
> `doughnutOptions` is a named export of `charts/options.js` (verified).

- [ ] **Step 2: Implement `src/components/AdminDashboard/WeekOverview.css`**

```css
.week-overview { display: flex; flex-direction: column; gap: 1rem; }

.wo-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.wo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.wo-km-list, .wo-zone-list {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 0.5rem;
}
.wo-km-list li, .wo-zone-list li {
  display: flex; align-items: center; gap: 0.5rem;
}
.wo-km-dot { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }
.wo-km-label { flex: 1 1 auto; }
.wo-km-value { font-variant-numeric: tabular-nums; font-weight: 600; }
.wo-empty-note { color: #64748b; font-size: 0.875rem; margin: 0; }
```

- [ ] **Step 3: Build to confirm imports resolve**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/AdminDashboard/WeekOverview.jsx src/components/AdminDashboard/WeekOverview.css
git commit -m "feat(week-overview): WeekOverview component"
```

---

## Task 4: Rewrite `PlanTab` to render the overview only

**Files:**
- Modify: `src/components/AdminDashboard/tabs/PlanTab.jsx`

- [ ] **Step 1: Replace the entire file contents**

```jsx
import { getWeekNumber } from '../../../utils'
import { Page, WeekNav, EmptyState } from '../../ui'
import WeekOverview from '../WeekOverview'

export default function PlanTab(props) {
  const {
    currentWeek, currentYear, monday, sunday, isThisWeek,
    onWeekChange, prevWeek, nextWeek,
    workouts, loadingWorkouts,
  } = props

  return (
    <Page>
      <WeekNav
        week={currentWeek}
        year={currentYear}
        monday={monday}
        sunday={sunday}
        isThisWeek={isThisWeek}
        onPrev={prevWeek}
        onNext={nextWeek}
        onToday={() => onWeekChange(getWeekNumber(new Date()), new Date().getFullYear())}
      />

      {loadingWorkouts
        ? <EmptyState title="Loading…" />
        : <WeekOverview workouts={workouts} />}
    </Page>
  )
}
```

> Note: the parent (`AdminDashboard/index.jsx`) still spreads the old planner props
> into `PlanTab` via `tabProps`; that's harmless — `PlanTab` simply no longer
> destructures them. Do NOT remove the props from the parent (other tabs and the
> CustomForm flow still use `setShowCustomForm`, `setPickingFromBank`, etc.).

- [ ] **Step 2: Verify the now-unused imports/components are gone**

Confirm `PlanTab.jsx` no longer imports `AdminWorkoutSlot`, `WeekCalendarList`,
`StravaConnectButton`, `CompletedActivities`, `Toolbar`, `SportPicker`,
`LayoutToggle`, `Button`, `EMPTY_TEMPLATE`, or the drag helpers. (Those files still
exist and are used elsewhere; only PlanTab stops importing them.)

Run: `grep -nE "AdminWorkoutSlot|WeekCalendarList|StravaConnectButton|SportPicker|Toolbar" src/components/AdminDashboard/tabs/PlanTab.jsx`
Expected: no matches.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds (no unused-import or missing-symbol errors).

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: PASS — all tests (weekSummary + existing).

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminDashboard/tabs/PlanTab.jsx
git commit -m "feat(week-overview): PlanTab is now the read-only week overview"
```

---

## Task 5: Manual verification

- [ ] **Step 1: Run the app**

Run: `npm run dev`

- [ ] **Step 2: Verify in the coach panel**

1. Open the coach panel, select an athlete with sessions in a week.
2. The plan tab now shows: WeekNav at top, a summary row (total time, distance,
   sessions, load), an Hours-by-activity doughnut, an Intensity-zones doughnut, a
   Distance-by-activity km list, and a Zone-minutes list.
3. Page to a week with no sessions → "No sessions planned this week" empty state.
4. Page to a week with strength-only (no distance) sessions → km list shows its
   empty note, hours + zones still render.
5. Use prev/next/today on WeekNav → the overview updates for each week.
6. Confirm there is no "New session" / drag / Strava UI on this page anymore.

---

## Self-review checklist (done by author)

- Spec coverage: total hours (summary Stat), pie of hours-by-activity (Hours
  doughnut), km-by-activity list (Distance card), zone distribution
  (Intensity-zones doughnut + Zone-minutes list), week display (WeekNav),
  view-only + full PlanTab replacement (Task 4). All covered.
- No placeholders; all code complete.
- Type consistency: `computeWeekSummary` return shape (`totalDuration`,
  `totalDistance`, `totalLoad`, `activityDuration`, `activityDistance`,
  `activityLoad`, `zones`, `count`) is identical across Tasks 1, 2, 3.
