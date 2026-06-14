# Plan-builder session picker: three scopes

## Problem

The plan builder's "Session picker" (`BankPickerWindow`) only shows the coach's
own bank (`templates`, the `templates` collection filtered by `ownerId`). Coaches
also have two other session libraries already used elsewhere in the app
(`BibliotekTab`):

- **Library** — the shared global library (`globalTemplates` collection, read by all).
- **Athlete** — the selected athlete's personal sessions (`athleteSessions`,
  scoped by `coachId` + `athleteId`).

We want the picker to let the coach pick sessions from all three, then drag/add
them into the plan exactly as today.

## Design

Add a **scope switcher** inside `BankPickerWindow`, mirroring `BibliotekTab`'s
three scopes (`My bank` / `Library` / `Athlete`). It selects which array the
existing filter/search/activity machinery operates on. The drag and add
callbacks are unchanged — they already take a plain session object, so a session
from any scope drops into the plan identically (it passes through
`normalizeWorkout` on add, as the athlete pool already does).

Default scope is **My bank** (preserves current behavior).

### Data wiring

`AdminDashboard` already loads all three sources:
- `templates` (coach bank) — already threaded to the builder.
- `globalTemplates` / `loadingGlobalTemplates` (via `useGlobalTemplates`) — thread
  into the builder.
- Athlete sessions — add a small `useAthleteSessions(coachId, athleteId)` hook in
  the builder hooks that wraps the existing `subscribeAthleteSessions`. Thread
  `coachId` (`userProfile.uid`) and `athleteId` (`selectedAthleteId`) in.

Prop chain: `AdminDashboard` → `TabContent` → `AdminPlanBuilder` → `buildPanelMap`
→ `BankPanel` → `BankPickerWindow`.

### Picker behavior

- Scope tab row (reusing the `bib-scope` pill styling) sits above the existing
  filter bar.
- The **Athlete** tab is hidden when no athlete is selected (the builder is always
  athlete-scoped, but guard anyway).
- Each scope feeds its own array into the existing
  `useSessionFilters`/`BankActivityFilter` flow. Switching scope resets the active
  activity-tag filter (different scopes have different activities present).
- Per-scope loading: while a scope's source is still loading, show the existing
  "Loading sessions…" copy in place of the grid.

### Out of scope (YAGNI)

- No create/edit/delete from non-bank scopes in the picker (matches `BibliotekTab`,
  which keeps curation on its own surfaces). The `New template` button stays as-is
  (it creates a coach-bank template).
- Quick-build tab keeps using the coach bank `templates` (unchanged).

## Testing

- Existing `BankPickerWindow.test.jsx` must still pass with only the `templates`
  prop (default scope = My bank).
- Add tests: scope switcher renders; switching to Library shows global sessions;
  switching to Athlete shows athlete sessions; Athlete tab hidden with no athlete.
