# Add session: choose existing or new

**Date:** 2026-06-13
**Status:** Approved

## Problem

In the plan builder, clicking a day's "+" (week view) or the per-day "+" (month
view) opens the custom-session form directly — it always *creates a new* session.
The coach has no inline way to drop an *existing* session-bank template onto that
specific day from the "+"; placing a template requires using the left bank panel
(drag, or its add button which targets a default day, not the clicked one).

## Goal

Clicking a day's "+" opens a small popover offering two choices:

- **Use existing…** — pick a template from the session bank, placed onto the
  clicked day. Reuses the exact bank picker visuals (`BankPickerWindow`).
- **Create new** — the current custom-session form, preset to the clicked day.

Applies to **both** the week view (`BuilderWeekPanel` / `WeekOverview`) and the
month view (`MonthGridPanel`).

## Decisions (from brainstorming)

- "Existing" means **session-bank templates** (the same things shown in the left
  bank panel), not arbitrary past planned sessions.
- The choice is a **small popover menu** anchored at the clicked "+".
- The template picker reuses the **exact same visuals as the left bank panel**
  (`BankPickerWindow`: filter bar, activity filter, `TemplateDragCard` grid).
- When the bank is empty (`templates.length === 0`), **hide "Use existing"** —
  the menu shows only "Create new".

## Architecture

### New component: `AddSessionMenu.jsx` (in `AdminPlanBuilder/`)

A small popover anchored at the clicked "+" button, with two states:

1. **Choice state** — two buttons:
   - "Use existing…" (omitted entirely when `templates.length === 0`)
   - "Create new"
2. **Picker state** — entered when "Use existing…" is clicked. The popover
   expands to render `BankPickerWindow` with the same props the left panel uses
   (templates, `visibleActivities`, activity add/remove). Clicking a card's "+"
   (`onAdd`) places that template on the target day and closes the popover.

Props (conceptual):

```
AddSessionMenu({
  anchorRect,            // position of the clicked "+"
  templates,
  visibleActivities, onAddActivity, onRemoveActivity,  // shared with left panel
  onCreateNew(),         // → existing create-new handler
  onPickTemplate(template), // → place template on the target day
  onClose(),
})
```

The popover owns no day context itself — the **panel** that opens it captures
the target day and supplies day-aware `onCreateNew` / `onPickTemplate` closures.

### Wiring: keep `onAddSessionToDay` as "create new"

`onAddSessionToDay` is already a clean "create new on this day" handler (used by
tests). We do **not** change its meaning. Instead the **panel** becomes the owner
of the menu:

- The panel tracks `openMenu` state: which day's "+" is open and its anchor rect.
- The "+" button now opens the menu instead of firing the create handler directly.
- The menu routes:
  - "Create new" → existing `onAddSessionToDay(weekday)` (week) /
    `onAddSessionToDay(week, year, weekday)` (month) — unchanged behavior.
  - "Use existing" → template pick →
    `onAddTemplateToDay(template, weekday)` (week) /
    `onAddTemplateToDayAcross(template, week, year, weekday)` (month).

`onAddTemplateToDay` / `onAddTemplateToDayAcross` and `templates` already exist at
the `AdminPlanBuilder` level (only the bank panel uses them today). They must be
threaded down into `BuilderWeekPanel` and `MonthGridPanel`, along with the shared
`visibleActivities` / activity add/remove callbacks from `useBuilderLayout`.

### Data flow

```
"+" click
  → panel sets openMenu = { weekday[, week, year], anchorRect }
AddSessionMenu renders:
  "Create new"   → onAddSessionToDay(...)                          → custom form
  "Use existing" → BankPickerWindow (filtered templates)
                     card "+"  → onAddTemplateToDay(template, day) → Firestore insert
  → onClose()  (menu closes)
```

## Behavior details

- **Empty bank:** "Use existing" hidden; only "Create new" shown.
- **Picker visuals:** `BankPickerWindow` reused as-is — no visual divergence from
  the left panel (filters, search, activity filter, cards).
- **Shared activity visibility:** the popover picker uses the same
  `visibleActivities` as the left panel so the two surfaces match.
- **Close triggers:** outside click, Escape, or after a successful add (either
  path).
- One extra click is introduced before the custom form (menu → "Create new").
  Accepted.

## Testing

- **`AddSessionMenu` unit test:**
  - Shows both options when `templates.length > 0`.
  - Hides "Use existing" when `templates.length === 0`.
  - "Create new" fires `onCreateNew`.
  - "Use existing" → renders the picker; clicking a card "+" fires
    `onPickTemplate` with that template.
  - Closes on Escape and outside-click.
- **`WeekOverview` / `MonthGridPanel`:** the "+" now opens the menu rather than
  firing the create handler directly. Existing tests asserting
  `onAddSessionToDay` is called on "+" click must be updated to click through
  "Create new".

## Out of scope (YAGNI)

- Picking from arbitrary past planned sessions (only bank templates).
- Modal/dialog presentation (popover only).
- Multi-template select in one open (one template per open; reopen to add more).
