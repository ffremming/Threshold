# Month-view Quality-over-time Trends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Quality` metric to the plan builder month-view trend chart that plots the six training qualities (0–100) over the overview weeks, and make the whole trend chart planned-only.

**Architecture:** Three layered changes. (1) `computeWeekSeries` is reworked to score each week from its **raw** workouts (planned-only) via `computeWeekSummary` + `scoreWeek`, attaching a `dims` field. (2) `trendChart.js` gains a `quality` metric: six datasets (one per quality) and a fixed 0–100 y-axis. (3) `MonthTrendPanel` needs no structural change — the new metric flows through its existing `TREND_METRICS` map.

**Tech Stack:** React, Vitest + @testing-library/react, chart.js / react-chartjs-2. Existing dimensions engine in `src/utils/dimensions` (`scoreWeek`, `QUALITY_ORDER`, `QUALITY_COLORS`, `QUALITY_LABELS`).

**Reference:** Spec at `docs/superpowers/specs/2026-06-13-month-view-quality-trends-design.md`.

**Test command (single file):** `npx vitest run <path> -t '<name>'` or `npx vitest run <path>`.

---

### Task 1: `computeWeekSeries` — planned-only + per-week `dims`

Rework `computeWeekSeries` to build each entry directly from the week's raw
workouts. `computeWeekSummary` already counts ALL provided workouts with no
past/completion filtering and returns `totalDistance/totalDuration/totalLoad` +
`activityDistance`; `scoreWeek(...).dims` gives the 0–100 per-quality map. The
module already has a top-level `resolveMuscles` and imports `scoreSession`; add
the `scoreWeek` + `computeWeekSummary` imports.

`computeWeekSignals` and `buildWeekStats` are NOT touched (load-signals strip
stays completed-only).

**Files:**
- Modify: `src/utils/loadSignals.js` (imports near top; `computeWeekSeries` at lines 157–171)
- Test: `src/utils/loadSignals.test.js` (create if absent; otherwise add a describe block)

- [ ] **Step 1: Write the failing test**

Check whether `src/utils/loadSignals.test.js` exists. If it does, append the
`describe('computeWeekSeries', ...)` block below; if not, create the file with
this full content.

```js
import { describe, it, expect } from 'vitest'
import { computeWeekSeries } from './loadSignals'

// A past week (W23) with one COMPLETED and one PLANNED-but-skipped session,
// and a future week (W25) with one planned session. "Today" is W24/2026.
// Minimal structured-block sessions so computeWeekSummary/scoreWeek produce
// non-zero numbers.
function steadyRun({ id, weekday, completed, minutes, zone }) {
  return {
    id, weekday, completed,
    activityTag: 'run',
    type: 'steady',
    intensityZone: [zone],
    blocks: [{ kind: 'steady', durationMinutes: minutes }],
  }
}

const WEEKS = [
  { key: '2026-23', week: 23, year: 2026, monday: new Date(2026, 5, 1), sunday: new Date(2026, 5, 7) },
  { key: '2026-24', week: 24, year: 2026, monday: new Date(2026, 5, 8), sunday: new Date(2026, 5, 14) },
  { key: '2026-25', week: 25, year: 2026, monday: new Date(2026, 5, 15), sunday: new Date(2026, 5, 21) },
]

const BY_KEY = {
  '2026-23': [
    steadyRun({ id: 'a', weekday: 1, completed: true, minutes: 60, zone: 2 }),
    steadyRun({ id: 'b', weekday: 3, completed: false, minutes: 60, zone: 2 }),
  ],
  '2026-25': [
    steadyRun({ id: 'c', weekday: 2, completed: false, minutes: 90, zone: 2 }),
  ],
}

describe('computeWeekSeries', () => {
  it('attaches a dims map per week with all six qualities', () => {
    const series = computeWeekSeries(WEEKS, BY_KEY, 24, 2026, 24, 2026)
    expect(series).toHaveLength(3)
    const keys = Object.keys(series[0].dims).sort()
    expect(keys).toEqual(
      ['endurance', 'muscular_endurance', 'speed', 'strength', 'threshold', 'vo2max']
    )
  })

  it('counts planned (non-completed) sessions for a PAST week (planned-only)', () => {
    // W23 is in the past (today is W24). Both its sessions — completed AND the
    // skipped planned one — must be counted, so duration is the sum of both.
    const series = computeWeekSeries(WEEKS, BY_KEY, 24, 2026, 24, 2026)
    const w23 = series.find(s => s.key === '2026-23')
    // 60 + 60 minutes of planned work, regardless of completion.
    expect(w23.duration).toBe(120)
    expect(w23.load).toBeGreaterThan(0)
    // Endurance dim should be non-zero for Z2 aerobic work.
    expect(w23.dims.endurance).toBeGreaterThan(0)
  })

  it('still emits label/week/year/distance/activityDistance fields', () => {
    const series = computeWeekSeries(WEEKS, BY_KEY, 24, 2026, 24, 2026)
    const w23 = series.find(s => s.key === '2026-23')
    expect(w23.label).toBe('W23')
    expect(w23.week).toBe(23)
    expect(w23.year).toBe(2026)
    expect(typeof w23.distance).toBe('number')
    expect(w23.activityDistance).toBeTypeOf('object')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/loadSignals.test.js -t 'computeWeekSeries'`
Expected: FAIL — the planned-only test fails because the current
`computeWeekSeries` routes past weeks through `buildWeekStats` (drops the skipped
session → duration 60 not 120), and `dims` is undefined.

- [ ] **Step 3: Add imports**

In `src/utils/loadSignals.js`, the existing imports include `scoreSession` from
`./index` and `computeWeekSummary` from `./weekSummary`. Add `scoreWeek` to the
`./index` (dimensions) import and confirm `computeWeekSummary` is imported.

Current line 9: `import { computeWeekSummary } from './weekSummary'` — already present.
Add `scoreWeek` to the dimensions import. The file imports from `./index` at the
top (the block importing `scoreSession`, `estimateMechanicalLoad`, etc.); add
`scoreWeek` there:

```js
import {
  estimateMechanicalLoad,
  estimateWorkoutDuration,
  getWorkoutDistance,
  isHardWorkout,
  normalizeIntensityZones,
  scoreSession,
  scoreWeek,
} from './index'
```

- [ ] **Step 4: Rewrite `computeWeekSeries`**

Replace the entire existing `computeWeekSeries` function (currently lines
157–171) with this. It scores from the raw week workouts — planned-only — via
`computeWeekSummary` + `scoreWeek`, reusing the module-level `resolveMuscles`.
The `todayWeek/todayYear` params are kept in the signature for call-site
compatibility but are no longer used (planned-only has no past boundary).

```js
// Per-week series for the planner trend chart. Scored PLANNED-ONLY from each
// week's raw workouts (every prescribed session, no completed-only filter for
// past weeks) so the whole chart reflects the plan. This intentionally differs
// from computeWeekSignals/buildWeekStats, which stay completed-only for past
// weeks — the load-signals strip shows "what happened", the trend chart shows
// "the plan". todayWeek/todayYear are accepted for call-site compatibility but
// unused (planned-only has no past/future split).
export function computeWeekSeries(weeks, workoutsByWeekKey, currentWeek, currentYear, todayWeek = currentWeek, todayYear = currentYear) {
  return weeks.map(week => {
    const workouts = workoutsByWeekKey[week.key] || []
    const summary = computeWeekSummary(workouts, { resolveMuscles })
    const scored = scoreWeek(workouts, { resolveMuscles })
    return {
      key: week.key,
      week: week.week,
      year: week.year,
      label: `W${week.week}`,
      distance: summary.totalDistance,
      duration: summary.totalDuration,
      load: scored.load,
      activityDistance: summary.activityDistance,
      dims: scored.dims,
    }
  })
}
```

Note: `scored.load` and `summary.totalLoad` are the same Edwards-TRIMP value
(both go through `scoreSession` with the same resolver); using `scored.load`
keeps load and dims from one `scoreWeek` call.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/utils/loadSignals.test.js -t 'computeWeekSeries'`
Expected: PASS (all three cases).

- [ ] **Step 6: Run the full loadSignals + dependent suites**

Run: `npx vitest run src/utils/loadSignals.test.js src/components/AdminPlanBuilder/MonthTrendPanel.test.jsx src/components/AdminPlanBuilder/MonthWeekSignals.test.jsx`
Expected: PASS — confirms the `computeWeekSeries` rework didn't break the trend
panel or the (untouched) signals strip.

- [ ] **Step 7: Commit**

```bash
git add src/utils/loadSignals.js src/utils/loadSignals.test.js
git commit -m "feat(month-trends): score trend series planned-only + per-week dims

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `quality` metric in `trendChart.js`

Add `Quality` to `TREND_METRICS`, a `buildQualityChartData` that emits six lines
from each point's `dims` (in `QUALITY_ORDER`, colored/labelled by the dimensions
constants), a branch in `buildTrendChartData`, and a fixed 0–100 y-axis branch
in `trendChartOptions`.

**Files:**
- Modify: `src/components/AdminPlanBuilder/trendChart.js`
- Test: `src/components/AdminPlanBuilder/trendChart.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `src/components/AdminPlanBuilder/trendChart.test.js`. Also update the
existing `TREND_METRICS` test (lines 19–23) to expect the new `quality` entry.

First, change the existing list assertion:

```js
describe('TREND_METRICS', () => {
  it('lists distance, duration, load, and quality', () => {
    expect(TREND_METRICS.map(m => m.value)).toEqual(['distance', 'duration', 'load', 'quality'])
  })
})
```

Then append these new blocks at the end of the file (note the added import of
the dimensions constants):

```js
import { QUALITY_ORDER, QUALITY_COLORS, QUALITY_LABELS } from '../../utils/dimensions'

const QUALITY_SERIES = [
  { key: '2026-23', label: 'W23', dims: { threshold: 10, vo2max: 20, speed: 0, strength: 5, muscular_endurance: 8, endurance: 40 } },
  { key: '2026-24', label: 'W24', dims: { threshold: 30, vo2max: 25, speed: 12, strength: 15, muscular_endurance: 18, endurance: 60 } },
]

describe('buildTrendChartData — quality', () => {
  it('emits one dataset per quality in QUALITY_ORDER', () => {
    const data = buildTrendChartData(QUALITY_SERIES, 'quality')
    expect(data.datasets.map(d => d.label)).toEqual(QUALITY_ORDER.map(q => QUALITY_LABELS[q]))
  })

  it('plots each quality value per week from the point dims', () => {
    const data = buildTrendChartData(QUALITY_SERIES, 'quality')
    const threshold = data.datasets.find(d => d.label === QUALITY_LABELS.threshold)
    expect(threshold.data).toEqual([10, 30])
    expect(threshold.borderColor).toBe(QUALITY_COLORS.threshold)
  })

  it('does not add a moving-average line for quality', () => {
    const data = buildTrendChartData(QUALITY_SERIES, 'quality')
    expect(data.datasets.some(d => /average/i.test(d.label))).toBe(false)
  })
})

describe('trendChartOptions — quality axis', () => {
  it('uses a fixed 0–100 y-axis for the quality metric', () => {
    const meta = TREND_METRICS.find(m => m.value === 'quality')
    const opts = trendChartOptions(meta)
    expect(opts.scales.y.max).toBe(100)
    expect(opts.scales.y.beginAtZero).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/AdminPlanBuilder/trendChart.test.js`
Expected: FAIL — `quality` not in `TREND_METRICS`; `buildTrendChartData(..., 'quality')`
returns the single-line load-style shape; `trendChartOptions` has no `max`.

- [ ] **Step 3: Add the `quality` metric and dimensions import**

In `src/components/AdminPlanBuilder/trendChart.js`, add the dimensions import at
the top:

```js
import { QUALITY_ORDER, QUALITY_COLORS, QUALITY_LABELS } from '../../utils/dimensions'
```

Add the `quality` entry to `TREND_METRICS` (no `unit`; color unused for the
multi-line view but kept for shape consistency):

```js
export const TREND_METRICS = [
  { value: 'distance', label: 'Distance', unit: 'km', color: '#2563eb' },
  { value: 'duration', label: 'Duration', unit: 'min', color: '#10b981' },
  { value: 'load', label: 'Load', unit: '', color: '#f97316' },
  { value: 'quality', label: 'Quality', unit: '', color: '#64748b' },
]
```

- [ ] **Step 4: Add `buildQualityChartData` and branch `buildTrendChartData`**

Add this function next to `buildDistanceSportData`:

```js
// Quality fans out into one line per training quality (0–100), in the stable
// QUALITY_ORDER, colored/labelled by the dimensions engine. Each point reads
// its precomputed per-week dims map (no aggregation here). Styling mirrors the
// analysis-view QualityTrendChart.
function buildQualityChartData(series) {
  return {
    labels: series.map(point => point.label),
    datasets: QUALITY_ORDER.map(q => ({
      label: QUALITY_LABELS[q],
      data: series.map(point => Math.round((point.dims && point.dims[q]) || 0)),
      borderColor: QUALITY_COLORS[q],
      backgroundColor: QUALITY_COLORS[q],
      pointBackgroundColor: QUALITY_COLORS[q],
      tension: 0.34,
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 4,
      spanGaps: true,
    })),
  }
}
```

Add the branch at the top of `buildTrendChartData` (right after the existing
distance branch):

```js
export function buildTrendChartData(series, metric) {
  if (metric === 'distance') return buildDistanceSportData(series)
  if (metric === 'quality') return buildQualityChartData(series)

  const raw = series.map(point => point[metric] || 0)
  // ... unchanged
```

- [ ] **Step 5: Branch the y-axis in `trendChartOptions`**

In `trendChartOptions`, return a fixed 0–100 axis for quality. Replace the
`scales` block so the y-axis adapts:

```js
export function trendChartOptions(metricMeta) {
  const unit = metricMeta?.unit || ''
  const isQuality = metricMeta?.value === 'quality'
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          boxWidth: 10,
          font: { size: 11, weight: '600' },
        },
      },
      tooltip: {
        intersect: false,
        mode: 'index',
        callbacks: {
          label: context => isQuality
            ? `${context.dataset.label}: ${Math.round(context.parsed.y)}`
            : `${context.dataset.label}: ${formatTick(context.parsed.y, unit)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11, weight: '700' } },
      },
      y: isQuality
        ? {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(148, 163, 184, 0.18)' },
            ticks: { color: '#64748b', font: { size: 11 }, stepSize: 25 },
          }
        : {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.18)' },
            ticks: {
              color: '#64748b',
              font: { size: 11 },
              callback: value => formatTick(value, unit),
            },
          },
    },
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/AdminPlanBuilder/trendChart.test.js`
Expected: PASS (all existing + new cases).

- [ ] **Step 7: Commit**

```bash
git add src/components/AdminPlanBuilder/trendChart.js src/components/AdminPlanBuilder/trendChart.test.js
git commit -m "feat(month-trends): add Quality metric (six 0-100 lines)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `MonthTrendPanel` renders the Quality switcher option

`MonthTrendPanel` maps `TREND_METRICS` into switcher buttons and passes the
selected metric through `buildTrendChartData`/`trendChartOptions`, so the new
`quality` option already flows through with no structural change. This task adds
the integration test that proves it, since the multi-line shape exercises a code
path the existing `data-primary` stub assertions don't fully cover.

**Files:**
- Modify (test only): `src/components/AdminPlanBuilder/MonthTrendPanel.test.jsx`
- Verify (no change expected): `src/components/AdminPlanBuilder/MonthTrendPanel.jsx`

- [ ] **Step 1: Write the failing test**

The existing mock stubs `<Line>` exposing only `datasets[0].data` as
`data-primary`. Extend the mock to also expose the dataset count and labels so
the quality multi-line view is observable, then add the quality test. Replace
the `vi.mock` block and `SERIES` const, and add the new test.

Replace the mock (lines 7–9) with:

```js
vi.mock('react-chartjs-2', () => ({
  Line: ({ data }) => (
    <div
      data-testid="trend-line"
      data-primary={JSON.stringify(data.datasets[0].data)}
      data-count={data.datasets.length}
      data-labels={JSON.stringify(data.datasets.map(d => d.label))}
    />
  ),
}))
```

Replace the `SERIES` const (lines 13–16) so each point carries `dims`:

```js
const SERIES = [
  { key: '2026-23', label: 'W23', distance: 10, duration: 60, load: 100, activityDistance: { run: 10 },
    dims: { threshold: 10, vo2max: 20, speed: 0, strength: 5, muscular_endurance: 8, endurance: 40 } },
  { key: '2026-24', label: 'W24', distance: 20, duration: 90, load: 200, activityDistance: { run: 20 },
    dims: { threshold: 30, vo2max: 25, speed: 12, strength: 15, muscular_endurance: 18, endurance: 60 } },
]
```

Add this test inside the `describe('MonthTrendPanel', ...)` block:

```js
  it('renders a Quality option that switches to the six-quality multi-line view', () => {
    render(<MonthTrendPanel series={SERIES} />)
    const qualityBtn = screen.getByRole('button', { name: /quality/i })
    expect(qualityBtn).toBeInTheDocument()
    fireEvent.click(qualityBtn)
    expect(qualityBtn).toHaveClass('is-active')
    const line = screen.getByTestId('trend-line')
    expect(line).toHaveAttribute('data-count', '6')
    // First quality line in QUALITY_ORDER is threshold → [10, 30].
    expect(line).toHaveAttribute('data-primary', '[10,30]')
  })
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/components/AdminPlanBuilder/MonthTrendPanel.test.jsx`
Expected: PASS immediately if Task 2 is complete — the panel needs no change.
If the Quality button is missing or `data-count` is wrong, Task 2 is incomplete;
fix there, not by special-casing the panel.

- [ ] **Step 3: Verify the panel is unchanged**

Run: `git diff --stat src/components/AdminPlanBuilder/MonthTrendPanel.jsx`
Expected: no output (the `.jsx` is untouched; only its test changed).

- [ ] **Step 4: Commit**

```bash
git add src/components/AdminPlanBuilder/MonthTrendPanel.test.jsx
git commit -m "test(month-trends): cover Quality multi-line switcher

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Full suite + manual smoke check

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npx vitest run`
Expected: PASS, no regressions. Pay attention to any suite that imports
`computeWeekSeries` or `trendChart`.

- [ ] **Step 2: Lint the touched files**

Run: `npx eslint src/utils/loadSignals.js src/components/AdminPlanBuilder/trendChart.js`
Expected: no errors. (If the project has no eslint script, skip.)

- [ ] **Step 3: Manual smoke (dev server)**

Start the app, open the plan builder month view, click **Show trends**, then
click the **Quality** switcher button. Confirm:
- Six colored lines appear (threshold, VO2max, speed, strength, musc. endurance, endurance).
- Y-axis runs 0–100.
- Switching back to **Load** restores the single line + 3-week average.
- A past week with a skipped session now contributes to the lines (planned-only).

- [ ] **Step 4: Final commit (only if any smoke-fix was needed)**

```bash
git add -A
git commit -m "fix(month-trends): smoke-check adjustments

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage:** Quality as 4th switcher button (Task 2/3); six stimulus
  lines from `dims` (Task 2); fixed 0–100 axis (Task 2); planned-only whole
  chart (Task 1); load-signals strip untouched (Task 1 leaves `computeWeekSignals`
  alone — verified by running `MonthWeekSignals.test.jsx` in Task 1 Step 6).
- **No buildup view, no new persisted toggle:** honored — Quality is a local
  metric within the existing persisted trend panel.
- **Type consistency:** `dims` keys match `QUALITIES`/`QUALITY_ORDER`
  (`muscular_endurance` underscored everywhere); `scoreWeek(...).dims` and
  `.load` are the documented return shape; `QUALITY_LABELS`/`QUALITY_COLORS`
  keyed by quality id.
