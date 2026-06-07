# Coach Week Overview — read-only weekly summary

**Date:** 2026-06-04
**Status:** Design approved, pending spec review

## Goal

Replace the coach panel's interactive week-plan page (PlanTab) with a **read-only
weekly overview** of the selected athlete's planned training for the selected
week. It answers "what does the training week ahead look like?" at a glance:

- Total hours for the week
- A pie/doughnut of hours per activity
- A list of kilometres per activity
- Distribution of time across intensity zones (minutes/hours in zones 1–5)
- The week being viewed (week number + date range, with prev/next/today)

The page is **view-only** — no session adding, dragging, completing, or filtering.

## Scope decisions (locked)

- **Fully replaces** the existing PlanTab content. The day-by-day planner, "New
  session", "from session bank", layout toggle, activity filter, and the Strava
  block are all removed from this page.
- **Planned sessions** are the data source — all of the selected week's workouts,
  regardless of completion (this is forward-looking, so no past-week
  completed-only filtering).
- Session creation still exists elsewhere (the Oktbank / session-bank tab and its
  CustomForm flow are untouched) — this change only affects what the plan tab
  renders.

## Architecture & data

No new data fetching. The selected week's workouts are already available to the
tab as `props.workouts` (the `useWeeklyWorkouts` result for `selectedAthleteId` +
selected week). All math reuses existing estimators.

**Shared aggregation (one source of truth):** the per-week computation currently
lives inside the private `buildWeekStats` in
`src/components/AnalysisDashboard/aggregations.js`. Extract the workout-level
mapping + reduction into a new pure, exported helper:

```
src/utils/weekSummary.js
  computeWeekSummary(workouts) -> {
    count,
    totalDuration,        // minutes
    totalDistance,        // km
    totalLoad,
    activityDuration,     // { tag: minutes }
    activityDistance,     // { tag: km }   <-- NEW (buildWeekStats lacks this)
    activityLoad,         // { tag: load }
    zones,                // { 1..5: minutes }
  }
```

It uses the existing estimators: `estimateWorkoutDuration`, `getWorkoutDistance`,
`estimateWorkoutLoad`, `normalizeIntensityZones` (same zone-share split as
`buildWeekStats`: a workout's duration is divided evenly across its normalized
zones). `buildWeekStats` is then refactored to call `computeWeekSummary` for the
shared fields and keep its analysis-only extras (dailyLoads, mechanicalLoad,
hardSessions, longestSession, past-week filtering) on top — so the analysis
dashboard's numbers are unchanged and both surfaces share the core math.

`activityDistance` is added to `computeWeekSummary` and also surfaced from
`buildWeekStats` (harmless addition; analysis dashboard may ignore it).

## Components

```
src/components/AdminDashboard/tabs/PlanTab.jsx   (rewritten — view-only)
  └─ WeekNav  (existing — week number, range, prev/next/today)
  └─ WeekOverview  (new section component)
       ├─ summary row: total hours, total km, sessions, total load
       ├─ HoursByActivity  — Doughnut of activityDuration
       ├─ DistanceByActivity — sorted km list from activityDistance
       └─ ZoneDistribution — Doughnut of zones + per-zone minutes list
```

New files:
- `src/utils/weekSummary.js` — `computeWeekSummary` (pure).
- `src/components/AdminDashboard/WeekOverview.jsx` — presentational; takes the
  selected week's workouts, calls `computeWeekSummary`, renders the four blocks.

Reused primitives:
- `Page`, `WeekNav`, `EmptyState` from `../../ui`.
- `ChartCard`, `Stat` from `AnalysisDashboard/sections/primitives`.
- `Doughnut` from `react-chartjs-2`; chart registry already set up.
- Chart data builders from `AnalysisDashboard/charts/data.js`:
  `buildActivityShareChartData` (hours-by-activity share), `buildZoneDoughnutData`
  (zone distribution). Both already accept the `{ tag: value }` / `{ 1..5: min }`
  shapes `computeWeekSummary` produces.

PlanTab keeps receiving its existing props; it now only reads `workouts`,
`loadingWorkouts`, and the week-nav props (`currentWeek`, `currentYear`, `monday`,
`sunday`, `isThisWeek`, `onWeekChange`, `prevWeek`, `nextWeek`). The now-unused
planner props remain passed by the parent (harmless) but are no longer destructured.

## Formatting

- Hours: minutes → `formatDurationLabel` (existing, e.g. "5h 30m"); the headline
  total shown in hours.
- Distance: `formatKmValue` (existing, e.g. "12.5 km").
- Activity labels/colors: `ACTIVITY_TAG_MAP` (existing) for human label + color so
  the pie and km list match the app's activity palette.
- Zones: minutes per zone, also shown as h/m; zone colors from `ZONE_COLORS`
  (existing) so the doughnut matches the rest of the app.

## States

- **Loading** (`loadingWorkouts`): `EmptyState title="Loading…"`.
- **Empty week** (no workouts): `EmptyState title="No sessions planned this week"`
  with a short description. No action button (view-only).
- **Zero-distance activities** (e.g. strength): omitted from the km list (only
  activities with distance > 0 appear); still counted in hours pie and zones.
- **No zone data** (workouts without zones): zone doughnut shows an empty state in
  its card; totals still render.

## Testing

- **`computeWeekSummary` (pure, Vitest):**
  - sums duration/distance/load across a week's workouts;
  - groups duration/distance/load by activity tag;
  - splits a workout's duration across its normalized zones (e.g. a 60-min
    zone [2,3] workout adds 30 min to zone 2 and 30 to zone 3);
  - returns zeroed structures for an empty array;
  - matches the numbers `buildWeekStats` produced before the refactor for the
    shared fields (regression guard).
- **Refactor guard:** existing AnalysisDashboard behavior unchanged — run the full
  suite + build.

## Out of scope

- Planned-vs-actual comparison (planned only).
- Editing/adding/completing sessions from this page.
- Per-day breakdown (the analysis dashboard already has daily load); this page is
  week-level totals only.
