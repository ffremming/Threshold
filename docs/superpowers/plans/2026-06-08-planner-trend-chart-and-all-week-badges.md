# Planner Trend Chart + All-Week Load Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the per-week load badge on every week in the Month view (including rest weeks), and add a collapsible trend chart with a Distance/Duration/Load metric switcher to the planner.

**Architecture:** Part 1 relaxes one guard in `MonthWeekSignals` so zero-load weeks render. Part 2 adds `computeWeekSeries` (shares the existing `buildWeekStats`), a planner-local `trendChart.js` (data + options + metric list), a `MonthTrendPanel` component rendering a chart.js `<Line>`, and a second independent persisted toggle — all wired into `MonthGridPanel` above the grid.

**Tech Stack:** React, Vitest + @testing-library/react, chart.js + react-chartjs-2 (already in the app), existing utils (`buildWeekStats`, `averageLastValues`, `formatKmValue`, `formatDurationLabel`).

---

## File Structure

- **Edit** `src/components/AdminPlanBuilder/MonthWeekSignals.jsx` — relax the empty-week guard; add `is-empty` style hook.
- **Edit** `src/components/AdminPlanBuilder/MonthWeekSignals.test.jsx` — empty-week now renders.
- **Edit** `src/utils/loadSignals.js` — add `computeWeekSeries`.
- **Edit** `src/utils/loadSignals.test.js` — `computeWeekSeries` tests.
- **New** `src/components/AdminPlanBuilder/trendChart.js` — `TREND_METRICS`, `buildTrendChartData`, `trendChartOptions`.
- **New** `src/components/AdminPlanBuilder/trendChart.test.js`
- **New** `src/components/AdminPlanBuilder/useMonthTrendsToggle.js` — second persisted toggle.
- **New** `src/components/AdminPlanBuilder/MonthTrendPanel.jsx` + `.test.jsx`
- **Edit** `src/components/AdminPlanBuilder/MonthGridPanel.jsx` — trends toggle + render panel above grid.
- **Edit** `src/components/AdminPlanBuilder/styles/month.css` — trend panel, metric switcher, `is-empty` badge.

---

## Task 1: Badge on every week

Relax the guard so zero-load weeks render the bar (Load 0 + ramp + band), with a muted style hook. The ramp/band logic in `computeWeekSignals` already works at load 0.

**Files:**
- Modify: `src/components/AdminPlanBuilder/MonthWeekSignals.jsx`
- Test: `src/components/AdminPlanBuilder/MonthWeekSignals.test.jsx`

- [ ] **Step 1: Update the tests for the new empty-week behavior**

In `src/components/AdminPlanBuilder/MonthWeekSignals.test.jsx`, the test titled `'renders nothing for a null signal or zero-load empty week'` currently asserts a zero-load week renders nothing. That contract is changing. REPLACE that test with these two:

```javascript
  it('renders nothing only when the signal is missing', () => {
    const { container } = render(<MonthWeekSignals signal={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a muted Load 0 bar for a zero-load week (with ramp + band)', () => {
    const { container } = render(<MonthWeekSignals signal={{
      load: 0, rampPct: -100, acwr: 0.4, readiness: 'undertraining', settling: false,
    }} />)
    expect(container.querySelector('.pb-month-signals')).toHaveClass('is-empty')
    expect(container.querySelector('.pb-signal-value')).toHaveTextContent('0')
    expect(screen.getByText(/-100%/)).toBeInTheDocument()
    expect(screen.getByText(/undertraining/i)).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the tests to verify the new empty-week test fails**

Run: `npx vitest run src/components/AdminPlanBuilder/MonthWeekSignals.test.jsx`
Expected: FAIL — the zero-load render returns null today, so `.pb-month-signals` is not found.

- [ ] **Step 3: Relax the guard and add the muted class**

In `src/components/AdminPlanBuilder/MonthWeekSignals.jsx`:

Change the guard (currently `if (!signal || !(signal.load > 0)) return null`) to:

```javascript
  if (!signal) return null
```

Then change the root element's className to add `is-empty` when load is zero. Replace:

```javascript
    <div className="pb-month-signals" aria-label="Weekly load signals">
```

with:

```javascript
    <div className={`pb-month-signals${load > 0 ? '' : ' is-empty'}`} aria-label="Weekly load signals">
```

(The `load` variable is already destructured from `signal` just below the guard — make sure the destructuring line `const { load, rampPct, acwr, readiness } = signal` stays ABOVE this `return`, which it already is.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/AdminPlanBuilder/MonthWeekSignals.test.jsx`
Expected: PASS (all cases, including the two new ones).

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS (no regressions elsewhere).

- [ ] **Step 6: Commit**

```bash
git add src/components/AdminPlanBuilder/MonthWeekSignals.jsx src/components/AdminPlanBuilder/MonthWeekSignals.test.jsx
git commit -m "feat: show load badge on every week, including rest weeks"
```

---

## Task 2: `computeWeekSeries`

A per-week series for the chart: ordered `{ key, week, year, label, distance, duration, load }`, built from the same `buildWeekStats` the badges use.

**Files:**
- Modify: `src/utils/loadSignals.js`
- Test: `src/utils/loadSignals.test.js`

- [ ] **Step 1: Write the failing test**

Append to `src/utils/loadSignals.test.js`:

```javascript
import { computeWeekSeries } from './loadSignals'

describe('computeWeekSeries', () => {
  // One run per week with controllable duration (notes) and distance.
  const run = (mins, km) => [{
    activityTag: 'run', type: 'rolig', intensityZone: [2], completed: true,
    notes: `${mins} min`, distance: `${km} km`,
  }]

  it('returns one ordered entry per week with key/label/distance/duration/load', () => {
    const weeks = [
      { week: 23, year: 2026, key: '2026-23' },
      { week: 24, year: 2026, key: '2026-24' },
    ]
    const byKey = { '2026-23': run(60, 10), '2026-24': run(90, 15) }
    const series = computeWeekSeries(weeks, byKey, 99, 2026)

    expect(series).toHaveLength(2)
    expect(series[0]).toMatchObject({ key: '2026-23', week: 23, year: 2026, label: 'W23' })
    expect(series[1].key).toBe('2026-24')
    // distance comes straight from the workout's "X km"
    expect(series[0].distance).toBeCloseTo(10, 5)
    expect(series[1].distance).toBeCloseTo(15, 5)
    // duration from "N min"
    expect(series[0].duration).toBeCloseTo(60, 5)
    expect(series[1].duration).toBeCloseTo(90, 5)
    // load is positive and scales with duration (same intensity factor)
    expect(series[0].load).toBeGreaterThan(0)
    expect(series[1].load).toBeGreaterThan(series[0].load)
  })

  it('emits a zero-filled entry for an empty week', () => {
    const weeks = [{ week: 23, year: 2026, key: '2026-23' }]
    const series = computeWeekSeries(weeks, { '2026-23': [] }, 99, 2026)
    expect(series[0]).toMatchObject({ key: '2026-23', distance: 0, duration: 0, load: 0 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/loadSignals.test.js -t computeWeekSeries`
Expected: FAIL with "computeWeekSeries is not a function".

- [ ] **Step 3: Implement `computeWeekSeries`**

Append to `src/utils/loadSignals.js`:

```javascript
// Per-week series for the planner trend chart: one ordered entry per week with
// the metrics the chart can switch between. Same source of truth as the badges
// (buildWeekStats) so the chart and the per-week signals never disagree.
export function computeWeekSeries(weeks, workoutsByWeekKey, currentWeek, currentYear) {
  return weeks.map(week => {
    const stats = buildWeekStats(week, workoutsByWeekKey, currentWeek, currentYear)
    return {
      key: week.key,
      week: week.week,
      year: week.year,
      label: `W${week.week}`,
      distance: stats.distance,
      duration: stats.duration,
      load: stats.load,
    }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/loadSignals.test.js`
Expected: PASS (all describe blocks, including the new one).

- [ ] **Step 5: Commit**

```bash
git add src/utils/loadSignals.js src/utils/loadSignals.test.js
git commit -m "feat: add computeWeekSeries for planner trend chart"
```

---

## Task 3: `trendChart.js` — metrics, data, options

The planner-local chart-data builder, metric list, and chart.js options. Does NOT import the dashboard's chart code (keeps the planner decoupled).

**Files:**
- Create: `src/components/AdminPlanBuilder/trendChart.js`
- Test: `src/components/AdminPlanBuilder/trendChart.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/components/AdminPlanBuilder/trendChart.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { TREND_METRICS, buildTrendChartData, trendChartOptions } from './trendChart'

const SERIES = [
  { key: '2026-23', label: 'W23', distance: 10, duration: 60, load: 100 },
  { key: '2026-24', label: 'W24', distance: 20, duration: 90, load: 200 },
  { key: '2026-25', label: 'W25', distance: 30, duration: 120, load: 300 },
]

describe('TREND_METRICS', () => {
  it('lists distance, duration, and load', () => {
    expect(TREND_METRICS.map(m => m.value)).toEqual(['distance', 'duration', 'load'])
  })
})

describe('buildTrendChartData', () => {
  it('uses the selected metric for the primary line', () => {
    const data = buildTrendChartData(SERIES, 'distance')
    expect(data.labels).toEqual(['W23', 'W24', 'W25'])
    expect(data.datasets[0].data).toEqual([10, 20, 30])
  })

  it('switches the primary line when the metric changes', () => {
    const data = buildTrendChartData(SERIES, 'duration')
    expect(data.datasets[0].data).toEqual([60, 90, 120])
  })

  it('adds a 3-week trailing moving-average line as a second dataset', () => {
    const data = buildTrendChartData(SERIES, 'load')
    // MA at each index = trailing avg of up to 3 values:
    // [100], [100,200], [100,200,300] => 100, 150, 200
    expect(data.datasets[1].data).toEqual([100, 150, 200])
  })
})

describe('trendChartOptions', () => {
  it('returns a chart.js options object for the given metric meta', () => {
    const meta = TREND_METRICS.find(m => m.value === 'distance')
    const opts = trendChartOptions(meta)
    expect(opts.responsive).toBe(true)
    expect(opts.maintainAspectRatio).toBe(false)
    expect(opts.scales.y.beginAtZero).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/AdminPlanBuilder/trendChart.test.js`
Expected: FAIL with module-not-found / exports missing.

- [ ] **Step 3: Implement `trendChart.js`**

Create `src/components/AdminPlanBuilder/trendChart.js`:

```javascript
import { averageLastValues } from '../../utils/seriesMath'
import { formatDurationLabel, formatKmValue } from '../../utils'

// The three metrics the planner trend chart can switch between. `color` is the
// line color; `unit` drives axis/tooltip formatting.
export const TREND_METRICS = [
  { value: 'distance', label: 'Distance', unit: 'km', color: '#2563eb' },
  { value: 'duration', label: 'Duration', unit: 'min', color: '#10b981' },
  { value: 'load', label: 'Load', unit: '', color: '#f97316' },
]

function metricColor(metric) {
  return (TREND_METRICS.find(m => m.value === metric) || TREND_METRICS[0]).color
}

// Build chart.js data for the selected metric: a primary line plus its 3-week
// trailing moving average. Planner-local — does not depend on dashboard charts.
export function buildTrendChartData(series, metric) {
  const values = series.map(point => Number((point[metric] || 0).toFixed(1)))
  const movingAverage = series.map((_, index) =>
    Number(averageLastValues(values, 3, index).toFixed(1)))
  const color = metricColor(metric)

  return {
    labels: series.map(point => point.label),
    datasets: [
      {
        label: 'Weekly',
        data: values,
        borderColor: color,
        backgroundColor: `${color}22`,
        fill: true,
        tension: 0.32,
        pointRadius: 3,
        order: 2,
      },
      {
        label: '3-week average',
        data: movingAverage,
        borderColor: '#0f172a',
        pointBackgroundColor: '#0f172a',
        pointBorderWidth: 0,
        pointRadius: 2,
        borderDash: [6, 6],
        tension: 0.3,
        order: 1,
      },
    ],
  }
}

function formatTick(value, unit) {
  if (unit === 'km') return formatKmValue(value)
  if (unit === 'min') return formatDurationLabel(Math.round(value))
  return `${Math.round(value)}`
}

// chart.js options mirroring the dashboard's performance chart style, but
// planner-local and English-labelled. `metricMeta` is a TREND_METRICS entry.
export function trendChartOptions(metricMeta) {
  const unit = metricMeta?.unit || ''
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
          label: context => `${context.dataset.label}: ${formatTick(context.parsed.y, unit)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11, weight: '700' } },
      },
      y: {
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/AdminPlanBuilder/trendChart.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminPlanBuilder/trendChart.js src/components/AdminPlanBuilder/trendChart.test.js
git commit -m "feat: add planner trend chart data + options builder"
```

---

## Task 4: `useMonthTrendsToggle`

A second localStorage-persisted toggle, independent of the load-signals one.

**Files:**
- Create: `src/components/AdminPlanBuilder/useMonthTrendsToggle.js`

- [ ] **Step 1: Implement the hook**

Create `src/components/AdminPlanBuilder/useMonthTrendsToggle.js`:

```javascript
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'planBuilder.monthTrends.v1'

function loadStored() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

// Show/hide the month-view trend chart panel. Off by default; persists across
// reloads. Independent of useMonthSignalsToggle (separate key, separate state).
export function useMonthTrendsToggle() {
  const [showTrends, setShowTrends] = useState(loadStored)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, showTrends ? 'true' : 'false')
    } catch {
      // ignore quota / disabled storage
    }
  }, [showTrends])

  return { showTrends, setShowTrends }
}
```

- [ ] **Step 2: Verify nothing broke**

Run: `npx vitest run`
Expected: PASS, unchanged count (file not imported yet).

- [ ] **Step 3: Commit**

```bash
git add src/components/AdminPlanBuilder/useMonthTrendsToggle.js
git commit -m "feat: add persisted toggle hook for month trend panel"
```

---

## Task 5: `MonthTrendPanel` component

Holds the metric-switcher state and renders the chart.

**Files:**
- Create: `src/components/AdminPlanBuilder/MonthTrendPanel.jsx`
- Test: `src/components/AdminPlanBuilder/MonthTrendPanel.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/AdminPlanBuilder/MonthTrendPanel.test.jsx`:

```javascript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// react-chartjs-2 renders a <canvas> that jsdom can't paint; stub <Line> so we
// test the panel's switcher behavior, not chart.js rendering.
vi.mock('react-chartjs-2', () => ({
  Line: ({ data }) => <div data-testid="trend-line" data-primary={JSON.stringify(data.datasets[0].data)} />,
}))

import MonthTrendPanel from './MonthTrendPanel'

const SERIES = [
  { key: '2026-23', label: 'W23', distance: 10, duration: 60, load: 100 },
  { key: '2026-24', label: 'W24', distance: 20, duration: 90, load: 200 },
]

describe('MonthTrendPanel', () => {
  it('renders a metric switcher with Distance/Duration/Load', () => {
    render(<MonthTrendPanel series={SERIES} />)
    expect(screen.getByRole('button', { name: /distance/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /duration/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /load/i })).toBeInTheDocument()
  })

  it('defaults to distance and switches the chart data on metric click', () => {
    render(<MonthTrendPanel series={SERIES} />)
    // default distance => primary data [10, 20]
    expect(screen.getByTestId('trend-line')).toHaveAttribute('data-primary', '[10,20]')
    fireEvent.click(screen.getByRole('button', { name: /duration/i }))
    expect(screen.getByTestId('trend-line')).toHaveAttribute('data-primary', '[60,90]')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/AdminPlanBuilder/MonthTrendPanel.test.jsx`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the component**

Create `src/components/AdminPlanBuilder/MonthTrendPanel.jsx`:

```javascript
import { useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import '../AnalysisDashboard/charts/registry'
import { TREND_METRICS, buildTrendChartData, trendChartOptions } from './trendChart'

// Collapsible trend chart for the month view. One line chart with a
// Distance/Duration/Load switcher and a 3-week moving-average line. `series`
// is precomputed by computeWeekSeries — the panel does no aggregation.
export default function MonthTrendPanel({ series }) {
  const [metric, setMetric] = useState('distance')
  const metricMeta = TREND_METRICS.find(m => m.value === metric) || TREND_METRICS[0]

  const data = useMemo(() => buildTrendChartData(series, metric), [series, metric])
  const options = useMemo(() => trendChartOptions(metricMeta), [metricMeta])

  return (
    <section className="pb-month-trends" aria-label="Training trend chart">
      <div className="pb-trend-switcher" role="group" aria-label="Trend metric">
        {TREND_METRICS.map(m => (
          <button
            key={m.value}
            type="button"
            className={`pb-trend-metric${m.value === metric ? ' is-active' : ''}`}
            aria-pressed={m.value === metric}
            onClick={() => setMetric(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="pb-trend-canvas">
        <Line data={data} options={options} />
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/AdminPlanBuilder/MonthTrendPanel.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminPlanBuilder/MonthTrendPanel.jsx src/components/AdminPlanBuilder/MonthTrendPanel.test.jsx
git commit -m "feat: add MonthTrendPanel with metric switcher"
```

---

## Task 6: Wire the trends toggle + panel into `MonthGridPanel`

Add the second toggle button and render the panel above the grid when on.

**Files:**
- Modify: `src/components/AdminPlanBuilder/MonthGridPanel.jsx`
- Test: `src/components/AdminPlanBuilder/MonthGridPanel.test.jsx`

- [ ] **Step 1: Add imports and compute the series**

In `src/components/AdminPlanBuilder/MonthGridPanel.jsx`, add to the existing imports (near the `computeWeekSignals` import):

```javascript
import { computeWeekSignals, computeWeekSeries } from '../../utils/loadSignals'
import { useMonthTrendsToggle } from './useMonthTrendsToggle'
import MonthTrendPanel from './MonthTrendPanel'
```

(Note: there is already an `import { computeWeekSignals } from '../../utils/loadSignals'` line — change it to the combined import above rather than adding a duplicate. Keep the existing `useMonthSignalsToggle` and `MonthWeekSignals` imports as they are.)

After the existing `const { showSignals, setShowSignals } = useMonthSignalsToggle()` and the `signalMap` useMemo, add:

```javascript
  const { showTrends, setShowTrends } = useMonthTrendsToggle()
  const weekSeries = useMemo(
    () => computeWeekSeries(overviewWeeks, overviewWorkoutsByWeekKey, currentWeek, currentYear),
    [overviewWeeks, overviewWorkoutsByWeekKey, currentWeek, currentYear]
  )
```

- [ ] **Step 2: Add the trends toggle button next to the signals toggle**

In the `pb-month-toolbar` div (added in the previous feature), there is already a `pb-month-signals-toggle` button. Add a second button right after it, inside the same `pb-month-toolbar` div:

```javascript
        <button
          type="button"
          className={`pb-month-signals-toggle${showTrends ? ' is-on' : ''}`}
          onClick={() => setShowTrends(v => !v)}
          aria-pressed={showTrends}
          title="Show training trends (distance, duration, load over time)"
        >
          {showTrends ? 'Hide trends' : 'Show trends'}
        </button>
```

- [ ] **Step 3: Render the trend panel above the grid**

Immediately AFTER the closing `</div>` of `pb-month-toolbar` and BEFORE the `loadingOverview ? (...) : (...)` block that renders the grid, add:

```javascript
      {showTrends && <MonthTrendPanel series={weekSeries} />}
```

- [ ] **Step 4: Add a regression test for the trends toggle**

In `src/components/AdminPlanBuilder/MonthGridPanel.test.jsx`, the file mocks nothing for charts yet. Add a chart mock at the top (after the existing imports, before `const WEEKS`) so the panel can render under jsdom:

```javascript
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="trend-line" />,
}))
```

(`vi` is already imported at the top of this file — verify it is in the `import { describe, it, expect, vi } from 'vitest'` line; it is.)

Then add this test inside the `describe('MonthGridPanel', ...)` block:

```javascript
  it('shows the trend chart only after toggling trends on', () => {
    renderPanel()
    expect(screen.queryByLabelText('Training trend chart')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /show trends/i }))
    expect(screen.getByLabelText('Training trend chart')).toBeInTheDocument()
  })
```

- [ ] **Step 5: Run the month grid tests**

Run: `npx vitest run src/components/AdminPlanBuilder/MonthGridPanel.test.jsx`
Expected: PASS, including the new trends test and the existing signals test.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS, all files.

- [ ] **Step 7: Commit**

```bash
git add src/components/AdminPlanBuilder/MonthGridPanel.jsx src/components/AdminPlanBuilder/MonthGridPanel.test.jsx
git commit -m "feat: wire trend chart panel + toggle into month grid"
```

---

## Task 7: Styles

Style the trend panel, the metric switcher, and the muted empty-week badge.

**Files:**
- Modify: `src/components/AdminPlanBuilder/styles/month.css`

- [ ] **Step 1: Append styles**

Append to `src/components/AdminPlanBuilder/styles/month.css`. Use the existing design tokens (confirmed available in `src/styles/tokens.css`): `--th-surface`, `--th-line`, `--th-ink`, `--th-ink-muted`, `--th-accent`, `--th-accent-soft`, `--th-accent-ring`, `--th-radius-sm`, `--th-text-2xs`.

```css
/* ── Empty-week (rest) badge — muted ─────────────────────────────────── */
.pb-month-signals.is-empty {
  opacity: 0.62;
}

/* ── Month-view trend chart panel ────────────────────────────────────── */
.pb-month-trends {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: var(--th-surface);
  border: 1px solid var(--th-line);
  border-radius: var(--th-radius-sm);
}

.pb-trend-switcher {
  display: flex;
  gap: 6px;
}

.pb-trend-metric {
  font-size: var(--th-text-2xs);
  font-weight: 600;
  padding: 3px 12px;
  border: 1px solid var(--th-line);
  border-radius: 999px;
  background: var(--th-surface);
  color: var(--th-ink-muted);
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.pb-trend-metric:hover {
  color: var(--th-ink);
}
.pb-trend-metric.is-active {
  background: var(--th-accent-soft);
  color: var(--th-accent);
  border-color: var(--th-accent-ring);
}

/* chart.js needs a sized box; the canvas fills it (maintainAspectRatio:false). */
.pb-trend-canvas {
  position: relative;
  height: 220px;
}
```

- [ ] **Step 2: Verify in the running app**

Run: `npm run dev`
Open Plan builder → Month view. Click "Show trends": a chart panel appears above the grid with Distance/Duration/Load buttons; switching changes the line. Click "Show load signals": every week (including rest weeks) shows a badge, rest weeks muted. Both toggles persist across reload and work independently.

- [ ] **Step 3: Commit**

```bash
git add src/components/AdminPlanBuilder/styles/month.css
git commit -m "style: trend chart panel, metric switcher, muted rest-week badge"
```

---

## Task 8: Full verification

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: PASS, all files.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds. (There is no `lint` script in this project.)

- [ ] **Step 3: Final commit if the build produced fixes**

```bash
git add -A
git commit -m "chore: build fixes for planner trend chart"
```

---

## Self-Review notes

- **Spec coverage:** badge on every week (Task 1) ✓; empty week shows Load 0 + ramp + band (Task 1 test) ✓; ramp `—` only when prior load is 0 (already in `computeWeekSignals`, unchanged) ✓; one combined chart with Distance/Duration/Load switcher (Tasks 3, 5) ✓; default Distance (Task 5) ✓; 3-week MA line (Task 3) ✓; range = visible overview weeks (Task 6 passes `overviewWeeks`) ✓; collapsible panel, independent persisted toggle (Tasks 4, 6) ✓; English labels (Task 3) ✓; shared `buildWeekStats` source of truth (Task 2) ✓; planner-local chart builder, no dashboard import (Task 3) ✓.
- **Type consistency:** the series object `{ key, week, year, label, distance, duration, load }` is produced by `computeWeekSeries` (Task 2) and consumed by `buildTrendChartData`/`MonthTrendPanel` (Tasks 3, 5) — fields match. `TREND_METRICS` `value`s (`distance`/`duration`/`load`) match the series keys and the `MonthTrendPanel` default. The trends toggle returns `{ showTrends, setShowTrends }` (Task 4) used verbatim in Task 6.
- **Verified facts:** `react-chartjs-2` and chart.js are app deps; `AnalysisDashboard/charts/registry` is a pure side-effect import (safe to import once in the panel); `formatKmValue`/`formatDurationLabel` are exported from `src/utils`; `averageLastValues` is in `src/utils/seriesMath.js`; `npm run build` exists, no `lint` script.
