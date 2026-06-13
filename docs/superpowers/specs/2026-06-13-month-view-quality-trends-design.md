# Month-view quality-over-time trends

**Date:** 2026-06-13
**Status:** Design approved

## Goal

In the plan builder's month view, let a coach see the six training qualities
(threshold, VO2max, speed, strength, muscular endurance, endurance) over the
weeks in the month overview window. Surfaced as a fourth metric inside the
existing trend chart's switcher — no new top-level toggle.

## Decisions

- **Placement:** Add `Quality` as a fourth button in the existing trend-panel
  switcher alongside Distance / Duration / Load. No separate "Show quality"
  toggle. The chart already supports per-metric multi-line shapes (Distance fans
  out into per-sport lines today), so Quality fitting six lines is consistent.
- **Quality view content:** Six **stimulus** lines — each week's prescribed dose
  per quality, 0–100 — using the existing `QUALITY_ORDER`, `QUALITY_COLORS`,
  `QUALITY_LABELS` from the dimensions engine. No stimulus/buildup sub-toggle
  (stimulus only).
- **Y-axis:** Switches per metric. Quality uses a fixed `0–100` axis with the
  six-color legend. Distance/Duration/Load keep their current single-metric axis
  (km / min / load) and behavior untouched (Distance per-sport lines;
  Duration/Load primary line + 3-week moving average).
- **Planned-only, whole chart:** All metrics — Distance, Duration, Load, and
  Quality — score **every planned session**, with no completed-only filter for
  past weeks and no dashed past/future ("now") boundary. This **changes existing
  Distance/Duration/Load behavior**: the trend chart will no longer dip for
  skipped past sessions. This is intended.

## Scope boundary (explicitly out of scope)

- The **load-signals strip** (separate "Show load signals" toggle: ACWR, ramp,
  readiness) is NOT changed. It stays completed-only for past weeks via
  `computeWeekSignals` → `buildWeekStats`. After this change, signals ("what
  actually happened") and the trend chart's Load line ("the plan") can
  legitimately differ for a past week with skipped sessions. This is the correct
  separation, not a bug.

## Data path

Today the trend chart is fed by `computeWeekSeries` (in
`src/utils/loadSignals.js`), which calls `buildWeekStats`. `buildWeekStats`
filters past weeks to completed sessions only. To make the trend chart
planned-only and to add per-quality dims, `computeWeekSeries` is reworked to
score directly from the **raw** week workouts (`workoutsByWeekKey[week.key]`),
not via `buildWeekStats`:

For each week in the window, from its raw workouts:
- `distance`, `duration`, `load` — summed from all planned sessions
  (reuse `computeWeekSummary`, which already operates on the workouts passed in).
- `activityDistance` — per-sport distance map (as today, for the Distance fan-out).
- `dims` — `scoreWeek(rawWeekWorkouts, { resolveMuscles }).dims` (0–100 per quality).

`computeWeekSeries` no longer needs the `todayWeek/todayYear` past-boundary
arguments for its own logic, but its signature stays compatible (extra args
ignored) to avoid churning the call site. `computeWeekSignals` is untouched and
keeps using `buildWeekStats`.

`scoreWeek` and `makeMuscleResolver` are already imported/used in
`loadSignals.js` (the latter for `buildWeekStats`), so the resolver is reused.

## Files

- **`src/utils/loadSignals.js`**
  - Rework `computeWeekSeries` to build each entry from raw week workouts:
    add `dims` (via `scoreWeek`), keep `distance/duration/load/activityDistance`
    but sourced planned-only. Reuse the module-level `resolveMuscles`.
- **`src/components/AdminPlanBuilder/trendChart.js`**
  - Add `{ value: 'quality', label: 'Quality' }` to `TREND_METRICS`.
  - Add `buildQualityChartData(series)` → six datasets from `QUALITY_ORDER`,
    reading `point.dims[q]`, colored by `QUALITY_COLORS`, labelled by
    `QUALITY_LABELS` (same line styling as the analysis `QualityTrendChart`:
    `tension: 0.34`, `pointRadius: 2`, `borderWidth: 2`, `spanGaps: true`).
  - `buildTrendChartData` branches to `buildQualityChartData` when
    `metric === 'quality'`.
  - `trendChartOptions` returns a fixed `0–100` y-axis (`max: 100`,
    `stepSize: 25`, integer ticks, no unit formatter) when the metric is
    quality; otherwise current behavior.
- **`src/components/AdminPlanBuilder/MonthTrendPanel.jsx`**
  - No structural change needed — it already renders whatever
    `buildTrendChartData`/`trendChartOptions` return for the selected metric and
    maps `TREND_METRICS` for the switcher. The new `quality` entry flows through.
  - `metricMeta` for quality has no `unit`; confirm options handle the quality
    branch before reading `unit`.

## Testing

- **`trendChart.test.js`** — add cases:
  - `buildTrendChartData(series, 'quality')` returns six datasets in
    `QUALITY_ORDER` with values pulled from each point's `dims`.
  - `trendChartOptions` for quality yields a `0–100` y-axis (`max === 100`).
  - Existing distance/duration/load cases still pass unchanged.
- **`loadSignals` tests** — add/extend coverage that `computeWeekSeries`:
  - includes a `dims` field per entry,
  - counts planned (non-completed) sessions for a past week (planned-only),
  - keeps `distance/duration/load` consistent with the planned-only totals.
  - Verify `computeWeekSignals` behavior is unchanged (still completed-only).
- **`MonthTrendPanel.test.jsx`** — selecting the `Quality` switcher button
  renders the chart with the quality datasets; switching back to Load restores
  the single-metric view.

## Non-goals

- No buildup view in the month panel.
- No change to the load-signals strip or `computeWeekSignals`.
- No new persisted toggle (Quality is a metric within the existing trend panel,
  which already persists its show/hide via `useMonthTrendsToggle`; the selected
  metric itself is local component state, as it is today).
