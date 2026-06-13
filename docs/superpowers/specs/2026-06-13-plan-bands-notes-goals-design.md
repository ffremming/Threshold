# Plan Bands, Post-it Notes & Competitions — Design

**Date:** 2026-06-13
**Status:** Approved (design), pending implementation
**Scope:** Three new annotation layers for the training planner (month + week views): focus/phase **bands**, free-floating **post-it notes**, and first-class **competitions/goals**.

## Goal

Let coaches and athletes annotate the training plan with:

1. **Bands** — colored time-range bands marking phases and focus (recovery, race day, buildup, taper, volume build, vo2max focus, threshold focus, race specificity, testing, peak). One unified mechanism; type picked from a preset palette plus a custom escape hatch.
2. **Notes** — post-it-style comments anchored to a session or a day-range, with a free drag-offset for the scattered-sticky feel. Author (coach/athlete) is recorded and shown.
3. **Competitions/Goals** — first-class race/goal markers on a date, weighted by priority (A/B/C), carrying sport and a target/result.

All three work identically in the **month** (multi-week grid) and **week** (single-week timetable) views, and are created from a **right-click context menu** — either on a session or after drag-selecting a day-range.

## Non-goals

- No new top-level Firestore collections (all three live on one per-athlete plan doc).
- No status workflow for goals (completion is inferred from date + result).
- No threaded replies on notes (single body per note).
- No band-driven automation (bands don't change session data).

## Data model

One Firestore doc per athlete: **`plans/{athleteId}`**, loaded with a single real-time `onSnapshot`. Holds three arrays. All dates are `'YYYY-MM-DD'` strings (local calendar dates, consistent with how the grid maps cells).

```js
// plans/{athleteId}
{
  athleteId: string,

  bands: [{
    id: string,                 // crypto.randomUUID()
    type: string,               // 'recovery' | 'raceDay' | 'buildup' | 'taper'
                                //  | 'volume' | 'vo2max' | 'threshold'
                                //  | 'raceSpecificity' | 'testing' | 'peak' | 'custom'
    label: string,              // preset default or custom text
    color: string,              // hex; preset default or custom-picked
    startDate: 'YYYY-MM-DD',
    endDate: 'YYYY-MM-DD',      // === startDate for a 1-day band
    createdAt: number, updatedAt: number
  }],

  notes: [{
    id: string,
    body: string,
    anchor: { kind: 'session', sessionId: string }
          | { kind: 'range', startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' },
    offset: { dx: number, dy: number },   // px nudge from the anchor's render point
    color: string,                        // post-it tint (default per author)
    author: 'coach' | 'athlete',
    createdAt: number, updatedAt: number
  }],

  goals: [{
    id: string,
    name: string,               // "Oslo Marathon"
    date: 'YYYY-MM-DD',
    priority: 'A' | 'B' | 'C',
    sport: string,              // existing activity tag (run/bike/swim/…)
    target: string,             // free-text aim: "sub-3:00", "top 10"
    result: string,             // '' until filled in afterward
    createdAt: number, updatedAt: number
  }],

  updatedAt: number
}
```

Notes on the model:

- **Timestamps** are `Date.now()` numbers set at write time (not `serverTimestamp()`), because they live inside arrays on one doc — array-element server timestamps aren't supported. The doc-level `updatedAt` uses `serverTimestamp()`.
- **Goal completion** is inferred: `date < today` ⇒ past (dimmed); `result !== ''` ⇒ show result. No `status` field.
- **Band type palette** lives in a shared constants module (`planTypes.js`) so the create-menu, the band track, and any editors read one source. `custom` bands carry their own `label`/`color`.

### Storage / write strategy

Reads: one `onSnapshot(doc(db, 'plans', athleteId))`. Missing doc ⇒ treated as empty `{ bands: [], notes: [], goals: [] }`.

Writes: all mutations are array edits on the single doc via `setDoc(..., { merge: true })` (creating the doc on first write) wrapped in `withDatabaseWriteLimit('plans', …)`, mirroring the existing rate-limit pattern. Helpers: `upsertBand`, `removeBand`, `upsertNote`, `removeNote`, `upsertGoal`, `removeGoal` — each reads current array from the in-memory plan, applies the change immutably, and writes the whole array back. Concurrency is acceptable for the expected single-coach-edits-one-athlete usage; last-write-wins on the array.

## Architecture / components

```
App (index.jsx)
└─ usePlan(viewedAthleteId) → { plan, planActions, planLoading }   ← NEW hook, sibling of useWorkouts
   plan: { bands, notes, goals }
   planActions: { upsertBand, removeBand, upsertNote, removeNote, upsertGoal, removeGoal }
   │  threaded down through adminScreenProps → AdminDashboard → AdminPlanBuilder → buildPanelMap
   │
   ├─ planGeometry.js (NEW, pure util)
   │    dateToColumn(date, weekMonday) → 0..6 | null (outside week)
   │    rangeToSpan({startDate,endDate}, weekMonday) → { startCol, endCol, openLeft, openRight } | null
   │    packLanes(items) → items annotated with { lane } (greedy interval packing)
   │
   ├─ PlanAnnotations (NEW shared component)  ← renders ONE week's strip
   │    props: { weekMonday, weekSunday, bands, goals, notes, sessions, planActions, view }
   │    ├─ GoalStrip   — priority-weighted markers in the top strip
   │    ├─ BandTrack   — lane-packed band pills below the goal strip
   │    └─ NoteLayer   — post-it cards positioned at anchor+offset, draggable
   │
   ├─ MonthGridPanel.jsx  — renders <PlanAnnotations view="month"> per week row, above day cells
   └─ WeekOverview.jsx    — renders <PlanAnnotations view="week"> once, above the day columns
```

### Vertical stack per week (both views)

```
┌─ Goal strip   (priority-weighted competition markers) ─┐
├─ Band lanes   (greedy-packed phase/focus pills)        ┤
├─ Day cells    (sessions — UNCHANGED)                   ┤
└─ Week summary (UNCHANGED)                              ┘
```
Goals and bands never compete for the same space; sessions are untouched.

### Geometry (`planGeometry.js`)

Pure functions, unit-tested in isolation. A week is defined by its Monday date. For each annotation:

- `dateToColumn(date, weekMonday)` → integer 0..6 (Mon..Sun) or `null` if outside the week.
- `rangeToSpan(range, weekMonday)` → `{ startCol, endCol, openLeft, openRight }` clipped to the visible Mon..Sun span. `openLeft/openRight` flag a band that continues past the week edge (rendered with a flush/open end).
- `packLanes(spans)` → assigns each span a `lane` index via greedy first-fit so non-overlapping bands share a row. Used per-week (month) and once (week view).

Column positions become CSS percentages over the 7 day-columns, reusing the same column math the grid cells already use (`grid-template-columns: … repeat(7, …)`).

### Notes positioning

A note renders at `anchorPoint + offset`:
- `kind: 'session'` → anchorPoint = that session chip's cell; a 📝 marker shows on the chip when the note is collapsed.
- `kind: 'range'` → anchorPoint = the start column of its range in the band track.

Dragging a note updates `offset` (committed on drag end via `upsertNote`). Click toggles expand/edit; click-out collapses. Because the anchor is always a time reference (not raw x/y), the note finds its place in *both* layouts; only the nudge offset is shared.

## Interaction / creation flow

Extends the existing right-click `SelectionContextMenu` in `MonthGridPanel.jsx` (and an equivalent in the week view).

- **Right-click a session chip** → menu includes existing Copy/Cut (when selected) **plus** "Add note here" (anchors a note to that session).
- **Drag-select a day-range, then right-click** → menu: "Add band…", "Add note…", "Add competition…". The selected day-span supplies the range (or the start day for a competition).
- **Marquee day-range capture:** `useMonthSelection.beginMarquee` already tracks the rectangle. It will additionally compute the **day-span** the rectangle touches (first day → last day) by intersecting against day cells (which carry `data-week/data-year/data-weekday`, added if missing), exposed as `sel.selectedDayRange`. Session selection for move/copy is unchanged — the day-range is an additional output of the same gesture.

Editors (small popovers, positioned `fixed` like the existing context menu):
- **Band editor:** type picker (preset palette swatches + "Custom…"), label, color, date range (prefilled from selection).
- **Note editor:** body textarea, color, author (defaulted from current user role).
- **Goal editor:** name, date, priority A/B/C, sport (activity-tag picker), target, result.

## Styling

New CSS in `src/components/AdminPlanBuilder/styles/annotations.css` (imported alongside `month.css`), using existing design tokens (`--th-accent`, `--th-surface`, `--th-line`, `--th-ink`, radius/space vars). Band/goal type colors come from `planTypes.js`. Post-it cards get a soft shadow + slight rotation for the sticky feel; framer-motion (already in the project) handles popover enter/exit. Week-view variants reuse the same classes with a `view="week"` modifier where column widths differ.

## Error handling

- Missing/never-created plan doc → render as empty; first write creates it via `setDoc(merge)`.
- Write failures (incl. rate limit) → surface via the existing error path used by workout writes; the optimistic array edit reverts on the next snapshot (source of truth remains Firestore).
- A note whose `anchor.kind==='session'` references a deleted session → the note still renders at its range fallback (its createdAt-week) or is hidden if unresolvable; never crashes. (Implementation: resolve session → if absent, skip rendering that note's marker but keep the data.)
- Geometry functions return `null` for out-of-week dates; callers skip rendering rather than clamping incorrectly.

## Testing

- **`planGeometry.test.js`** — `dateToColumn` (in/out of week, week boundaries, year rollover), `rangeToSpan` (full week, partial, 1-day, open-left/right clipping), `packLanes` (overlap → separate lanes, gaps → shared lane).
- **`planTypes.test.js`** — palette completeness, default colors present, custom type handling.
- **`usePlan` actions** — upsert/remove for each array produce correct immutable next-state (test the pure reducer functions extracted from the hook).
- **`PlanAnnotations` render** — bands/goals/notes appear in the right strip; priority weighting class applied; note marker shows on session.
- **Marquee day-range** — `useMonthSelection` exposes `selectedDayRange` matching the dragged span (extend existing `MonthSelection.test.jsx`).
- **Context menu** — new items appear and invoke the right editor with prefilled range.

## File inventory

**New:**
- `src/utils/planTypes.js` — band/goal type palette + colors.
- `src/utils/planGeometry.js` — date→column, range→span, lane packing.
- `src/App/hooks/usePlan.js` — Firestore plan doc subscription + action helpers.
- `src/components/AdminPlanBuilder/PlanAnnotations.jsx` — strip orchestrator.
- `src/components/AdminPlanBuilder/GoalStrip.jsx`, `BandTrack.jsx`, `NoteLayer.jsx`.
- `src/components/AdminPlanBuilder/editors/BandEditor.jsx`, `NoteEditor.jsx`, `GoalEditor.jsx`.
- `src/components/AdminPlanBuilder/styles/annotations.css`.
- Tests as listed above.

**Modified:**
- `src/App/index.jsx` — call `usePlan`, thread plan + actions into `adminScreenProps`.
- `src/components/AdminPlanBuilder/MonthGridPanel.jsx` — render `PlanAnnotations` per week row; extend context menu.
- `src/components/AdminDashboard/WeekOverview.jsx` — render `PlanAnnotations` above day columns.
- `src/components/AdminPlanBuilder/useMonthSelection.js` — expose `selectedDayRange` from the marquee.
- `src/components/AdminPlanBuilder/buildPanelMap.jsx` — pass plan + actions down.
- Day-cell markup — ensure `data-week/data-year/data-weekday` present for day-range hit-testing.
