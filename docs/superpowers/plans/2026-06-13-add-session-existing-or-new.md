# Add Session: Existing-or-New Choice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking a day's "+" in the plan builder (week and month views) opens a small popover offering "Use existing…" (pick a session-bank template, reusing the bank picker visuals) or "Create new" (the current custom-session form).

**Architecture:** A new `AddSessionMenu` popover (built on the existing `EditorPopover` anchor primitive) is owned by each calendar panel. The panel tracks which day's "+" is open and its anchor point, then routes "Create new" to the existing `onAddSessionToDay` handler and "Use existing" → template pick to the existing `onAddTemplateToDay` / `onAddTemplateToDayAcross` handlers. The picker state embeds the unchanged `BankPickerWindow` for identical visuals.

**Tech Stack:** React (function components + hooks), Vitest + @testing-library/react, existing `EditorPopover` / `BankPickerWindow` components.

---

## File Structure

- **Create:** `src/components/AdminPlanBuilder/AddSessionMenu.jsx` — the popover (choice + picker states).
- **Create:** `src/components/AdminPlanBuilder/AddSessionMenu.test.jsx` — unit tests.
- **Modify:** `src/components/AdminDashboard/WeekOverview.jsx` — pass the click event through `onAddSessionToDay` so the panel can anchor the popover.
- **Modify:** `src/components/AdminDashboard/WeekOverview.test.jsx` — update the "+" test to pass/expect the event arg.
- **Modify:** `src/components/AdminPlanBuilder/BuilderWeekPanel.jsx` — own the menu for week view; thread `templates` + activity props.
- **Modify:** `src/components/AdminPlanBuilder/MonthGridPanel.jsx` — own the menu for month view; thread `templates` + activity props.
- **Modify:** `src/components/AdminPlanBuilder/buildPanelMap.jsx` — pass `templates`, `onAddTemplateToDay`, `onAddTemplateToDayAcross`, `visibleActivities`, `addVisibleActivity`, `removeVisibleActivity` into the calendar panels.
- **Modify:** `src/components/AdminPlanBuilder/index.jsx` — forward `onAddTemplateToDay` and activity props into `buildPanelMap`.
- **Modify:** `src/components/AdminPlanBuilder/styles/index.css` — styles for the menu choice buttons and wide picker popover.
- **Reuse (no change):** `src/components/AdminPlanBuilder/editors/EditorPopover.jsx`, `src/components/AdminPlanBuilder/BankPickerWindow.jsx`.

### Handler signatures (verified, do not change)

- `onAddSessionToDay(weekday)` — week view "create new". (After Task 1 also receives the originating click event as 2nd arg; see Task 2.)
- `onAddSessionToDayAcross(week, year, weekday)` — month view "create new".
- `onAddTemplateToDay(template, weekday)` — place a template on a day in the current week.
- `onAddTemplateToDayAcross(template, week, year, weekday)` — place a template on a day in any week.

All four already exist at the `AdminPlanBuilder` level (`index.jsx` props) and are wired from `TabContent.jsx`.

---

## Task 1: AddSessionMenu component — choice state

**Files:**
- Create: `src/components/AdminPlanBuilder/AddSessionMenu.jsx`
- Test: `src/components/AdminPlanBuilder/AddSessionMenu.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/AdminPlanBuilder/AddSessionMenu.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AddSessionMenu from './AddSessionMenu'

const baseProps = (overrides = {}) => ({
  at: { x: 100, y: 100 },
  templates: [{ id: 't1', title: 'Easy run', activityTag: 'running', type: 'easy' }],
  visibleActivities: ['running'],
  onAddActivity: vi.fn(),
  onRemoveActivity: vi.fn(),
  onCreateNew: vi.fn(),
  onPickTemplate: vi.fn(),
  onClose: vi.fn(),
  ...overrides,
})

describe('AddSessionMenu', () => {
  it('shows both choices when templates exist', () => {
    render(<AddSessionMenu {...baseProps()} />)
    expect(screen.getByRole('button', { name: /use existing/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create new/i })).toBeInTheDocument()
  })

  it('hides "Use existing" when the bank is empty', () => {
    render(<AddSessionMenu {...baseProps({ templates: [] })} />)
    expect(screen.queryByRole('button', { name: /use existing/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create new/i })).toBeInTheDocument()
  })

  it('fires onCreateNew and closes when "Create new" clicked', () => {
    const onCreateNew = vi.fn()
    const onClose = vi.fn()
    render(<AddSessionMenu {...baseProps({ onCreateNew, onClose })} />)
    fireEvent.click(screen.getByRole('button', { name: /create new/i }))
    expect(onCreateNew).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/AdminPlanBuilder/AddSessionMenu.test.jsx`
Expected: FAIL — cannot resolve `./AddSessionMenu`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/components/AdminPlanBuilder/AddSessionMenu.jsx
import { useState } from 'react'
import { Plus, Layers } from 'lucide-react'
import EditorPopover from './editors/EditorPopover'
import BankPickerWindow from './BankPickerWindow'

// Anchored popover for the per-day "+" in the plan builder. Two states:
//  - choice:  "Use existing…" (only when templates exist) / "Create new"
//  - picker:  embeds the exact bank picker; clicking a card places that template
// The popover owns no day context — the panel supplies day-aware callbacks.
export default function AddSessionMenu({
  at,
  templates,
  visibleActivities,
  onAddActivity,
  onRemoveActivity,
  onCreateNew,
  onPickTemplate,
  onClose,
}) {
  const [picking, setPicking] = useState(false)
  const hasTemplates = templates.length > 0

  function createNew() {
    onCreateNew()
    onClose()
  }

  function pick(template) {
    onPickTemplate(template)
    onClose()
  }

  return (
    <EditorPopover at={at} onClose={onClose} width={picking ? 420 : 220}>
      {picking ? (
        <div className="pb-add-menu-picker">
          <BankPickerWindow
            templates={templates}
            onDragStart={() => {}}
            onDragEnd={() => {}}
            onAddTemplate={pick}
            visibleActivities={visibleActivities}
            onAddActivity={onAddActivity}
            onRemoveActivity={onRemoveActivity}
          />
        </div>
      ) : (
        <div className="pb-add-menu">
          {hasTemplates && (
            <button type="button" className="pb-add-menu-item" onClick={() => setPicking(true)}>
              <Layers className="pb-btn-icon" aria-hidden="true" strokeWidth={2} />
              Use existing…
            </button>
          )}
          <button type="button" className="pb-add-menu-item" onClick={createNew}>
            <Plus className="pb-btn-icon" aria-hidden="true" strokeWidth={2} />
            Create new
          </button>
        </div>
      )}
    </EditorPopover>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/AdminPlanBuilder/AddSessionMenu.test.jsx`
Expected: PASS (3 tests).

---

## Task 2: AddSessionMenu — picker state test

**Files:**
- Modify: `src/components/AdminPlanBuilder/AddSessionMenu.test.jsx`

- [ ] **Step 1: Add the failing test**

Append inside the `describe` block:

```jsx
  it('shows the picker after "Use existing" and places a clicked template', () => {
    const onPickTemplate = vi.fn()
    const onClose = vi.fn()
    render(<AddSessionMenu {...baseProps({ onPickTemplate, onClose })} />)
    fireEvent.click(screen.getByRole('button', { name: /use existing/i }))
    // The picker shows the template card with an "Add … to plan" button.
    const addBtn = screen.getByRole('button', { name: /add easy run to plan/i })
    fireEvent.click(addBtn)
    expect(onPickTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1' })
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/components/AdminPlanBuilder/AddSessionMenu.test.jsx`
Expected: PASS (4 tests). The implementation from Task 1 already supports this — `TemplateDragCard`'s add button has `aria-label={`Add ${session.title} to plan`}` and calls `onAddTemplate(session)` which maps to `pick`.

> If this test fails because the card's add button is not found, confirm `BankPickerWindow` passes `onAddTemplate` through to `TemplateDragCard`'s `onAdd` (it does at `BankPickerWindow.jsx:79`). No code change needed — fix the selector to match the real `aria-label` rather than altering source.

---

## Task 3: WeekOverview — pass the click event through "+"

**Files:**
- Modify: `src/components/AdminDashboard/WeekOverview.jsx:237`
- Modify: `src/components/AdminDashboard/WeekOverview.test.jsx:102`

- [ ] **Step 1: Update the WeekOverview test to expect the event arg**

In `src/components/AdminDashboard/WeekOverview.test.jsx`, change the assertion at the end of the "renders an add +" test from:

```jsx
    expect(onAddSessionToDay).toHaveBeenCalledWith(1)
```

to:

```jsx
    expect(onAddSessionToDay).toHaveBeenCalledWith(1, expect.anything())
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/AdminDashboard/WeekOverview.test.jsx`
Expected: FAIL — called with `(1)` not `(1, <event>)`.

- [ ] **Step 3: Pass the event through in WeekOverview**

In `src/components/AdminDashboard/WeekOverview.jsx`, change the add button's onClick at line ~237 from:

```jsx
                  onClick={() => dnd.onAddSessionToDay(day.value)}
```

to:

```jsx
                  onClick={event => dnd.onAddSessionToDay(day.value, event)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/AdminDashboard/WeekOverview.test.jsx`
Expected: PASS.

---

## Task 4: BuilderWeekPanel — own the AddSessionMenu

**Files:**
- Modify: `src/components/AdminPlanBuilder/BuilderWeekPanel.jsx`

- [ ] **Step 1: Add menu state + new props**

In `BuilderWeekPanel.jsx`, extend the props destructure (after `onAddSessionToDay,`) to add:

```jsx
  onAddTemplateToDay,
  templates,
  visibleActivities,
  addVisibleActivity,
  removeVisibleActivity,
```

Add the import at the top (after the `WeekAnnotationMenu` import):

```jsx
import AddSessionMenu from './AddSessionMenu'
```

Add state next to the existing `menu` state (line ~37):

```jsx
  const [addMenu, setAddMenu] = useState(null) // { weekday, at: {x,y} } or null
```

- [ ] **Step 2: Route the "+" through the menu instead of straight to create**

In the `dnd` object (line ~56), replace the `onAddSessionToDay,` shorthand with an opener that captures the click point:

```jsx
    onAddSessionToDay: (weekday, event) =>
      setAddMenu({ weekday, at: { x: event.clientX, y: event.clientY } }),
```

- [ ] **Step 3: Render the menu**

Just before `<PlanEditors ann={ann} />` (line ~126), add:

```jsx
      {addMenu && (
        <AddSessionMenu
          at={addMenu.at}
          templates={templates}
          visibleActivities={visibleActivities}
          onAddActivity={addVisibleActivity}
          onRemoveActivity={removeVisibleActivity}
          onCreateNew={() => onAddSessionToDay(addMenu.weekday)}
          onPickTemplate={template => onAddTemplateToDay(template, addMenu.weekday)}
          onClose={() => setAddMenu(null)}
        />
      )}
```

- [ ] **Step 4: Verify the suite still builds/passes**

Run: `npx vitest run src/components/AdminPlanBuilder/`
Expected: PASS (existing panel tests unaffected; `onAddSessionToDay` from `WeekOverview` now opens the menu instead of firing through, but the panel-level tests do not click the "+").

---

## Task 5: MonthGridPanel — own the AddSessionMenu

**Files:**
- Modify: `src/components/AdminPlanBuilder/MonthGridPanel.jsx`

- [ ] **Step 1: Add new props + import + state**

In `MonthGridPanel.jsx`, add to the props destructure (near `onAddSessionToDay,` at line ~180):

```jsx
  onAddTemplateToDayAcross,
  templates,
  visibleActivities,
  addVisibleActivity,
  removeVisibleActivity,
```

Add the import near the other local imports at the top of the file:

```jsx
import AddSessionMenu from './AddSessionMenu'
```

Add state alongside the panel's other `useState` hooks (search for an existing `useState(` in this component and add next to it):

```jsx
  const [addMenu, setAddMenu] = useState(null) // { week, year, weekday, at } or null
```

> If `useState` is not already imported in this file, add it to the existing React import.

- [ ] **Step 2: Route the "+" through the menu**

Replace the add button's onClick (line ~584) from:

```jsx
                        onClick={() => {
                          // While sessions are in hand, the "+" must not open the
                          // add form — the click places the held sessions on this
                          // day instead (handled by onPanelClick).
                          if (sel.isPlacementArmed()) return
                          onAddSessionToDay(weekEntry.week, weekEntry.year, day.value)
                        }}
```

to:

```jsx
                        onClick={event => {
                          // While sessions are in hand, the "+" must not open the
                          // add menu — the click places the held sessions on this
                          // day instead (handled by onPanelClick).
                          if (sel.isPlacementArmed()) return
                          setAddMenu({
                            week: weekEntry.week,
                            year: weekEntry.year,
                            weekday: day.value,
                            at: { x: event.clientX, y: event.clientY },
                          })
                        }}
```

- [ ] **Step 3: Render the menu**

Find the panel's top-level returned JSX root (the outer container that wraps the grid) and add, just before its closing tag:

```jsx
      {addMenu && (
        <AddSessionMenu
          at={addMenu.at}
          templates={templates}
          visibleActivities={visibleActivities}
          onAddActivity={addVisibleActivity}
          onRemoveActivity={removeVisibleActivity}
          onCreateNew={() => onAddSessionToDay(addMenu.week, addMenu.year, addMenu.weekday)}
          onPickTemplate={template =>
            onAddTemplateToDayAcross(template, addMenu.week, addMenu.year, addMenu.weekday)}
          onClose={() => setAddMenu(null)}
        />
      )}
```

> Note: in `MonthGridPanel`, the prop named `onAddSessionToDay` is the *across* create handler (it is wired from `onAddSessionToDayAcross` in `buildPanelMap.jsx:77`). The create-new branch above therefore calls it with `(week, year, weekday)`.

- [ ] **Step 4: Update existing MonthGridPanel "+" test**

In `src/components/AdminPlanBuilder/MonthGridPanel.test.jsx`, the test at line ~69 expects clicking the "+" to call `onAddSessionToDay(21, 2026, 1)` directly. The "+" now opens the menu first. Update that test to click through "Create new":

Replace the click + assertion block:

```jsx
    const onAddSessionToDay = vi.fn()
    renderPanel({ onAddSessionToDay })
    // ...existing query for the add button...
    // (click the add button)
    expect(onAddSessionToDay).toHaveBeenCalledWith(21, 2026, 1)
```

with (keep the existing add-button query variable name; assume it is `addButton`):

```jsx
    const onAddSessionToDay = vi.fn()
    renderPanel({ onAddSessionToDay, templates: [] })
    // ...existing query for the add button into `addButton`...
    fireEvent.click(addButton)
    // Empty bank → menu shows only "Create new".
    fireEvent.click(screen.getByRole('button', { name: /create new/i }))
    expect(onAddSessionToDay).toHaveBeenCalledWith(21, 2026, 1)
```

Ensure `screen` and `fireEvent` are imported in that test file (they are used elsewhere in it). If `renderPanel`/`baseProps` does not already accept `templates`, the default in `MonthGridPanel.test.jsx:36` block must include `templates: []` — add it to the base props object there if missing.

- [ ] **Step 5: Run the month tests**

Run: `npx vitest run src/components/AdminPlanBuilder/MonthGridPanel.test.jsx src/components/AdminPlanBuilder/MonthSelection.test.jsx`
Expected: PASS. If `MonthSelection.test.jsx` clicks the "+" expecting a direct create call, apply the same click-through-"Create new" update there.

---

## Task 6: Thread props through buildPanelMap and index

**Files:**
- Modify: `src/components/AdminPlanBuilder/buildPanelMap.jsx`
- Modify: `src/components/AdminPlanBuilder/index.jsx`

- [ ] **Step 1: Accept the new props in buildPanelMap**

In `buildPanelMap.jsx`, add to the destructured `props` (anywhere in the list, e.g. after `onAddSessionToDayAcross,`):

```jsx
    onAddTemplateToDay,
    onAddTemplateToDayAcross,
    addVisibleActivity,
    removeVisibleActivity,
```

(`templates` and `visibleActivities` are already destructured for the bank panel — reuse them.)

- [ ] **Step 2: Pass them into the MonthGridPanel branch**

In the `MonthGridPanel` JSX (line ~63), add these props:

```jsx
        onAddTemplateToDayAcross={onAddTemplateToDayAcross}
        templates={templates}
        visibleActivities={visibleActivities}
        addVisibleActivity={addVisibleActivity}
        removeVisibleActivity={removeVisibleActivity}
```

- [ ] **Step 3: Pass them into the BuilderWeekPanel branch**

In the `BuilderWeekPanel` JSX (line ~91), add these props:

```jsx
        onAddTemplateToDay={onAddTemplateToDay}
        templates={templates}
        visibleActivities={visibleActivities}
        addVisibleActivity={addVisibleActivity}
        removeVisibleActivity={removeVisibleActivity}
```

- [ ] **Step 4: Forward from index.jsx**

In `src/components/AdminPlanBuilder/index.jsx`, the `buildPanelMap({ ... })` call (line ~98) already passes `templates`, `visibleActivities`, `addVisibleActivity`, `removeVisibleActivity` (from `layout`). Add the two template handlers. First confirm `onAddTemplateToDay` is in the component props (it is, line ~38) and add `onAddTemplateToDayAcross` to the props destructure if absent — check `index.jsx` props list; it currently has `onAddTemplateToDay` but `onAddTemplateToDayAcross` is consumed by `useDragHandlers`. Add both to the `buildPanelMap` call args:

```jsx
    onAddTemplateToDay,
    onAddTemplateToDayAcross,
```

> `onAddTemplateToDayAcross` must be present in the `index.jsx` props destructure. Verify line ~37-43; it is passed by `TabContent.jsx:91`. If it is only used inside `useDragHandlers` and not destructured at the top level, add `onAddTemplateToDayAcross,` to the component's prop list.

- [ ] **Step 5: Run the full builder suite**

Run: `npx vitest run src/components/AdminPlanBuilder/`
Expected: PASS.

---

## Task 7: Styles for the menu

**Files:**
- Modify: `src/components/AdminPlanBuilder/styles/index.css`

- [ ] **Step 1: Add menu styles**

Append to `styles/index.css`:

```css
/* Per-day "+" add-session menu (choice state) */
.pb-add-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pb-add-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  font-size: 0.85rem;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.pb-add-menu-item:hover {
  background: rgba(37, 99, 235, 0.08);
}
/* Picker state — let the embedded BankPickerWindow scroll if tall. */
.pb-add-menu-picker {
  max-height: 60vh;
  overflow-y: auto;
}
```

- [ ] **Step 2: Manual visual check (no automated assertion)**

Run: `npm run dev`, open the plan builder for an athlete, click a day "+".
Expected: popover shows "Use existing…" and "Create new". "Use existing…" reveals the bank picker (filter bar + activity filter + cards). Clicking a card's "+" places it on that day and closes. With an empty bank, only "Create new" shows.

---

## Task 8: Full verification

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions). Pay attention to `WeekOverview.test.jsx`, `AddSessionMenu.test.jsx`, `MonthGridPanel.test.jsx`, `MonthSelection.test.jsx`.

- [ ] **Step 2: Lint**

Run: `npm run lint` (if defined)
Expected: no new errors in the touched files.

---

## Self-Review notes

- **Spec coverage:** choice popover (Task 1, 4, 5); empty-bank hides "Use existing" (Task 1 test + behavior); picker reuses `BankPickerWindow` exact visuals (Task 1 impl); shared `visibleActivities` (Tasks 4–6); close on add/Escape/outside-click (inherited from `EditorPopover` + `onClose` after add); both week and month views (Tasks 4 & 5). All covered.
- **`onAddSessionToDay` unchanged in meaning:** still the "create new" handler; the menu is interposed at the panel layer. Matches spec decision.
- **Type/name consistency:** `AddSessionMenu` props (`at`, `templates`, `visibleActivities`, `onAddActivity`, `onRemoveActivity`, `onCreateNew`, `onPickTemplate`, `onClose`) are identical across the component, its tests, and both panel call sites. `onAddTemplateToDay(template, weekday)` (week) vs `onAddTemplateToDayAcross(template, week, year, weekday)` (month) match the verified Firestore handler signatures.
- **No commit steps:** per the user's instruction, commits are intentionally omitted from this plan.
