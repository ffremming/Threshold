# Planner trend chart + load badge on every week

**Date:** 2026-06-08
**Status:** Approved, ready for implementation plan

## Goal

Two related additions to the plan builder's **Month view**:

1. **Load badge on every week** — the per-week signal bar currently hides for
   zero-load weeks; show it for all weeks so the load picture is unbroken.
2. **A trend chart in the planner** — one combined line chart with a
   metric switcher (Distance / Duration / Load) and a moving-average trend line,
   in a collapsible panel, so a coach can read distance/duration/load ramp over
   time without leaving the planner.

Read-only, coach-facing. Both surfaces reuse the existing per-week aggregation
(`buildWeekStats`) so the badges and the chart never disagree.

## Part 1 — Badge on every week

### Current behavior

`src/components/AdminPlanBuilder/MonthWeekSignals.jsx` line 15:
`if (!signal || !(signal.load > 0)) return null` — empty/zero-load weeks render
nothing.

### Change

Relax the guard to `if (!signal) return null`. Every week with a signal entry
renders the bar. A zero-load week shows:

- **Load 0**, in a muted style (a `is-empty` modifier class on the bar).
- **Ramp** vs the immediately preceding week. The existing `computeWeekSignals`
  ramp math already handles this: a loaded→rest transition reads `↓100%`; only
  when the *previous* week's load is 0 does ramp show `—` (can't compute % from
  zero — correct).
- **ACWR pill** — the existing band/settling logic already works at load 0
  (acute/chronic averages simply include the zero). No change needed.

No new aggregation. The only code change is the guard + a muted style for the
zero-load case.

### Edge cases

- `signal` genuinely missing (week not in the map) → still returns null.
- Rest week between two loaded weeks → shows `↓` ramp (compares to prior week).
- First visible week with no prior → ramp `—` (already handled).

## Part 2 — Planner trend chart

### What the coach sees

A collapsible **Trends** panel above the month grid, revealed by its own toggle
in the existing `pb-month-toolbar`. Inside: a single **line chart** with a
**metric switcher** — Distance / Duration / Load (default **Distance**). The
selected metric draws as a line plus its **3-week moving-average** trend line
(mirroring the dashboard's `buildPerformanceChartData` style). The x-axis is the
**visible overview weeks** (~9 weeks: the same weeks shown in the grid), so the
chart stays in sync with the grid as the coach navigates — no extra data fetch.

Chart labels are in **English**, matching the planner UI (the AnalysisDashboard
charts are Norwegian; the planner is not — keep them consistent with the planner).

### Architecture

**Key reuse principle:** the chart and the badges must draw from the same
per-week aggregation. Both go through `buildWeekStats` (already shared in
`src/utils/loadSignals.js`).

1. **Data — `computeWeekSeries(weeks, workoutsByWeekKey, currentWeek, currentYear)`**
   in `src/utils/loadSignals.js`. Iterates the chronological `weeks`, calls
   `buildWeekStats` per week, and returns an ordered array of
   `{ key, week, year, label, distance, duration, load }`. `label` is a short
   week label (e.g. `W23`). This is the one source of truth for the chart; the
   badges already use `computeWeekSignals` over the same `buildWeekStats`.

2. **Chart data — `buildTrendChartData(series, metric)`** in a new
   `src/components/AdminPlanBuilder/trendChart.js`. Planner-local (does NOT
   import the dashboard's `buildPerformanceChartData`, to avoid coupling the
   planner to dashboard internals). Returns a chart.js `{ labels, datasets }`:
   - a line dataset for the selected metric (`series.map(s => s[metric])`)
   - a 3-week moving-average line via `averageLastValues` (from
     `src/utils/seriesMath.js`)
   Includes a small `TREND_METRICS` list `[{ value, label, unit }]` for
   Distance (km) / Duration (min) / Load.

3. **Chart options — `trendChartOptions(metricMeta)`** in the same
   `trendChart.js`, modeled on `performanceOptions` but planner-local and
   English-labelled. Tooltip/axis formatting respects the metric unit.

4. **Component — `MonthTrendPanel.jsx`** in `AdminPlanBuilder/`. Holds the
   metric-switcher state (local `useState`, default `'distance'`), builds data
   via `buildTrendChartData`, and renders `<Line>` from `react-chartjs-2` inside
   a simple card. Imports the chart `registry` (the existing
   `AnalysisDashboard/charts/registry` side-effect import that registers chart.js
   elements) once at the top.

5. **Toggle — `useMonthTrendsToggle`** in
   `src/components/AdminPlanBuilder/useMonthTrendsToggle.js`, modeled exactly on
   `useMonthSignalsToggle`, with storage key `planBuilder.monthTrends.v1`.
   Independent of the load-signals toggle: two separate buttons in
   `pb-month-toolbar`, each persisted, each on/off on its own.

6. **Placement — `MonthGridPanel.jsx`.** Add the trends toggle button alongside
   the signals toggle in `pb-month-toolbar`. Render `<MonthTrendPanel>` (gated by
   the trends toggle) ABOVE the `pb-month-grid`, using the same memoized inputs
   (`overviewWeeks`, `overviewWorkoutsByWeekKey`, `currentWeek`, `currentYear`).

### Data flow

```
overviewWeeks (chronological)            ┐
overviewWorkoutsByWeekKey                ├─► computeWeekSeries (memoized)
currentWeek, currentYear                 ┘        │
                                                  ▼
                                  [{ key,label,distance,duration,load }]
                                                  │
                          metric switcher state ──┤
                                                  ▼
                              buildTrendChartData(series, metric)
                                                  ▼
                                  <Line> in MonthTrendPanel
```

### Edge cases

- **Empty range / all-zero weeks:** chart renders flat lines at 0 — acceptable;
  no special empty state needed (the coach sees there's no volume).
- **Short series (< 3 weeks):** `averageLastValues` averages what exists
  (existing behavior) — the MA line just tracks the data early on.
- **Metric switch:** purely client-side, re-derives chart data from the same
  `series`; no refetch.

## Testing

**Part 1:**
- Update `MonthWeekSignals.test.jsx`: a zero-load signal now renders (Load 0 +
  ramp + band), not null. Keep the `signal === null → renders nothing` case.
- Add: a zero-load week with a loaded prior week shows a `↓` ramp; with a
  zero prior shows `—`.

**Part 2:**
- `computeWeekSeries`: returns one entry per week in order, with correct
  `distance`/`duration`/`load` pulled from `buildWeekStats`, and the right
  `label`/`key`. Test with a real-workout fixture (reuse the `notes: 'N min'` /
  `distance: 'X km'` fixture style already used in `loadSignals.test.js`).
- `buildTrendChartData`: selecting each metric produces the matching data
  array; the MA dataset equals the 3-week trailing average; `TREND_METRICS`
  has the three expected entries.
- `MonthTrendPanel`: renders a chart; clicking a metric button switches the
  active metric (assert the switcher state / rendered active button). Use the
  existing chart-test approach if any (otherwise assert on the switcher buttons
  and that a canvas/`<Line>` mounts).
- `useMonthTrendsToggle`: persists to its own key; independent of the signals
  toggle.

## Files touched

- **Edit** `src/components/AdminPlanBuilder/MonthWeekSignals.jsx` — relax guard,
  muted zero-load style hook.
- **Edit** `src/components/AdminPlanBuilder/MonthWeekSignals.test.jsx` — new
  empty-week assertions.
- **Edit** `src/utils/loadSignals.js` — add `computeWeekSeries`.
- **Edit** `src/utils/loadSignals.test.js` — `computeWeekSeries` tests.
- **New** `src/components/AdminPlanBuilder/trendChart.js` — `TREND_METRICS`,
  `buildTrendChartData`, `trendChartOptions`.
- **New** `src/components/AdminPlanBuilder/trendChart.test.js`
- **New** `src/components/AdminPlanBuilder/MonthTrendPanel.jsx` + `.test.jsx`
- **New** `src/components/AdminPlanBuilder/useMonthTrendsToggle.js`
- **Edit** `src/components/AdminPlanBuilder/MonthGridPanel.jsx` — second toggle,
  render `<MonthTrendPanel>` above the grid.
- **Edit** `src/components/AdminPlanBuilder/styles/month.css` — trend panel +
  metric-switcher styles, `is-empty` muted badge style.
