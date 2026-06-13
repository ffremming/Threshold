import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import MonthGridPanel from './MonthGridPanel'

const WEEKS = [
  { week: 24, year: 2026, monday: new Date(2026, 5, 8), sunday: new Date(2026, 5, 14), key: '2026-24' },
]
const BY_KEY = {
  '2026-24': [
    { id: 's1', title: 'Intervals', type: 'interval', intensityZone: [4], week: 24, year: 2026, weekday: 1 },
  ],
}

function baseProps(overrides = {}) {
  return {
    visiblePanelIds: ['calendar'],
    currentWeek: 24,
    currentYear: 2026,
    overviewWeeks: WEEKS,
    overviewWorkoutsByWeekKey: BY_KEY,
    selectedWeekKey: '2026-24',
    loadingOverview: false,
    dragState: null,
    dropTarget: null,
    handleDropTargetChange: () => {},
    handleDrop: () => {},
    onSelectWorkout: () => {},
    onDeleteWorkout: () => {},
    onAddSessionToDay: () => {},
    onAddManySessions: vi.fn(),
    onMoveMany: vi.fn(),
    onDeleteMany: vi.fn(),
    onJumpToWeek: () => {},
    handleWorkoutDragStart: () => {},
    handleDragEnd: () => {},
    plan: { bands: [], notes: [], goals: [] },
    planActions: {
      upsertBand: vi.fn(), removeBand: vi.fn(),
      upsertNote: vi.fn(), removeNote: vi.fn(),
      upsertGoal: vi.fn(), removeGoal: vi.fn(),
    },
    noteAuthor: 'coach',
    ...overrides,
  }
}

// Lay the 7 day cells of the single week row out at 100px each so a marquee box
// can intersect a contiguous span of them.
function stubCellRects(container) {
  const cells = container.querySelectorAll('.pb-month-cell')
  cells.forEach((el, i) => {
    const x = i * 100
    el.getBoundingClientRect = () => ({
      left: x + 5, right: x + 95, top: 5, bottom: 95, width: 90, height: 90, x: x + 5, y: 5,
    })
  })
}

// Place each session chip inside its weekday cell so a marquee sweeping that
// column also selects the chip — reproducing a range drawn OVER sessions.
function stubChipRects(container) {
  container.querySelectorAll('[data-session-id]').forEach(el => {
    // s1 is weekday 1 → cell 0.
    el.getBoundingClientRect = () => ({
      left: 20, right: 80, top: 20, bottom: 80, width: 60, height: 60, x: 20, y: 20,
    })
  })
}

function pointerMoveAt(target, x, y) {
  const ev = new Event('pointermove', { bubbles: true })
  ev.clientX = x; ev.clientY = y
  target.dispatchEvent(ev)
}
function pointerUp(target) { target.dispatchEvent(new Event('pointerup', { bubbles: true })) }

// Drag-select day columns 0..2 (Mon..Wed) of the week.
function marqueeDays(container) {
  const grid = container.querySelector('.pb-month-grid')
  act(() => {
    fireEvent(grid, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 10, clientY: 10 }))
    pointerMoveAt(window, 250, 50) // sweeps cells 0,1,2
    pointerUp(window)
  })
}

beforeEach(() => vi.restoreAllMocks())

describe('Month view — annotation creation', () => {
  it('renders existing bands from the plan', () => {
    const plan = { bands: [{ id: 'b1', type: 'taper', startDate: '2026-06-08', endDate: '2026-06-14' }], notes: [], goals: [] }
    const { container } = render(<MonthGridPanel {...baseProps({ plan })} />)
    expect(container.querySelector('.pb-band-pill')).not.toBeNull()
    expect(container.textContent).toContain('Taper')
  })

  it('marquee day-range → right-click → Add band opens the band editor with the range', () => {
    const { container } = render(<MonthGridPanel {...baseProps()} />)
    stubCellRects(container)
    marqueeDays(container)

    // Right-click the panel (empty area) → annotation menu with Add band/note/competition.
    const panel = container.querySelector('.pb-panel--calendar')
    fireEvent.contextMenu(panel, { clientX: 60, clientY: 60 })
    const items = [...container.querySelectorAll('.pb-month-context-item')].map(b => b.textContent)
    expect(items.some(t => /Add band/.test(t))).toBe(true)
    expect(items.some(t => /Add competition/.test(t))).toBe(true)

    // Click "Add band…" → BandEditor popover appears with the selected dates prefilled.
    const addBand = [...container.querySelectorAll('.pb-month-context-item')]
      .find(b => /Add band/.test(b.textContent))
    fireEvent.click(addBand)
    const popover = document.querySelector('.pb-editor-popover')
    expect(popover).not.toBeNull()
    const dateInputs = popover.querySelectorAll('input[type="date"]')
    expect(dateInputs[0].value).toBe('2026-06-08') // Mon
    expect(dateInputs[1].value).toBe('2026-06-10') // Wed
  })

  it('saving the band editor calls planActions.upsertBand', () => {
    const planActions = baseProps().planActions
    const { container } = render(<MonthGridPanel {...baseProps({ planActions })} />)
    stubCellRects(container)
    marqueeDays(container)
    fireEvent.contextMenu(container.querySelector('.pb-panel--calendar'), { clientX: 60, clientY: 60 })
    fireEvent.click([...container.querySelectorAll('.pb-month-context-item')].find(b => /Add band/.test(b.textContent)))

    const popover = document.querySelector('.pb-editor-popover')
    fireEvent.click(popover.querySelector('.pb-editor-save'))
    expect(planActions.upsertBand).toHaveBeenCalledTimes(1)
    const band = planActions.upsertBand.mock.calls[0][0]
    expect(band).toMatchObject({ startDate: '2026-06-08', endDate: '2026-06-10' })
    expect(band.id).toBeTruthy()
  })

  it('a range swept OVER a session can still become a band (right-click the session)', () => {
    const planActions = baseProps().planActions
    const { container } = render(<MonthGridPanel {...baseProps({ planActions })} />)
    stubCellRects(container)
    stubChipRects(container)
    marqueeDays(container) // sweeps cells 0..2, which includes s1 on Monday

    // Right-click the session that sits inside the swept range.
    fireEvent.contextMenu(container.querySelector('[data-session-id="s1"]'), { clientX: 30, clientY: 30 })
    const items = [...container.querySelectorAll('.pb-month-context-item')].map(b => b.textContent)
    // The band/note/competition options must be offered even though the
    // right-click landed on a session inside the range.
    expect(items.some(t => /Add band/.test(t))).toBe(true)
    expect(items.some(t => /Add competition/.test(t))).toBe(true)

    fireEvent.click([...container.querySelectorAll('.pb-month-context-item')].find(b => /Add band/.test(b.textContent)))
    const popover = document.querySelector('.pb-editor-popover')
    expect(popover).not.toBeNull()
    const dateInputs = popover.querySelectorAll('input[type="date"]')
    expect(dateInputs[0].value).toBe('2026-06-08') // Mon — the day with the session
    expect(dateInputs[1].value).toBe('2026-06-10') // Wed
    fireEvent.click(popover.querySelector('.pb-editor-save'))
    expect(planActions.upsertBand).toHaveBeenCalledTimes(1)
    expect(planActions.upsertBand.mock.calls[0][0]).toMatchObject({ startDate: '2026-06-08', endDate: '2026-06-10' })
  })

  it('right-click a session offers "Add note here" → upsertNote with a session anchor', () => {
    const planActions = baseProps().planActions
    const { container } = render(<MonthGridPanel {...baseProps({ planActions })} />)
    fireEvent.contextMenu(container.querySelector('[data-session-id="s1"]'))
    const addHere = [...container.querySelectorAll('.pb-month-context-item')]
      .find(b => /Add note here/.test(b.textContent))
    expect(addHere).toBeTruthy()
    fireEvent.click(addHere)

    const popover = document.querySelector('.pb-editor-popover')
    const textarea = popover.querySelector('.pb-editor-textarea')
    fireEvent.change(textarea, { target: { value: 'Focus on form' } })
    fireEvent.click(popover.querySelector('.pb-note-send')) // first message creates the note

    expect(planActions.upsertNote).toHaveBeenCalledTimes(1)
    const note = planActions.upsertNote.mock.calls[0][0]
    expect(note.body).toBe('Focus on form')
    expect(note.anchor).toEqual({ kind: 'session', sessionId: 's1' })
    expect(note.author).toBe('coach')
    // The note is created as a dialogue thread with the first message.
    expect(note.messages).toHaveLength(1)
    expect(note.messages[0]).toMatchObject({ author: 'coach', body: 'Focus on form' })
  })
})
