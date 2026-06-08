# Plan Builder rework — design

**Date:** 2026-06-08
**Status:** Approved (pending spec review)

## Problem

The admin Plan builder (`AdminPlanBuilder`) has an awkward layout:

- The left **session picker** splits sessions into Hard/Easy columns inside a 2-column
  grid. In the narrow columns, card titles wrap one character per line.
- The right side uses a bespoke flat list (`WeekCalendarList`/`CalendarPanel`) that does
  **not** match the standalone Week plan page (`WeekOverview`, timetable + charts).
- The picker supports multiple "windows" (tabs), which the user does not want.
- Each session card carries edit/delete buttons the user does not want in the picker.
- The activity-filter chips have overlapping icon/remove symbols.

## Goals

1. Right pane reuses the **exact** `WeekOverview` component (timetable + charts) — no
   duplicate week-rendering code — with drag-and-drop added.
2. Left pane is a single, naturally laid-out **searchable** session picker (responsive
   card grid), no Hard/Easy split.
3. Remove multi-window support entirely.
4. Remove edit/delete buttons from picker cards (keep add `+` and drag grip).
5. Fix overlapping activity-filter symbols.
6. Standalone Week plan tab (`PlanTab`) stays visually identical.
7. Keep the draggable panel resize handle between the two panes.

## Architecture

### Shared `WeekOverview` with optional drag/drop

`WeekOverview` (`src/components/AdminDashboard/WeekOverview.jsx`) currently renders a
view-only timetable + charts. It gains **optional** drag/drop props. When absent, render
is byte-for-byte identical to today (so `PlanTab` is untouched). When present, the
timetable becomes interactive:

New optional props:

- `onSelectWorkout` (already exists)
- `getDayDropZoneProps(weekdayValue)` → spread onto each `wo-col` (drop on a day)
- `getCellDropZoneProps(workout, weekdayValue)` → spread onto each `SessionCell`
  wrapper (drop before a session)
- `onWorkoutDragStart(workout, event)`, `onWorkoutDragEnd(event)` → makes cells draggable
- `isWorkoutDragging(workout)`, `isCellDropTarget(workout, weekdayValue)`,
  `isDayDropTarget(weekdayValue)` → visual highlight predicates

Drag is enabled when `onWorkoutDragStart` is provided. `SessionCell` already takes a
`workout`; it gains optional `draggable` + drag handlers + drop-zone props and a
`is-drag`/`is-target` class. The `wo-col` gains an `is-target` class when its day is the
end-of-day drop target.

`groupWorkoutsByWeekday` returns day objects with a `.value` (weekday key). The builder's
existing `useDragHandlers` already keys drops by `(weekday, beforeWorkoutId)`, so the
WeekOverview day `.value` maps directly onto the drop API — templates dropped on a day
call `onAddTemplateToDay`, existing workouts call `onMoveWorkoutByDrag`. No new drag
state machine is needed.

### Builder right pane

`CalendarPanel` is replaced by a thin wrapper that renders `WeekOverview` with the
drag/drop props wired from `useDragHandlers` + `useWeekData`. The following become dead
code and are **deleted**:

- `CalendarPanel.jsx`
- `WeekCalendarList.jsx`
- `BuilderWorkoutSlot.jsx`
- `WorkoutRow.jsx` (verify no other consumer first)

`buildPanelMap.jsx` is updated to render the WeekOverview wrapper for the `calendar`
panel. The `workoutLayout` calendar/list toggle is removed (single timetable view).

### Left pane — single searchable picker

- Delete `SessionColumn.jsx`. `BankPickerWindow` renders one responsive card grid
  (`grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))`) of `TemplateDragCard`s,
  replacing the Hard/Easy two-column split. This gives titles real width and fixes the
  one-char-per-line wrap.
- Add a **search input** at the top of the picker. Filters `templates` by title
  (case-insensitive, `localeCompare`/`toLowerCase` with `'nb'`), composed with the
  existing activity-tag and intensity-zone filters.
- **Remove multi-window:** drop the "Window" button and the entire add/remove-window
  plumbing — `handleAddBankWindow`, `handleRemoveBankWindow`, `bankWindows`, and the
  `windowNumber`/`canRemove`/`onRemove`/`isPrimary` props on `BankPickerWindow` (which
  becomes a single fixed picker). `BankPickerWindow` no longer needs the non-primary
  header.
- **Remove edit/delete** from `TemplateDragCard`: drop the `onEdit`/`onDelete` buttons and
  thread out the `onEditTemplate`/`onDeleteTemplate` props from `BankPanel` →
  `BankPickerWindow` → card. Keep the `+` add button and grip. "New template" button in
  the panel header stays.

### Activity-filter overlap fix

`.pb-filter-chip-wrap` / `.pb-filter-chip-remove` CSS is corrected so the remove `X` sits
as a trailing element next to the chip rather than overlapping the activity icon. Likely
an inline-flex wrap with a gap instead of absolute positioning.

## Out of scope

- No changes to the standalone `PlanTab` rendering (only `WeekOverview` gains opt-in
  props, defaulted off).
- No changes to charts logic, export, or week summary computation.
- No new persistence — picker search state is local component state.

## Testing

- `WorkoutForm/focus.test.jsx` and `weekSummary.test.js` already exist; run the suite.
- Add a test that `WeekOverview` without drag props renders no draggable attributes
  (regression guard for PlanTab).
- Add a test that the picker filters templates by search title.
- Manual: drag a template onto a day in the builder; drag an existing session between
  days; confirm charts update; confirm PlanTab unchanged.

## Files touched (summary)

Modified: `WeekOverview.jsx`, `WeekOverview.css`, `AdminPlanBuilder/index.jsx`,
`buildPanelMap.jsx`, `BankPanel.jsx`, `BankPickerWindow.jsx`, `TemplateDragCard.jsx`,
`BankActivityFilter` CSS, `usePlanCallbacks.js` (remove window logic),
`styles/bank.css`, `styles/card.css`.

Deleted: `CalendarPanel.jsx`, `WeekCalendarList.jsx`, `BuilderWorkoutSlot.jsx`,
`WorkoutRow.jsx`, `SessionColumn.jsx` (pending consumer check).
