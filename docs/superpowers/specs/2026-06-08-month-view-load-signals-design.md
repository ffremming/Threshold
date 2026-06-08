# Month-view load signals (load · ramp · ACWR/readiness)

**Date:** 2026-06-08
**Status:** Approved, ready for implementation plan

## Goal

Surface week-to-week training-load signals directly inside the month-view
planning grid, so a coach can read fatigue, intensity buildup, and readiness
**while planning** — without tabbing over to the separate `AnalysisDashboard`.

Read-only. Coach-facing. Toggleable (off by default), with the toggle state
persisted in localStorage.

## Scope

In scope:
- A compact per-week signal bar rendered below each week-row's day cells.
- Three signals per week: **Load**, **Ramp %** (week-over-week), and an
  **ACWR/readiness** pill.
- A toggle to show/hide all strips, persisted in localStorage.
- Extracting the load/signal math out of `AnalysisDashboard/aggregations.js`
  into a shared util so the strip and the dashboard share one source of truth.

Out of scope:
- New editing behavior. Target bands / planned-vs-actual deviation. Athlete-facing
  surface. Activity-tag filtering within the strip (signals are whole-athlete).
- Charts/sparklines (deferred — explicitly chose the compact bar form).

## What the coach sees

A **compact signal bar** spanning the full width of each week-row, positioned
**below** that week's day cells. Hidden by default; revealed by a toolbar toggle.

```
W23  │  Load 412   ↑18%   ● ACWR 1.35 caution
W24  │  Load 305   ↓26%   ● ACWR 0.92 safe
W25  │  Load 488   ↑60%   ● ACWR 1.58 spike
```

- **Load** — weekly training load, the existing `week.load` estimate
  (duration × intensity factor). No new load model.
- **Ramp %** — week-over-week load change vs the immediately preceding week in
  the chronological series, with ↑/↓ direction. Text is color-neutral; the chip
  turns amber when |ramp| exceeds 30%.
- **ACWR pill** — acute(3-week trailing avg) : chronic(6-week trailing avg)
  load ratio, color-coded by band:
  | Band          | Range            | Color |
  |---------------|------------------|-------|
  | undertraining | acwr < 0.8       | red   |
  | safe          | 0.8 ≤ acwr ≤ 1.3 | green |
  | caution       | 1.3 < acwr ≤ 1.5 | amber |
  | spike         | acwr > 1.5       | red   |

  Boundaries are inclusive on the lower-risk side as shown (e.g. exactly 1.3 is
  safe, exactly 1.5 is caution). ACWR of 0 (no chronic history yet) is treated as
  `settling`, not classified into a band.

Empty / no-data weeks render a muted "—" so the strip stays row-aligned but quiet.

## Architecture

### Key constraint

ACWR's chronic load is a **6-week trailing average**, so per-week signals
cannot be computed row-by-row in isolation — they require the whole
`overviewWeeks` series in chronological order, computed once. This drives the
shared-util extraction below.

### 1. Extract load math into a shared util

Today, `buildWeekStats` plus the acute/chronic/readiness loop live **inside**
`computeAnalysis` in `src/components/AnalysisDashboard/aggregations.js`, coupled
to dashboard-only concerns (tag filter, primary metric, peak/strain/monotony).

Lift the reusable core into a new shared module — `src/utils/loadSignals.js`:

- `buildWeekStats(week, workoutsByWeekKey, currentWeek, currentYear)` — already
  a pure function; move it (drop the `activeTagFilter` param, or default it to
  null so the dashboard still passes its filter through). Keeps the
  `isPastWeek → completed-only` filtering.
- `computeWeekSignals(weeks, workoutsByWeekKey, currentWeek, currentYear)` —
  iterate the chronological `weeks`, build the load series, and for each week
  compute:
  - `load`
  - `rampPct` (vs previous week's load; `null` when previous load is 0)
  - `acuteLoad` = `averageLastValues(loadSeries, 3, index)`
  - `chronicLoad` = `averageLastValues(loadSeries, 6, index)`
  - `acwr` = `safeDivide(acuteLoad, chronicLoad)`
  - `readiness` = band classification (`undertraining | safe | caution | spike`)
  - `settling` = `true` for the first weeks where chronic has < 6 weeks of
    history (used to visually mark low-confidence ACWR)

  Returns a map keyed by `week.key`.

`AnalysisDashboard/aggregations.js` then **imports** `buildWeekStats` (and the
acute/chronic helpers it already uses) from the shared util instead of defining
them locally. Its public output (`computeAnalysis`) is unchanged — this is a
moved boundary, not a behavior change. Reuse the existing helpers in
`AnalysisDashboard/utils.js` (`averageLastValues`, `safeDivide`) — move them
alongside if cleaner, or import from there.

### 2. Compute once in MonthGridPanel

`MonthGridPanel` builds the signal map once via `useMemo` over
`overviewWeeks` + `overviewWorkoutsByWeekKey` (+ `currentWeek`, `currentYear`),
and renders a new `MonthWeekSignals` component per row when the toggle is on.

`MonthGridPanel` already receives `overviewWeeks`, `overviewWorkoutsByWeekKey`,
but not `currentWeek` / `currentYear` — these must be threaded through
`buildPanelMap` (which already has them in scope in `AdminPlanBuilder/index.jsx`)
into `MonthGridPanel`.

### 3. MonthWeekSignals component (presentational only)

`src/components/AdminPlanBuilder/MonthWeekSignals.jsx` — takes the precomputed
signal object for its week and renders the bar. No aggregation inside (mirrors
the existing `MonthWeekSummary`, which is intentionally "dumb" and pulls all
numbers from `computeWeekSummary`). Renders the "—" muted state for empty weeks.

Styling: extend `src/components/AdminPlanBuilder/styles/month.css` with the
signal-bar classes, reusing existing tokens. ACWR band colors should use the
app's existing semantic color tokens where they exist.

### 4. Toggle, persisted in localStorage

`showSignals` boolean. Per the layout-density preference (avoid adding new
bars/toolbars), place the toggle in the existing `BuilderPanelHeader` slot
already rendered inside `MonthGridPanel` — a small toggle button, not a new
toolbar.

Persist via a tiny `useLocalStorageState`-style hook (or follow the pattern
`AnalysisDashboard` already uses for its filters — see `usePersistedFilters`
and `FILTERS_STORAGE_KEY`). Storage key e.g. `planBuilder.monthSignals.v1`.
Decision on where the state lives: `MonthGridPanel` local is fine since it is
view-specific; persistence makes the reload-survival the same either way.

## Data flow

```
overviewWeeks (chronological)              ┐
overviewWorkoutsByWeekKey                  ├─► computeWeekSignals (memoized, once)
currentWeek, currentYear                   ┘        │
                                                    ▼
                                       map keyed by week.key
                                                    │
              each week-row reads its own entry ────┤
                                                    ▼
                              MonthWeekSignals renders the bar (when toggle on)
```

Past weeks already filter to `completed` workouts inside `buildWeekStats`,
matching dashboard behavior.

## Edge cases

- **Short window**: chronic needs 6 weeks; with fewer, `averageLastValues`
  averages what exists (existing behavior). Mark the first weeks as `settling`
  and render the ACWR pill in a low-confidence/neutral style rather than
  flashing false spikes.
- **Zero-load prior week**: ramp % vs a 0 prior is undefined → `rampPct = null`
  → render "—", never "+∞%".
- **Empty week (no sessions)**: render the muted "—" row, row-aligned.
- **No tag filter** in the strip: signals are whole-athlete load — the correct
  fatigue picture. (The dashboard keeps its tag filter; the strip does not.)

## Testing

- Unit-test `computeWeekSignals` against a fixture chronological series:
  - known ramp % between consecutive weeks
  - ACWR band classification at boundaries (0.8, 1.3, 1.5)
  - zero-load prior week → `rampPct === null`
  - short window (< 6 weeks) → `settling === true`
  - empty week → load 0, signals degrade gracefully
- Regression: confirm `computeAnalysis` (AnalysisDashboard) output is unchanged
  after extracting `buildWeekStats` / helpers into the shared util — same
  acute/chronic/readiness numbers from the same inputs.
- Component: `MonthWeekSignals` renders Load/Ramp/ACWR for a populated week and
  the muted state for an empty week; toggle persists across reload.

## Files touched

- **New** `src/utils/loadSignals.js` — `buildWeekStats`, `computeWeekSignals`,
  band classification.
- **New** `src/components/AdminPlanBuilder/MonthWeekSignals.jsx`
- **Edit** `src/components/AnalysisDashboard/aggregations.js` — import the
  extracted math instead of defining it locally (no behavior change).
- **Edit** `src/components/AdminPlanBuilder/MonthGridPanel.jsx` — compute signal
  map, render strips, host the toggle.
- **Edit** `src/components/AdminPlanBuilder/buildPanelMap.jsx` and
  `AdminPlanBuilder/index.jsx` — thread `currentWeek` / `currentYear` into the
  month panel.
- **Edit** `src/components/AdminPlanBuilder/styles/month.css` — signal-bar styles.
- **New** small persisted-toggle hook (or reuse the dashboard's pattern).
- **New** tests for `loadSignals` and `MonthWeekSignals`.
