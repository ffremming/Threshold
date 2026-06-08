# Plan builder — Week / Month sub-tabs with cross-week drag/drop

**Date:** 2026-06-08
**Status:** Proposed (awaiting approval)

## Problem

The admin Plan builder shows a single Week view. The user wants a sub-navbar
inside the builder with two views: **Week** (the current view) and **Month** (a
multi-week calendar grid). Sessions should be draggable across days — including
across week boundaries — in the Month view, and clicking a day should jump the
Week view to that week.

## Goals

1. A sub-tab bar at the top of the builder content with **Week** and **Month**.
2. Week view = exactly what exists today (picker + WeekOverview with drag/drop).
3. Month view = a calendar grid spanning several ISO weeks, each day showing its
   sessions, with full cross-week drag/drop and click-to-jump.
4. Reuse existing components/data where possible; no duplicate week-rendering.
5. Keep the existing "week overview" toggle button in the Week view (unchanged).
6. Respect layout-density preference: the sub-tab bar is the topmost element of
   the builder content; no eyebrow/title blocks.

## Key constraint (discovered)

The existing write handlers — `handleAddTemplateToDay`, `moveWorkoutByDrag`,
`moveWorkout` — are **hardwired to `currentWeek`/`currentYear`** and operate only
on the loaded single-week `workouts` array. They cannot place or move a session
into a *different* week. Cross-week drag/drop therefore requires new week-aware
write logic. The user chose to **build week-aware handlers**.

## Architecture

### Sub-tab state

Local `view` state in `AdminPlanBuilder/index.jsx` (`'week' | 'month'`),
defaulting to `'week'`. Rendered via the existing `Tabs` UI component
(`components/ui/Tabs.jsx`) as the first child of `.pb-shell`, above the week nav.
No URL/route change — it's an in-page toggle, like `showOverview`.

### Month grid — ISO-week rows

The Month view is a grid of **ISO-week rows** (not partial calendar months):
each row is one week (Mon–Sun, 7 day cells) labeled with its week number and date
range. This maps 1:1 onto the `(week, year, weekday)` data model and the existing
9-week overview window, avoiding partial-week edge cases.

Range: the `overviewWeeks` window already loaded for `BirdsEyeOverview`
(`getWeekWindow(currentWeek, currentYear, 4, 4)` = 9 consecutive weeks centered on
the selected week). The Month view shows these weeks as rows. Data comes from
`overviewWorkoutsByWeekKey` — **no new fetch**.

New component `AdminPlanBuilder/MonthGridPanel.jsx`:
- Maps `overviewWeeks` → rows. For each week, `groupWorkoutsByWeekday` on
  `overviewWorkoutsByWeekKey[weekKey]` gives 7 day buckets.
- Each day cell: small session chips (title + activity color), drop zone, and a
  per-day `+` (reuses `onAddSessionToDay`, now week-aware — see below).
- Each week-row header (`W21 · May 18–24`) is a button that calls
  `onWeekChange(week, year)` and switches `view` back to `'week'` (click-to-jump).
- The selected week's row is visually highlighted.
- Session chips are draggable; day cells are drop targets. Uses the same
  `useDragHandlers` drag-state machine, but the drop target now carries
  `{ week, year, weekday, beforeWorkoutId }` instead of just `{ weekday, … }`.

New CSS module `AdminPlanBuilder/styles/month.css` (added to `styles/index.css`).

### Week-aware drag state

`useDragHandlers` currently tracks `dropTarget = { weekday, beforeWorkoutId }`.
Extend it so the Month grid can set `{ week, year, weekday, beforeWorkoutId }`.
The Week view keeps passing only `weekday` (week/year implicitly the selected
week). The drop handler forwards week/year to the new write handlers.

Concretely: `handleDropTargetChange` / `handleDrop` gain optional `week`, `year`
params (default to the builder's `currentWeek`/`currentYear` when omitted), so
the Week view's existing call sites keep working unchanged.

### Week-aware write handlers (the new backend logic)

Add to `AdminDashboard` (in `dragDrop.js` / `templateInsertActions.js`),
operating on the multi-week `overviewWorkouts` array instead of the single-week
`workouts` array, and computing `date` from the **target** week/year:

- `moveWorkoutAcross(workoutId, targetWeek, targetYear, targetWeekday, beforeWorkoutId)`
  - Finds the dragged workout in `overviewWorkouts`.
  - Recomputes the target day group (workouts in target week+weekday) and the
    source day group (in source week+weekday), re-ordering both via a batch.
  - Sets `week`, `year`, `weekday`, `date` (`getDateStringForWeekday(targetWeek,
    targetYear, targetWeekday)`), and `order` on the moved doc.
  - No-op guard when source==target and order is unchanged (as today).
- `addTemplateToDayAcross(template, targetWeek, targetYear, targetWeekday, beforeWorkoutId)`
  - Same as `handleAddTemplateToDay` but week/year-parameterised.
- `addSessionToDayAcross(week, year, weekday)` — opens the custom-session form
  preset to that week/year/weekday (extends the current `onAddSessionToDay`,
  which today only presets weekday on the current week).

The existing single-week handlers are kept as thin wrappers that call the
week-aware versions with `currentWeek`/`currentYear`, so the Week view path and
all current call sites are unchanged. This keeps one source of truth for the
ordering logic.

`overviewWorkouts` (the array, not just the by-key map) must be threaded into the
move/insert action factories. It is already loaded in `AdminDashboard/index.jsx`;
pass it into `useAdminActions` ctx.

### Component reuse

- Week view: unchanged (`BankPanel` + `BuilderWeekPanel`/`WeekOverview`).
- Month view: new `MonthGridPanel`. The day-cell chip is a small new presentational
  piece (the WeekOverview `SessionCell` is tuned for a single week's tall columns;
  month cells are denser). Drag/drop wiring mirrors `BuilderWeekPanel`'s `dnd`
  object but with week/year in the drop props.
- The picker (`BankPanel`) stays visible in both views (drag templates into either
  the week or the month). In Month view the right pane is the grid; the left pane
  is the same picker.

## Out of scope

- No change to the standalone Week plan tab (`PlanTab`) — it has no sub-tabs.
- No new month-boundary fetch; Month view is bounded by the 9-week overview window.
  (If the user later wants arbitrary month navigation beyond ±4 weeks, that's a
  follow-up that widens `getWeekWindow` or adds paging.)
- No calendar-month (1st–30th) layout; rows are ISO weeks.

## Testing

- `MonthGridPanel`: renders one row per overview week; renders 7 day cells per row;
  a session chip appears in the correct (week, weekday) cell; clicking a week-row
  header calls `onWeekChange` with that week/year.
- `useDragHandlers`: drop target carries week/year; `handleDrop` without week/year
  falls back to current week (Week-view regression guard).
- `dragDrop` week-aware move: moving a workout from (W21, Mon) to (W23, Thu)
  produces a batch that sets week=23/year/weekday=4/date and re-orders both days.
  (Pure-logic test with a fake batch, mirroring existing patterns.)
- Existing suite stays green (60 tests).

## Files

New: `AdminPlanBuilder/MonthGridPanel.jsx`, `AdminPlanBuilder/styles/month.css`,
tests.

Modified: `AdminPlanBuilder/index.jsx` (sub-tab state + render switch),
`useDragHandlers.js` (week/year in drop target), `buildPanelMap.jsx` /
`BuilderWeekPanel.jsx` (unchanged behavior, possibly shared dnd builder),
`AdminDashboard/TabContent.jsx` (pass overview data + week-aware handlers +
week-aware `onAddSessionToDay`), `AdminDashboard/dragDrop.js`,
`templateInsertActions.js`, `useAdminActions.js` (thread `overviewWorkouts`),
`styles/index.css`.
