import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'

// Charts need a real canvas; stub them so the timetable renders.
vi.mock('react-chartjs-2', () => ({ Doughnut: () => null }))
vi.mock('react-body-highlighter', () => ({
  default: () => <div data-testid="body-model" />,
}))

import BuilderWeekPanel from './BuilderWeekPanel'

// Week of Mon 2026-06-08 .. Sun 2026-06-14 (currentWeek 24, 2026).
const WORKOUTS = [
  { id: 'w1', title: 'Morning run', type: 'easy', weekday: 1, activityTag: 'run', durationMinutes: 45 },
  { id: 'w2', title: 'Tempo', type: 'terskel', weekday: 3, activityTag: 'run', durationMinutes: 50 },
]

function baseProps(overrides = {}) {
  return {
    visiblePanelIds: ['calendar'],
    currentWeek: 24,
    currentYear: 2026,
    loadingWorkouts: false,
    workouts: WORKOUTS,
    dragState: null,
    dropTarget: null,
    handleDropTargetChange: () => {},
    handleDrop: () => {},
    onSelectWorkout: () => {},
    onDeleteWorkout: () => {},
    onAddSessionToDay: () => {},
    handleWorkoutDragStart: () => {},
    handleDayDragStart: () => {},
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

// Lay the 7 day columns out at 100px each so a marquee can sweep a span.
function stubColRects(container) {
  container.querySelectorAll('.wo-col').forEach((el, i) => {
    const x = i * 100
    el.getBoundingClientRect = () => ({
      left: x + 5, right: x + 95, top: 5, bottom: 95, width: 90, height: 90, x: x + 5, y: 5,
    })
  })
}

function pointerMoveAt(target, x, y) {
  const ev = new Event('pointermove', { bubbles: true })
  ev.clientX = x; ev.clientY = y
  target.dispatchEvent(ev)
}

beforeEach(() => vi.restoreAllMocks())

describe('Week view — annotation placement', () => {
  it('renders existing bands above the timetable', () => {
    const plan = { bands: [{ id: 'b1', type: 'taper', startDate: '2026-06-08', endDate: '2026-06-14' }], notes: [], goals: [] }
    const { container } = render(<BuilderWeekPanel {...baseProps({ plan })} />)
    expect(container.querySelector('.pb-band-pill')).not.toBeNull()
    expect(container.textContent).toContain('Taper')
  })

  it('sweeps a day-range over columns that contain sessions, then creates a band', () => {
    const planActions = baseProps().planActions
    const { container } = render(<BuilderWeekPanel {...baseProps({ planActions })} />)
    stubColRects(container)

    // Start the sweep on empty panel space (NOT a session card), drag across
    // columns 0..2 (Mon..Wed) — which contain sessions w1 and w2.
    const panel = container.querySelector('.pb-panel--calendar')
    act(() => {
      fireEvent(panel, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 10, clientY: 10 }))
      pointerMoveAt(window, 250, 50)
      window.dispatchEvent(new Event('pointerup'))
    })

    // Right-click (even landing on a session card) opens the annotation menu.
    fireEvent.contextMenu(container.querySelector('[data-session-id="w1"]') || panel, { clientX: 30, clientY: 30 })
    const items = [...container.querySelectorAll('.pb-month-context-item')].map(b => b.textContent)
    expect(items.some(t => /Add band/.test(t))).toBe(true)

    fireEvent.click([...container.querySelectorAll('.pb-month-context-item')].find(b => /Add band/.test(b.textContent)))
    const popover = document.querySelector('.pb-editor-popover')
    expect(popover).not.toBeNull()
    const dates = popover.querySelectorAll('input[type="date"]')
    expect(dates[0].value).toBe('2026-06-08')
    expect(dates[1].value).toBe('2026-06-10')

    fireEvent.click(popover.querySelector('.pb-editor-save'))
    expect(planActions.upsertBand).toHaveBeenCalledTimes(1)
    expect(planActions.upsertBand.mock.calls[0][0]).toMatchObject({ startDate: '2026-06-08', endDate: '2026-06-10' })
  })

  it('can sweep a range on a COMPLETELY EMPTY week via the day-scale', () => {
    const planActions = baseProps().planActions
    // No sessions → WeekOverview shows its empty state with no day columns; the
    // annotation day-scale provides the sweepable [data-date] slots.
    const { container } = render(<BuilderWeekPanel {...baseProps({ workouts: [], planActions })} />)
    const slots = container.querySelectorAll('.pb-annotations-slot')
    expect(slots).toHaveLength(7)
    slots.forEach((el, i) => {
      const x = i * 100
      el.getBoundingClientRect = () => ({ left: x + 5, right: x + 95, top: 5, bottom: 11, width: 90, height: 6, x: x + 5, y: 5 })
    })

    const panel = container.querySelector('.pb-panel--calendar')
    act(() => {
      fireEvent(panel, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 10, clientY: 7 }))
      pointerMoveAt(window, 150, 8) // sweep slots 0..1 (Mon..Tue)
      window.dispatchEvent(new Event('pointerup'))
    })

    fireEvent.contextMenu(panel, { clientX: 30, clientY: 7 })
    const addBand = [...container.querySelectorAll('.pb-month-context-item')].find(b => /Add band/.test(b.textContent))
    expect(addBand).toBeTruthy()
    fireEvent.click(addBand)
    const dates = document.querySelector('.pb-editor-popover').querySelectorAll('input[type="date"]')
    expect(dates[0].value).toBe('2026-06-08')
    expect(dates[1].value).toBe('2026-06-09')
  })
})
