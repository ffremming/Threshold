# Month grid — destination preview when moving multiple sessions

**Date:** 2026-06-08
**Status:** Approved

## Goal

While dragging a multi-cell selection across the month grid, show a live ghost of
each selected session in the slot it would land in (anchored to the hovered cell),
dim the original sessions, and replace the native cursor clone with a custom
follower that **hides when the pointer is over a valid slot** and shows while the
pointer is between slots.

## Decisions (from brainstorming)

- **Preview style:** dashed, dimmed ghost chips in each destination slot + dim the
  originals (~40%).
- **Cursor clone:** custom cursor-follower (native drag image suppressed for
  selection drags). Visible between slots; hidden once over a valid slot where
  destination ghosts render.
- **Occupied destination days:** ghost appends **below** the day's existing
  sessions (matches the real move, which adds rather than replaces).
- **Off-grid destinations:** simply skip ghosts for destinations outside the
  visible window. The real move still places them.

## Architecture — reuse the move math

`moveSelection` already shifts each selected session by `targetIndex - anchorIndex`
(`anchorIndex` = min day-index of selected cells). The preview MUST use the same
math so it can't disagree with the result.

### New pure helper — `previewMoves` in `useMonthSelection.js`

```
previewMoves(targetWeek, targetYear, targetWeekday) → [
  { session, week, year, weekday }   // destination for each selected session
]
```

Built exactly like `moveSelection`: read selected cells, compute `anchorIndex`,
`targetIndex = getDayIndex(target...)`, and for each session in each selected cell
map to `getCellFromDayIndex(targetIndex + (cell.index - anchorIndex))`. Returns the
session plus its destination (week, year, weekday). No writes.

### Hook state / exposed API

- `selectionPreview`: `{ [cellKey]: [{ session }] }` — destination ghosts grouped
  by destination cell. Derived from `previewMoves(hoverCell)` when
  `isDraggingSelection()` and `hoverCell` are both set; else `{}`.
- `isGhostingSession(week, year, weekday, id)`: true when that *original* session
  is part of the active selection drag (so it dims). Equivalent to: drag active,
  hover set, and the session lives in a selected cell.
- `dragCursor`: `{ x, y } | null` — last cursor position during a selection drag,
  for the follower. Updated on `drag`/`dragover`. Null when over a slot
  (`hoverCell` set) so the follower hides.

`hoverCell` must update during native DnD: pointer events don't fire mid-drag, so
set hover on each cell's `onDragOver` (in addition to the existing `onPointerEnter`).
Clearing: `endSelectionDrag()` resets `hoverCell`, `selectionPreview`, `dragCursor`.

## Rendering — `MonthGridPanel.jsx`

- **Destination ghosts:** inside each day cell, after the real chips, render a
  `MonthGhostChip` for each entry in `selectionPreview[cellKey]`. Dashed border,
  ~45% opacity, same zone fill/bar, `aria-hidden`, non-interactive. Off-window
  destinations have no cell → naturally skipped.
- **Dimmed originals:** real chips whose session `isGhostingSession(...)` get an
  `is-ghosting` class (~40% opacity).
- **Custom follower:** suppress the native drag image at selection dragstart (set a
  transparent 1×1 image). Render a fixed-position follower (a stack of the selected
  sessions' cards) at `dragCursor`; hide it when `dragCursor` is null (pointer over
  a slot). Reuse the card markup from `MonthGhostChip`/existing ghost styles.

### `MonthGhostChip` (new, small)

Presentational: takes `session`, renders the same title + icon + zone fill/bar as
`MonthChip`, but dashed + dimmed, no buttons, `aria-hidden`. Used both for the
in-cell destination ghosts and (stacked) for the cursor follower.

## Edge cases

- Occupied destination day → ghost appended below existing chips.
- Off-window destination → skipped.
- Drag end / drop → all preview state cleared via `endSelectionDrag`.
- Single-session and week-view drags are unaffected (native image path unchanged
  for non-selection drags).

## Testing

- **`previewMoves` (pure unit):** single cell offset; multi-cell preserves shape;
  anchor = earliest cell; cross-week/cross-year offsets via `getDayIndex`.
- **Component:** simulate a selection drag, fire `dragOver` on a destination cell,
  assert ghost chips render in the correct destination cells and originals carry
  `is-ghosting`; assert the follower hides when a cell is hovered.
