# Export Training Plan to Excel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a coach export a training plan (chosen athlete or all athletes, custom date range, chosen fields) to an editable `.xlsx` file from the admin Week Plan tab.

**Architecture:** A pure workbook-builder module (field definitions + row mapping, SheetJS) is the testable core. A one-shot Firebase fetch helper reuses the existing `subscribeToWorkoutWeeks`. A `usePlanExport` hook orchestrates fetch → filter → build → download. An `ExportPlanModal` (on the existing `Modal` primitive) collects athlete/range/fields. An Export button in `PlanTab`'s toolbar opens it.

**Tech Stack:** React 18, Vite, Firebase Firestore, SheetJS (`xlsx`), Vitest.

---

## File Structure

- Create: `src/components/AdminDashboard/buildPlanWorkbook.js` — `EXPORT_FIELDS`, `buildPlanWorkbook`, `downloadPlanWorkbook`, `planExportFilename` (pure except download).
- Create: `src/components/AdminDashboard/buildPlanWorkbook.test.js` — unit tests.
- Create: `src/utils/dateRange.js` — `weeksInDateRange(startDate, endDate)`.
- Create: `src/utils/dateRange.test.js` — unit tests.
- Create: `src/workoutFetch.js` — `fetchWorkoutsOnce({ athleteId, weeks })` (one-shot wrapper over `subscribeToWorkoutWeeks`).
- Create: `src/components/AdminDashboard/usePlanExport.js` — orchestration hook.
- Create: `src/components/AdminDashboard/ExportPlanModal.jsx` — the popup.
- Create: `src/components/AdminDashboard/export-plan.css` — checkbox grid styling.
- Modify: `src/components/AdminDashboard/index.jsx` — thread `athletes` into `tabProps`.
- Modify: `src/components/AdminDashboard/tabs/PlanTab.jsx` — Export button + modal wiring.
- Modify: `package.json` — add `xlsx` dependency.

---

## Task 1: Add the `xlsx` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

Run: `npm install xlsx@^0.18.5`
Expected: `package.json` `dependencies` gains `"xlsx": "^0.18.5"`; no errors.

- [ ] **Step 2: Verify import resolves**

Run: `node -e "import('xlsx').then(m => console.log(typeof m.utils.book_new))"`
Expected: prints `function`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add xlsx (SheetJS) dependency"
```

---

## Task 2: `weeksInDateRange` date-range → ISO weeks helper

**Files:**
- Create: `src/utils/dateRange.js`
- Test: `src/utils/dateRange.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/utils/dateRange.test.js
import { describe, it, expect } from 'vitest'
import { weeksInDateRange } from './dateRange'

describe('weeksInDateRange', () => {
  it('returns a single week for a one-day range', () => {
    // 2026-06-03 is a Wednesday in ISO week 23
    expect(weeksInDateRange('2026-06-03', '2026-06-03')).toEqual([
      { week: 23, year: 2026 },
    ])
  })

  it('returns consecutive weeks spanning the range', () => {
    // 2026-06-03 (wk23) .. 2026-06-15 (wk25)
    expect(weeksInDateRange('2026-06-03', '2026-06-15')).toEqual([
      { week: 23, year: 2026 },
      { week: 24, year: 2026 },
      { week: 25, year: 2026 },
    ])
  })

  it('crosses a year boundary', () => {
    // 2025-12-29 is ISO wk1 of 2026; 2025-12-22 is wk52 of 2025
    const result = weeksInDateRange('2025-12-22', '2026-01-05')
    expect(result).toEqual([
      { week: 52, year: 2025 },
      { week: 1, year: 2026 },
      { week: 2, year: 2026 },
    ])
  })

  it('returns empty array when start is after end', () => {
    expect(weeksInDateRange('2026-06-15', '2026-06-03')).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/dateRange.test.js`
Expected: FAIL — cannot resolve `./dateRange`.

- [ ] **Step 3: Write the implementation**

```js
// src/utils/dateRange.js
import { getWeekNumber } from './week'

function parseISODate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Returns ordered, de-duplicated { week, year } pairs (ISO week-numbering year)
// covering every day from startDate..endDate inclusive. Empty if start > end.
export function weeksInDateRange(startDate, endDate) {
  const start = parseISODate(startDate)
  const end = parseISODate(endDate)
  if (start > end) return []

  const seen = new Set()
  const result = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const week = getWeekNumber(cursor)
    // ISO week-year: the Thursday of the cursor's week decides the year.
    const thursday = new Date(cursor)
    thursday.setDate(thursday.getDate() + 4 - (thursday.getDay() || 7))
    const year = thursday.getFullYear()
    const key = `${year}:${week}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push({ week, year })
    }
    cursor.setDate(cursor.getDate() + 7)
  }
  // Ensure the end week is included when the 7-day step overshoots it.
  const endWeek = getWeekNumber(end)
  const endThursday = new Date(end)
  endThursday.setDate(endThursday.getDate() + 4 - (endThursday.getDay() || 7))
  const endYear = endThursday.getFullYear()
  const endKey = `${endYear}:${endWeek}`
  if (!seen.has(endKey)) result.push({ week: endWeek, year: endYear })

  return result
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/dateRange.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/dateRange.js src/utils/dateRange.test.js
git commit -m "feat: weeksInDateRange helper for export range"
```

---

## Task 3: Pure workbook builder (`buildPlanWorkbook.js`)

**Files:**
- Create: `src/components/AdminDashboard/buildPlanWorkbook.js`
- Test: `src/components/AdminDashboard/buildPlanWorkbook.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/components/AdminDashboard/buildPlanWorkbook.test.js
import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  EXPORT_FIELDS,
  buildPlanWorkbook,
  planExportFilename,
} from './buildPlanWorkbook'

function sheetRows(wb) {
  const sheet = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { header: 1 })
}

const workout = {
  id: 'w1',
  date: '2026-06-03',
  weekday: 3,
  time: '08:00',
  title: 'Threshold 4x6',
  type: 'interval',
  activityTag: 'run',
  category: 'Hard',
  intensityZone: [4],
  loadTag: 'hard',
  distance: '10 km',
  warmup: 'easy jog',
  description: '4x6 min',
  sessionDetails: 'on track',
  exercises: '',
  rest: '2 min',
  cooldown: 'easy jog',
  notes: 'keep it controlled',
}

describe('EXPORT_FIELDS', () => {
  it('exposes a stable ordered list of field keys', () => {
    expect(EXPORT_FIELDS.map(f => f.key)).toEqual([
      'date', 'weekday', 'time', 'title', 'type', 'activityTag', 'category',
      'intensityZone', 'loadTag', 'distance', 'warmup', 'description',
      'sessionDetails', 'exercises', 'rest', 'cooldown', 'notes',
    ])
  })
})

describe('buildPlanWorkbook', () => {
  it('builds a header row from selected fields in canonical order', () => {
    const wb = buildPlanWorkbook({
      workouts: [workout],
      selectedFieldKeys: ['title', 'date'], // intentionally out of order
      includeAthleteColumn: false,
    })
    const rows = sheetRows(wb)
    expect(rows[0]).toEqual(['Date', 'Title'])
  })

  it('writes one row per workout with formatted values', () => {
    const wb = buildPlanWorkbook({
      workouts: [workout],
      selectedFieldKeys: ['date', 'weekday', 'intensityZone', 'title'],
      includeAthleteColumn: false,
    })
    const rows = sheetRows(wb)
    expect(rows.length).toBe(2)
    expect(rows[1][0]).toBe('03.06.2026') // date formatted
    expect(rows[1][1]).toBe('Wednesday')  // weekday label
    expect(typeof rows[1][2]).toBe('string') // intensity zone label
    expect(rows[1][3]).toBe('Threshold 4x6')
  })

  it('prepends an Athlete column only when includeAthleteColumn is true', () => {
    const wb = buildPlanWorkbook({
      workouts: [{ ...workout, athleteId: 'a1' }],
      selectedFieldKeys: ['title'],
      includeAthleteColumn: true,
      athleteNameById: { a1: 'Jane Doe' },
    })
    const rows = sheetRows(wb)
    expect(rows[0]).toEqual(['Athlete', 'Title'])
    expect(rows[1]).toEqual(['Jane Doe', 'Threshold 4x6'])
  })

  it('handles empty selectedFieldKeys by producing only a header (or athlete col)', () => {
    const wb = buildPlanWorkbook({
      workouts: [workout],
      selectedFieldKeys: [],
      includeAthleteColumn: false,
    })
    const rows = sheetRows(wb)
    expect(rows[0]).toEqual([])
  })
})

describe('planExportFilename', () => {
  it('slugs the athlete name and embeds the range', () => {
    expect(planExportFilename('Jane Doe', '2026-06-01', '2026-06-30'))
      .toBe('Training_plan_Jane_Doe_2026-06-01_2026-06-30.xlsx')
  })
  it('uses "all" for all-athletes export', () => {
    expect(planExportFilename(null, '2026-06-01', '2026-06-30'))
      .toBe('Training_plan_all_2026-06-01_2026-06-30.xlsx')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/AdminDashboard/buildPlanWorkbook.test.js`
Expected: FAIL — cannot resolve `./buildPlanWorkbook`.

- [ ] **Step 3: Write the implementation**

```js
// src/components/AdminDashboard/buildPlanWorkbook.js
import * as XLSX from 'xlsx'
import {
  formatWorkoutDate,
  getIntensityZoneLabel,
  getWeekdayMeta,
} from '../../utils'

const text = key => w => (w[key] ?? '').toString()

// Single source of truth for export columns. Order here is the canonical
// column order; the modal's checkbox list and the builder both read it.
export const EXPORT_FIELDS = [
  { key: 'date',           header: 'Date',            width: 12, format: w => formatWorkoutDate(w.date) },
  { key: 'weekday',        header: 'Weekday',         width: 12, format: w => getWeekdayMeta(w.weekday).label },
  { key: 'time',           header: 'Time',            width: 8,  format: text('time') },
  { key: 'title',          header: 'Title',           width: 28, format: text('title') },
  { key: 'type',           header: 'Type',            width: 12, format: text('type') },
  { key: 'activityTag',    header: 'Activity',        width: 12, format: text('activityTag') },
  { key: 'category',       header: 'Category',        width: 10, format: text('category') },
  { key: 'intensityZone',  header: 'Intensity zone',  width: 16, format: w => getIntensityZoneLabel(w) },
  { key: 'loadTag',        header: 'Load',            width: 10, format: text('loadTag') },
  { key: 'distance',       header: 'Distance',        width: 12, format: text('distance') },
  { key: 'warmup',         header: 'Warmup',          width: 30, format: text('warmup') },
  { key: 'description',    header: 'Description',     width: 40, format: text('description') },
  { key: 'sessionDetails', header: 'Session details', width: 40, format: text('sessionDetails') },
  { key: 'exercises',      header: 'Exercises',       width: 30, format: text('exercises') },
  { key: 'rest',           header: 'Rest',            width: 12, format: text('rest') },
  { key: 'cooldown',       header: 'Cooldown',        width: 30, format: text('cooldown') },
  { key: 'notes',          header: 'Notes',           width: 30, format: text('notes') },
]

const ATHLETE_COL = { header: 'Athlete', width: 22 }

// Returns the EXPORT_FIELDS that are selected, preserving canonical order.
function selectedFields(selectedFieldKeys) {
  const set = new Set(selectedFieldKeys)
  return EXPORT_FIELDS.filter(f => set.has(f.key))
}

export function buildPlanWorkbook({
  workouts,
  selectedFieldKeys,
  includeAthleteColumn = false,
  athleteNameById = {},
}) {
  const fields = selectedFields(selectedFieldKeys)

  const headers = [
    ...(includeAthleteColumn ? [ATHLETE_COL.header] : []),
    ...fields.map(f => f.header),
  ]

  const rows = workouts.map(w => [
    ...(includeAthleteColumn ? [athleteNameById[w.athleteId] ?? w.athleteId ?? ''] : []),
    ...fields.map(f => f.format(w)),
  ])

  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  sheet['!cols'] = [
    ...(includeAthleteColumn ? [{ wch: ATHLETE_COL.width }] : []),
    ...fields.map(f => ({ wch: f.width })),
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'Training plan')
  return wb
}

function slug(name) {
  return String(name).trim().replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '')
}

export function planExportFilename(athleteName, startDate, endDate) {
  const who = athleteName ? slug(athleteName) : 'all'
  return `Training_plan_${who}_${startDate}_${endDate}.xlsx`
}

export function downloadPlanWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/AdminDashboard/buildPlanWorkbook.test.js`
Expected: PASS. If the `weekday` label is not exactly `Wednesday`, open `src/utils/weekday.js`, read the `WEEKDAY_OPTIONS` labels, and update the test expectation to match the real label — do not change the source to fit the test.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminDashboard/buildPlanWorkbook.js src/components/AdminDashboard/buildPlanWorkbook.test.js
git commit -m "feat: pure workbook builder for plan export"
```

---

## Task 4: One-shot workout fetch helper

**Files:**
- Create: `src/workoutFetch.js`

No unit test (thin Firebase wrapper; covered manually in Task 8). Keep it tiny.

- [ ] **Step 1: Write the implementation**

```js
// src/workoutFetch.js
import { subscribeToWorkoutWeeks } from './workoutSubscriptions'

// One-shot read: subscribe, resolve on the first fully-ready snapshot,
// then immediately unsubscribe. Used by the export flow (no live updates).
export function fetchWorkoutsOnce({ athleteId, weeks }) {
  return new Promise((resolve, reject) => {
    let unsub = () => {}
    let settled = false
    unsub = subscribeToWorkoutWeeks({
      athleteId,
      weeks,
      onData: (workouts, isReady) => {
        if (!isReady || settled) return
        settled = true
        // Defer unsub so it is assigned even if onData fires synchronously.
        Promise.resolve().then(() => unsub())
        resolve(workouts)
      },
      onError: err => {
        if (settled) return
        settled = true
        Promise.resolve().then(() => unsub())
        reject(err)
      },
    })
  })
}
```

- [ ] **Step 2: Verify it imports cleanly**

Run: `node -e "import('./src/workoutFetch.js').catch(e => { console.error(e); process.exit(1) })"`
Expected: may warn about firebase env but must not throw a syntax/resolution error for `workoutFetch.js` itself. (If firebase init throws under node, that is acceptable — the goal is to confirm the file parses. You can instead run `npx vite build` later in Task 8 to confirm.)

- [ ] **Step 3: Commit**

```bash
git add src/workoutFetch.js
git commit -m "feat: one-shot workout fetch helper for export"
```

---

## Task 5: `usePlanExport` orchestration hook

**Files:**
- Create: `src/components/AdminDashboard/usePlanExport.js`

- [ ] **Step 1: Write the implementation**

```js
// src/components/AdminDashboard/usePlanExport.js
import { useCallback, useState } from 'react'
import { compareWorkoutsBySchedule } from '../../utils'
import { weeksInDateRange } from '../../utils/dateRange'
import { fetchWorkoutsOnce } from '../../workoutFetch'
import {
  buildPlanWorkbook,
  downloadPlanWorkbook,
  planExportFilename,
} from './buildPlanWorkbook'

function inRange(workout, startDate, endDate) {
  return workout.date && workout.date >= startDate && workout.date <= endDate
}

function bySchedule(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1
  return compareWorkoutsBySchedule(a, b)
}

// athletes: full list (for name lookup + all-athletes scope)
export function usePlanExport(athletes) {
  const [status, setStatus] = useState('idle') // idle | loading | empty | error

  const runExport = useCallback(async ({ athleteId, startDate, endDate, selectedFieldKeys }) => {
    setStatus('loading')
    try {
      const weeks = weeksInDateRange(startDate, endDate)
      const isAll = athleteId === 'all'
      const targetIds = isAll ? athletes.map(a => a.uid) : [athleteId]

      const nameById = Object.fromEntries(
        athletes.map(a => [a.uid, a.displayName || a.email || a.uid])
      )

      const batches = await Promise.all(
        targetIds.map(id =>
          fetchWorkoutsOnce({ athleteId: id, weeks }).then(ws =>
            ws.map(w => ({ ...w, athleteId: w.athleteId || id }))
          )
        )
      )

      const workouts = batches
        .flat()
        .filter(w => inRange(w, startDate, endDate))
        .sort(bySchedule)

      if (workouts.length === 0) {
        setStatus('empty')
        return { ok: false, reason: 'empty' }
      }

      const wb = buildPlanWorkbook({
        workouts,
        selectedFieldKeys,
        includeAthleteColumn: isAll,
        athleteNameById: nameById,
      })

      const athleteName = isAll ? null : nameById[athleteId]
      downloadPlanWorkbook(wb, planExportFilename(athleteName, startDate, endDate))

      setStatus('idle')
      return { ok: true }
    } catch (err) {
      console.error('[planExport] failed', err)
      setStatus('error')
      return { ok: false, reason: 'error' }
    }
  }, [athletes])

  const resetStatus = useCallback(() => setStatus('idle'), [])

  return { status, runExport, resetStatus }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AdminDashboard/usePlanExport.js
git commit -m "feat: usePlanExport orchestration hook"
```

---

## Task 6: `ExportPlanModal` component + styles

**Files:**
- Create: `src/components/AdminDashboard/ExportPlanModal.jsx`
- Create: `src/components/AdminDashboard/export-plan.css`

- [ ] **Step 1: Write the styles**

```css
/* src/components/AdminDashboard/export-plan.css */
.export-plan-form { display: flex; flex-direction: column; gap: 16px; }
.export-plan-row { display: flex; gap: 12px; }
.export-plan-row > * { flex: 1; }
.export-plan-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 16px;
}
.export-plan-field {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; cursor: pointer;
}
.export-plan-allrow { display: flex; justify-content: flex-end; }
.export-plan-status { font-size: 14px; }
.export-plan-status--empty { color: var(--th-muted, #6b7280); }
.export-plan-status--error { color: #dc2626; }
```

- [ ] **Step 2: Write the component**

```jsx
// src/components/AdminDashboard/ExportPlanModal.jsx
import { useMemo, useState } from 'react'
import { Modal, Button, Field, Input, Select } from '../ui'
import { EXPORT_FIELDS } from './buildPlanWorkbook'
import { usePlanExport } from './usePlanExport'
import './export-plan.css'

const ALL_KEYS = EXPORT_FIELDS.map(f => f.key)

export default function ExportPlanModal({
  open,
  onClose,
  athletes = [],
  selectedAthleteId,
  defaultStart,
  defaultEnd,
}) {
  const { status, runExport, resetStatus } = usePlanExport(athletes)

  const [athleteId, setAthleteId] = useState(selectedAthleteId || (athletes[0]?.uid ?? 'all'))
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [selected, setSelected] = useState(() => new Set(ALL_KEYS))

  const allChecked = selected.size === ALL_KEYS.length

  function toggleField(key) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    resetStatus()
  }

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(ALL_KEYS))
    resetStatus()
  }

  const rangeValid = startDate && endDate && startDate <= endDate
  const canExport = rangeValid && selected.size > 0 && status !== 'loading'

  async function handleExport() {
    const result = await runExport({
      athleteId,
      startDate,
      endDate,
      selectedFieldKeys: EXPORT_FIELDS.filter(f => selected.has(f.key)).map(f => f.key),
    })
    if (result.ok) onClose()
  }

  const athleteName = id => {
    const a = athletes.find(x => x.uid === id)
    return a ? (a.displayName || a.email || a.uid) : id
  }

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button onClick={handleExport} disabled={!canExport}>
        {status === 'loading' ? 'Gathering sessions…' : 'Export'}
      </Button>
    </>
  )

  return (
    <Modal open={open} onClose={onClose} title="Export training plan" size="lg" footer={footer}>
      <div className="export-plan-form">
        <Field label="Athlete">
          <Select value={athleteId} onChange={e => { setAthleteId(e.target.value); resetStatus() }}>
            <option value="all">All athletes</option>
            {athletes.map(a => (
              <option key={a.uid} value={a.uid}>{athleteName(a.uid)}</option>
            ))}
          </Select>
        </Field>

        <div className="export-plan-row">
          <Field label="Start date">
            <Input type="date" value={startDate} max={endDate}
              onChange={e => { setStartDate(e.target.value); resetStatus() }} />
          </Field>
          <Field label="End date">
            <Input type="date" value={endDate} min={startDate}
              onChange={e => { setEndDate(e.target.value); resetStatus() }} />
          </Field>
        </div>

        <Field label="Fields" hint={rangeValid ? undefined : 'End date must be on or after start date.'}>
          <div className="export-plan-allrow">
            <Button variant="secondary" size="sm" type="button" onClick={toggleAll}>
              {allChecked ? 'Select none' : 'Select all'}
            </Button>
          </div>
          <div className="export-plan-fields">
            {EXPORT_FIELDS.map(f => (
              <label key={f.key} className="export-plan-field">
                <input
                  type="checkbox"
                  checked={selected.has(f.key)}
                  onChange={() => toggleField(f.key)}
                />
                {f.header}
              </label>
            ))}
          </div>
        </Field>

        {status === 'empty' && (
          <div className="export-plan-status export-plan-status--empty">
            No sessions in this range.
          </div>
        )}
        {status === 'error' && (
          <div className="export-plan-status export-plan-status--error">
            Something went wrong while exporting. Please try again.
          </div>
        )}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 3: Verify build compiles**

Run: `npx vite build`
Expected: build succeeds (no import/JSX errors). It is fine if it is slow.

- [ ] **Step 4: Commit**

```bash
git add src/components/AdminDashboard/ExportPlanModal.jsx src/components/AdminDashboard/export-plan.css
git commit -m "feat: ExportPlanModal popup for plan export"
```

---

## Task 7: Wire the Export button into PlanTab

**Files:**
- Modify: `src/components/AdminDashboard/index.jsx`
- Modify: `src/components/AdminDashboard/tabs/PlanTab.jsx`

- [ ] **Step 1: Thread `athletes` into tabProps**

In `src/components/AdminDashboard/index.jsx`, the `tabProps` object (around line 132) lists props passed to tabs. Add `athletes` to it. Find:

```js
  const tabProps = {
    ...actions, ...derived,
    tab, selectedAthleteId, userProfile, isSuperadmin,
```

Replace the first line group with:

```js
  const tabProps = {
    ...actions, ...derived,
    tab, selectedAthleteId, athletes, userProfile, isSuperadmin,
```

(`athletes` is already a prop of `AdminDashboard`, see line 35.)

- [ ] **Step 2: Add imports + Export button + modal to PlanTab**

In `src/components/AdminDashboard/tabs/PlanTab.jsx`:

(a) Update the lucide import (line 1) to include `Download`:

```jsx
import { CalendarPlus, Download, Plus } from 'lucide-react'
```

(b) Add imports for the modal and the helper that computes week Monday/Sunday. Below the existing imports add:

```jsx
import { useState } from 'react'
import { getWeekDates } from '../../../utils'
import ExportPlanModal from '../ExportPlanModal'
```

(c) Destructure `athletes` from props. Find the destructure block starting `const { selectedAthleteId,` and add `athletes,` next to `selectedAthleteId,`:

```jsx
    selectedAthleteId, athletes,
```

(d) Inside the component body (after the destructure, before `startNewWorkout`), add export modal state + default range:

```jsx
  const [exportOpen, setExportOpen] = useState(false)

  function toISO(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const { monday: exportMonday, sunday: exportSunday } = getWeekDates(currentWeek, currentYear)
```

(e) Add an Export `ToolbarGroup` inside the `<Toolbar>`, after the existing `Activity` group (after the closing `</ToolbarGroup>` that wraps `SportPicker`, before `</Toolbar>`):

```jsx
        <ToolbarGroup label="Export">
          <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
            <Download size={16} strokeWidth={2} aria-hidden="true" />
            Export
          </Button>
        </ToolbarGroup>
```

(f) Render the modal. Just before the final closing `</Page>` tag, add:

```jsx
      <ExportPlanModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        athletes={athletes}
        selectedAthleteId={selectedAthleteId}
        defaultStart={toISO(exportMonday)}
        defaultEnd={toISO(exportSunday)}
      />
```

- [ ] **Step 3: Verify build compiles**

Run: `npx vite build`
Expected: build succeeds.

- [ ] **Step 4: Run the full unit suite**

Run: `npx vitest run`
Expected: all tests pass (including Tasks 2 and 3).

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminDashboard/index.jsx src/components/AdminDashboard/tabs/PlanTab.jsx
git commit -m "feat: Export button + modal in admin Week Plan tab"
```

---

## Task 8: Manual verification

**Files:** none (manual)

- [ ] **Step 1: Run the dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify the flow**

In the admin Week Plan tab:
1. Click **Export** in the toolbar → modal opens with the current week's Mon→Sun pre-filled and all fields checked.
2. Toggle **Select none / Select all** → checkboxes flip; Export disables when none selected.
3. Set an invalid range (end before start) → Export disabled, hint shown.
4. Pick an athlete with sessions and a valid range → click **Export** → a `.xlsx` downloads.
5. Open the file in Excel / Google Sheets → one row per session, selected columns only, readable column widths, editable.
6. Choose **All athletes** → exported file has an **Athlete** column.
7. Pick a range with no sessions → inline "No sessions in this range." shown, no file written.

- [ ] **Step 3: Final commit (if any tweaks were needed)**

```bash
git add -A
git commit -m "fix: export plan polish after manual verification"
```

---

## Self-Review notes

- **Spec coverage:** button in Week Plan toolbar (T7) ✓; popup with athlete/range/fields + select-all (T6) ✓; custom start/end dates (T6) ✓; all-athletes + athlete column (T3/T5/T6) ✓; true .xlsx editable (T1/T3) ✓; one row per session (T3) ✓; fetch by range (T2/T4/T5) ✓; empty/error handling (T5/T6) ✓; unit tests for pure parts (T2/T3) ✓.
- **Type consistency:** `EXPORT_FIELDS` keys/headers identical across builder + modal (shared import). `runExport` opts shape (`athleteId`, `startDate`, `endDate`, `selectedFieldKeys`) consistent between hook and modal. `weeksInDateRange` returns `{week, year}` matching `subscribeToWorkoutWeeks` `weeks` input.
- **No placeholders:** every code step is complete.
```
