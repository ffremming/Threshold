# Export training plan to Excel — design

**Date:** 2026-06-07
**Status:** Approved

## Goal

A coach can export a training plan to an editable `.xlsx` file from the admin
**Week Plan** tab. The coach chooses which athlete (or all athletes), a custom
start/end date range, and which session fields to include. The result is a real
Excel workbook that opens and edits natively in Excel / Google Sheets.

## Decisions (from brainstorming)

- **Range source:** custom start/end date pickers (any calendar dates).
- **Scope:** athlete chooser in the popup, including an "All athletes" option;
  defaults to the currently-selected athlete.
- **Row format:** one row per session.
- **File format:** true `.xlsx` via SheetJS (`xlsx`).
- **Fields:** all session fields selectable, all checked by default, with a
  "Select all / none" master toggle.
- **Filename / language:** app UI is English → `Training_plan_<athlete>_<start>_<end>.xlsx`.

## Components

### 1. Dependency
Add `xlsx` (SheetJS) to `dependencies`.

### 2. Entry point — Export button
New `ToolbarGroup label="Export"` in
`src/components/AdminDashboard/tabs/PlanTab.jsx`, with a `Download`-icon
`Button`. No new toolbar/bar (respects layout-density preference). Clicking sets
local state `exportOpen = true`.

State for the modal lives in `AdminDashboard/index.jsx` (or PlanTab local state)
— a single `exportOpen` boolean. PlanTab already receives all needed props
(`athletes`, `selectedAthleteId`, `currentWeek`, `currentYear`). Note: `athletes`
must be threaded into `tabProps` (currently `AdminDashboard/index.jsx` does not
pass `athletes` to PlanTab — add it).

### 3. Modal — `ExportPlanModal.jsx` (new, in `AdminDashboard/`)
Built on the existing `Modal` primitive. Props: `open`, `onClose`, `athletes`,
`selectedAthleteId`, `defaultStart`, `defaultEnd`.

Contents:
- **Athlete `Select`** — lists `athletes` by display name; first option
  "All athletes"; defaults to `selectedAthleteId`.
- **Start date / End date** — two `Input type="date"`. Default = current week's
  Monday → Sunday (passed in as `defaultStart`/`defaultEnd`, ISO `YYYY-MM-DD`).
- **Field checkboxes** — all fields listed below, all checked by default, plus a
  "Select all / none" master toggle.
- **Footer** — Cancel + **Export**. Export disabled when: no fields selected, or
  start > end.

On Export: call `usePlanExport`'s run function, then close on success.

State while running: a `status` of `idle | loading | empty | error`. `loading`
disables Export and shows "Gathering sessions…". `empty` shows inline
"No sessions in this range." `error` shows inline error text. The modal stays
open on `empty`/`error` so the coach can adjust.

### 4. Field list (export columns, in order)
`date, weekday, time, title, type, activityTag, category, intensityZone,
loadTag, distance, warmup, description, sessionDetails, exercises, rest,
cooldown, notes`

When "All athletes" is selected, an **Athlete** column is auto-prepended (not in
the checkbox list — it is implied by the all-athletes scope).

Each field has a stable `key` (the workout property), a human `header`, and an
optional `format(workout)` function. Defined as a single `EXPORT_FIELDS` array
in `buildPlanWorkbook.js` so the modal checkbox list and the workbook builder
share one source of truth.

### 5. Data fetching — `usePlanExport.js` (new hook)
Exposes `{ status, runExport(opts) }` where `opts = { athleteId | 'all',
startDate, endDate, selectedFieldKeys }`.

`runExport`:
1. Compute the set of ISO weeks spanning `startDate`→`endDate` inclusive
   (helper `weeksInDateRange(startDate, endDate)` in `src/utils/week.js` or a
   new export helper — reuse existing `getWeekNumber` / week utilities).
2. Determine athlete id list: a single id, or all ids from `athletes`.
3. Fetch via a **one-shot** read built on `subscribeToWorkoutWeeks`: subscribe,
   resolve a Promise on the first `isReady === true` snapshot, unsubscribe.
   Wrap as `fetchWorkoutsOnce({ athleteId, weeks })`. For "all athletes", run one
   fetch per athlete and concatenate (athletes are typically few).
4. Filter workouts to those whose `date` (ISO) is `>= startDate && <= endDate`.
5. Sort by `date`, then `compareWorkoutsBySchedule`.
6. If empty → set `status = 'empty'`, return without writing a file.
7. Else call `buildPlanWorkbook` and trigger the download; set `status = 'idle'`.

Errors set `status = 'error'`.

### 6. Workbook builder — `buildPlanWorkbook.js` (new, pure)
`buildPlanWorkbook({ workouts, selectedFieldKeys, includeAthleteColumn,
athleteNameById })` →

- Build header row from selected fields (in canonical order), prepending
  "Athlete" when `includeAthleteColumn`.
- Build one row per workout using each field's `format` (fallbacks below).
- Create sheet via `XLSX.utils.aoa_to_sheet([headers, ...rows])`.
- Set `sheet['!cols']` widths (reasonable per-field widths; long text fields
  wider).
- `XLSX.utils.book_new()` + `book_append_sheet(wb, sheet, 'Training plan')`.

Return the workbook object (pure). A thin caller (`downloadPlanWorkbook`) does
`XLSX.writeFile(wb, filename)` so the pure builder stays test-friendly.

**Field formatting:**
- `date` → `formatWorkoutDate` (DD.MM.YYYY).
- `weekday` → `getWeekdayMeta(...).label`.
- `intensityZone` → `getIntensityZoneLabel(workout)`.
- everything else → the raw string value, `?? ''`.

**Filename:** `Training_plan_<athleteOrAll>_<start>_<end>.xlsx`, where athlete is
a filesystem-safe slug of the name (or `all` for all-athletes), dates are ISO.

## Data flow

Export button → `ExportPlanModal` (athlete + range + fields) → `runExport` →
`fetchWorkoutsOnce` per athlete → filter by date → `buildPlanWorkbook` →
`downloadPlanWorkbook` (browser download).

## Error handling

- start > end → Export disabled.
- no fields selected → Export disabled.
- no sessions in range → inline "No sessions in this range" (no file written).
- fetch failure → inline error text; modal stays open.

## Testing

Pure-function unit tests (Vitest, no Firebase mocking):
- `buildPlanWorkbook`: selected fields → correct headers & order; one row per
  workout; intensity/weekday/date formatting; athlete column prepended only when
  `includeAthleteColumn`; empty `selectedFieldKeys` handled.
- `weeksInDateRange`: a date range maps to the correct set of ISO week/year
  pairs (including a range crossing a year boundary).

## Out of scope

- Per-block row expansion (one row per session only).
- Scheduling / emailing the export.
- Import (round-trip editing back into the app).
