# Plan builder — Ctrl/Cmd+Z undo

**Date:** 2026-06-08
**Status:** Proposed (awaiting approval)

## Goal

`Ctrl/Cmd+Z` in the plan builder undoes the **last** plan change: delete, paste,
move/drag, or add-from-picker/+. Single-step (only the most recent action),
no redo.

## Approach: compensating actions

Every change is already persisted to Firestore, so "undo" is a **reverse write**,
not in-memory state rollback. Each undoable action, at the moment it commits,
pushes a single **undo entry** = a function that performs the inverse, plus a
label. The undo slot holds only the latest entry (single-step). `Ctrl/Cmd+Z`
runs it, then clears the slot.

Inverses per action:

| Action | Forward | Undo (inverse) |
|---|---|---|
| Delete session | `deleteDoc(id)` | recreate the session from its captured fields (new id) |
| Paste sessions | create N docs (batch) | delete those N created docs (batch) |
| Add from picker / + | create 1 doc | delete that created doc |
| Move / drag (single) | update day/week/order | update back to original day/week/order |
| Multi-move (selection) | batch update N | batch update N back to originals |

To make inverses possible, the forward actions must **return identifiers /
capture prior state**:

- Create-type actions (`addTemplateToDayAcross`, `addManySessions`,
  `addWorkoutToWeek`/custom add) return the **new doc id(s)**. Undo deletes them.
- `handleDeleteWorkout` captures the full workout object before deleting. Undo
  re-creates it (reusing `addWorkoutToWeek`-style write). New id is fine — nothing
  external keys off a workout id (verified: only transient drag UI uses it).
- Move actions capture each moved workout's **prior** `{week, year, weekday,
  order}` before writing. Undo writes those back (batched).

All inverse writes go through `withDatabaseWriteLimit` in a **single commit**
each (same batching as the rate-limit fix) so undo itself can't trip the limiter.

## State & wiring

New `useUndo` hook (in `AdminDashboard/` since the write actions live there):

- `undoEntryRef` — holds `{ label, run: async () => {...} } | null`.
- `pushUndo(entry)` — sets the slot (replacing any prior entry).
- `undo()` — if an entry exists and not already running, run it, clear the slot.
- A `keydown` listener (bound while the builder is mounted) fires `undo()` on
  `Cmd/Ctrl+Z` (not Shift — that's reserved for future redo). Ignored while
  typing in an input/textarea/contenteditable or when a modal/form is open
  (same guard style as copy/paste).

`pushUndo` is threaded into the action factories (`useAdminActions` ctx) so each
forward action registers its inverse:

- `createWorkoutCrud` — `handleDeleteWorkout` captures the workout, deletes,
  then `pushUndo(recreate)`.
- `createTemplateInsertActions` — `addTemplateToDayAcross`, `addManySessions`,
  `handleAddCustom` capture created ids, then `pushUndo(deleteCreated)`.
- `createMoveActions` — `moveWorkoutAcross`, `moveManyWorkouts` capture prior
  positions, then `pushUndo(restorePositions)`.

The builder is keyboard-only and active wherever the builder tab is shown (works
in both Week and Month views). The undo slot is per-session/in-memory; navigating
away or reloading clears it.

## Edge cases

- **No-op forward actions don't register undo.** E.g. a move that's a no-op
  (dropped on its own spot) pushes nothing.
- **Stale ids on undo of a move**: if the moved doc was deleted in the meantime,
  the restore update fails silently (caught, slot cleared). Acceptable — single
  step, rare.
- **Undo of a delete creates a new id**: expected; surfaced nowhere problematic.
- Errors during undo go through the existing `reportActionError` alert.

## Out of scope

- Redo (`Cmd/Shift+Z`).
- Multi-step history.
- Undo for template/library edits, completion toggles, comments (only the four
  plan-edit actions listed).
- A visible undo button / toast (keyboard-only; a small "Undid X" log line is
  optional polish, not required).

## Testing

- `useUndo`: `pushUndo` then `Cmd+Z` runs the entry once and clears it; a second
  `Cmd+Z` is a no-op; ignored while typing in an input.
- Delete→undo: `handleDeleteWorkout` registers an inverse that recreates the
  session (one commit) with the original fields/day.
- Paste→undo: `addManySessions` returns/captures created ids; undo deletes
  exactly those in one commit.
- Move→undo: `moveWorkoutAcross` captures prior position; undo restores
  week/year/weekday/order.
- Existing suite stays green.
