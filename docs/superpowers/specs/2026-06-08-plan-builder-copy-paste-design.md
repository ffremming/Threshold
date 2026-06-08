# Plan builder — Excel-style selection, copy / paste, multi-move

**Date:** 2026-06-08
**Status:** Proposed (awaiting approval)

## Goal

Let a coach select sessions with a drag rectangle (like Excel), then copy/paste
or move them around the plan — including across days and weeks.

## Agreed behavior

- **Marquee selection**: dragging a rectangle over the calendar selects every
  **day-cell** the rectangle intersects (and thereby all sessions in those cells).
  Selection is a set of cells, each identified by `(week, year, weekday)`.
- **Copy / paste**: `Cmd/Ctrl+C` copies all sessions in the selected cells.
  `Cmd/Ctrl+V` pastes them **anchored to the target day**: the top-left cell of
  the selection maps to the day the pointer is over, and the other cells shift by
  the same (week, weekday) offset — Excel range-paste semantics. Each pasted
  session keeps its **time**. Paste is **additive** (never deletes existing).
- **Move**: two ways, both kept —
  1. existing **grab-a-chip-and-drag** for a single session, and
  2. **drag the highlighted selection** to move all selected cells at once,
     anchored to the drop day the same way paste is anchored.
- Where this lives: the **Month view** grid is the primary surface (multi-week).
  The Week view keeps its current single-session drag; marquee/selection is a
  Month-view feature (the Week view has only one week, limiting its value, and
  this avoids disturbing the working week DnD).

## Selection model

State (owned by `AdminPlanBuilder`, scoped to the Month view):

- `selectedCells`: `Set<cellKey>` where `cellKey = "${year}-${week}-${weekday}"`.
- `marquee`: `{ startX, startY, curX, curY }` while a rectangle drag is active,
  else null. Rendered as an absolutely-positioned box over the grid.
- `clipboard`: `{ cells: [{ week, year, weekday, sessions: [payload...] }],
  anchor: { week, year, weekday } }` — captured on copy. In-memory only.
- `hoverCell`: `{ week, year, weekday }` — last day cell the pointer entered;
  the paste/selection-drag destination.

### Drawing the marquee

- The month grid gets `onPointerDown` on its **background** (not on a chip): begin
  a marquee at the pointer. `onPointerMove` (window-level while active) updates the
  rectangle; `onPointerUp` finalizes.
- On each move, compute which day-cells intersect the rectangle (cell rects via
  `getBoundingClientRect`, gathered once at drag start) → that's `selectedCells`.
- Pointer-down **on a session chip** does NOT start a marquee — it begins the
  existing chip drag (move one). Pointer-down on the **selection** (a highlighted
  cell) begins a selection-move drag instead. So:
  - empty grid background → marquee
  - a chip in an unselected cell → move that one session (existing behavior)
  - a highlighted (selected) cell → drag the whole selection

### Selected styling

Selected cells get `is-selected` (a tinted background + accent outline). The
marquee box is a semi-transparent accent rectangle.

## Copy / paste / move executors (reuse existing write logic)

All three reuse the week-aware writers already built for the month view; no new
ordering logic is invented.

- **Copy** (`Cmd+C`): snapshot every session in `selectedCells` into `clipboard`,
  with the selection's top-left cell as `anchor`. `payload` = session minus
  identity/runtime fields (`id`, `createdAt`, `updatedAt`, `completed*`,
  `userComment*`) — same fields `addTemplateToDayAcross` already strips.
- **Paste** (`Cmd+V`): for each clipboard cell, compute its offset from `anchor`
  in (weeks, weekdays); apply that offset to `hoverCell` to get the destination
  (week, year, weekday); call `addTemplateToDayAcross(payload, destWeek, destYear,
  destWeekday)` for each session, preserving `time`. Weekday offset that runs past
  Sunday rolls into the next week (offset is computed on an absolute
  week*7+weekday index, then mapped back). Additive — existing sessions stay.
- **Selection move** (drag the highlighted block): same offset math, but instead
  of creating copies it **moves** each session via `moveWorkoutAcross`
  (the existing week-aware move) to the offset destination. Batched per session.

`Cmd+C`/`Cmd+V` are ignored while focus is in an input/textarea/contenteditable
or a modal is open, so normal copy/paste isn't hijacked. Empty selection / empty
clipboard / no hover target → no-op.

## Architecture & wiring

- New `useMonthSelection` hook in `AdminPlanBuilder/`: owns `selectedCells`,
  `marquee`, `clipboard`, `hoverCell`; exposes `beginMarquee`, the window
  pointer handlers, `setHoverCell`, `isCellSelected(cellKey)`, and `copy()`,
  `paste()`, `moveSelection()` executors plus the keydown binding.
- `MonthGridPanel` consumes it: grid background `onPointerDown` → `beginMarquee`;
  each cell `onPointerEnter` → `setHoverCell`; cells read `isCellSelected`;
  renders the marquee `<div>`. The selection-drag uses the same
  `makeDropZoneProps` drop targets already present.
- Offset helper in `utils/week.js` (or weekday.js): `weekdayIndex(week, year,
  weekday)` → absolute day index using existing `getWeekOffsetFromAnchor`, and the
  inverse to map an index back to `(week, year, weekday)`. This makes
  "anchor to target + preserve offsets, rolling across weeks" correct.

## Out of scope

- Marquee/selection in the **Week view** (Month view only).
- On-element copy/paste buttons (keyboard-only).
- System-clipboard / cross-tab / cross-athlete paste.
- Replacing the existing single-chip drag (we keep it).
- Whole-week "replace" paste (paste is always additive).

## Testing

- Offset helpers: round-trip `index(week,year,weekday)` ↔ `fromIndex`; weekday
  rollover across week/year boundaries.
- `useMonthSelection`: marquee over a set of cell rects yields the right
  `selectedCells`; `Cmd+C` fills clipboard from selected sessions with correct
  anchor; `Cmd+V` over a hover cell calls the paste executor with destinations
  offset from the anchor; ignored while typing in an input.
- Paste executor: copy 3 cells (Mon W21, Tue W21, Mon W22), paste onto Thu W24 →
  inserter called for Thu W24, Fri W24, Thu W25 (offsets preserved, additive).
- Selection-move executor: same offsets but calls `moveWorkoutAcross`.
- Existing suite stays green.
