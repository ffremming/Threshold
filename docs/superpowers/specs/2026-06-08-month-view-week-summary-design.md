# Month-view per-week summary — design

**Date:** 2026-06-08
**Status:** Approved

## Goal

On the month view of the training planner (`AdminPlanBuilder` → `MonthGridPanel`),
show per-week training data in each week row:

- **Total duration** for the week.
- **Zone distribution** — a proportional stacked bar of zone-minutes, with exact
  per-zone minutes on hover.
- **Total km of different activities** — icon + km per distance-bearing activity,
  sorted by distance descending.

The calendar may grow taller to fit the summary.

## Decisions (from brainstorming)

- **Placement:** in the existing left-hand week-label column, beneath `W{n}` +
  date range. Day cells keep their width; the row grows taller.
- **Zone viz:** proportional horizontal stacked bar + per-zone minutes on hover
  (via `title`).
- **Totals scope:** per-week only. No grand total across the 9-week window.
- **Km display:** top activities, icon + km, zero-km activities hidden.

## Architecture — reuse existing aggregation

All numbers come from `computeWeekSummary(workouts)`
([src/utils/weekSummary.js](../../../src/utils/weekSummary.js)), which already returns:

- `totalDuration` (minutes)
- `zones` — `{ 1..5: minutes }`
- `activityDistance` — `{ tag: km }`

No new aggregation logic.

Formatting reuses `formatDurationLabel`, `formatKmValue`
([src/utils/load.js](../../../src/utils/load.js)), `ACTIVITY_TAG_MAP`, and
`ZONE_COLORS` (`.border` is the accent color) from `../../utils`.

The zone bar is a small new presentational piece. It does NOT reuse
`getZoneBarBackground`, which makes equal-width bands for *tagged* zones; here the
segment widths must be **proportional to minutes** across zones 1–5.

## Components

### `MonthWeekSummary.jsx` (new, in `AdminPlanBuilder/`)

Pure presentational component.

- **Props:** `workouts` (array for one week).
- **Behavior:**
  - `const summary = computeWeekSummary(workouts)`.
  - If `summary.count === 0` → render `null` (empty weeks stay short).
  - Duration line: `formatDurationLabel(Math.round(summary.totalDuration))`.
  - Zone bar: segments for each zone with minutes > 0, width =
    `minutes / totalZoneMinutes * 100%`, background = `ZONE_COLORS[z].border`.
    Bar's `title` = `"Z1 45m · Z2 30m · …"` (only zones with minutes). Hidden when
    all zones are 0.
  - Km list: `Object.entries(summary.activityDistance)` filtered to `km > 0`,
    sorted desc; each shows `ActivityIcon` (from `ACTIVITY_TAG_MAP[tag].icon`) +
    `formatKmValue(km)`.

### `MonthGridPanel.jsx` (edit)

Inside each week row's left column, after the existing `.pb-month-week-label`
button, render `<MonthWeekSummary workouts={overviewWorkoutsByWeekKey[weekKey] || []} />`.
The week-label button keeps its jump-to-week behavior; the summary is a sibling
(non-interactive) below it, so it does not interfere with the button's click.

## Styling (`styles/month.css`)

- Widen the week-label column: `grid-template-columns` first track `92px` →
  ~`128px` (enough for `🏃 28 km` on one line).
- Row grows to fit: cells already `min-height: 64px`; the summary column stretches
  naturally. Ensure `.pb-month-row` aligns items to stretch so the label column +
  summary share full row height.
- New classes: `.pb-month-summary` (column, small gap, padding), `.pb-month-summary-dur`
  (duration text), `.pb-month-zonebar` (flex row, thin, rounded, overflow hidden),
  `.pb-month-zonebar-seg` (flex-basis from inline width), `.pb-month-km`
  (list/flex-wrap), `.pb-month-km-item` (icon + value), `.pb-month-km-icon`.
- All colors/spacing via `--th-*` design tokens (zone segment colors are the only
  literal-ish values, sourced from `ZONE_COLORS`).

## Edge cases

- Empty week → component returns `null`.
- Sessions without structured blocks → duration falls back to the estimator inside
  `computeWeekSummary`; zone bar hidden if all zones 0.
- Activities with 0 km omitted from the km list.

## Testing

`MonthWeekSummary.test.jsx` (vitest + Testing Library, matching repo convention):

- Renders total duration and km-by-activity for a known structured-block workout
  set.
- Returns nothing (no summary node) for an empty week.
- Omits zero-km activities from the km list.
- Renders a zone bar with a `title` listing per-zone minutes when zone data exists.
