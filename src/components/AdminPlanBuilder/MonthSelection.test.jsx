import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import MonthGridPanel from './MonthGridPanel'

const WEEKS = [
  { week: 21, year: 2026, monday: new Date(2026, 4, 18), sunday: new Date(2026, 4, 24), key: '2026-21' },
  { week: 22, year: 2026, monday: new Date(2026, 4, 25), sunday: new Date(2026, 4, 31), key: '2026-22' },
]

const BY_KEY = {
  // W21 Monday (weekday 1): one session we will copy.
  '2026-21': [{ id: 's1', title: 'Intervals', type: 'interval', intensityZone: [4], week: 21, year: 2026, weekday: 1 }],
  '2026-22': [],
}

function baseProps(overrides = {}) {
  return {
    visiblePanelIds: ['bank', 'calendar'],
    overviewWeeks: WEEKS,
    overviewWorkoutsByWeekKey: BY_KEY,
    selectedWeekKey: '2026-21',
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
    onJumpToWeek: () => {},
    handleWorkoutDragStart: () => {},
    handleDragEnd: () => {},
    ...overrides,
  }
}

// Give each day cell a deterministic rect so the marquee can "intersect" it.
// Layout: each cell 100px wide, rows 100px tall, keyed by data-cell-key.
function stubCellRects(container) {
  const cells = container.querySelectorAll('[data-cell-key]')
  cells.forEach(el => {
    const [year, week, weekday] = el.dataset.cellKey.split('-').map(Number)
    const rowIndex = WEEKS.findIndex(w => w.week === week && w.year === year)
    const x = (weekday - 1) * 100
    const y = rowIndex * 100
    el.getBoundingClientRect = () => ({
      left: x, right: x + 100, top: y, bottom: y + 100, width: 100, height: 100, x, y,
    })
  })
}

beforeEach(() => vi.restoreAllMocks())

// jsdom's synthetic PointerEvent does not carry clientX/clientY, so dispatch a
// plain Event with the coords attached (the hook reads e.clientX/Y directly).
function pointerMoveAt(target, clientX, clientY) {
  const ev = new Event('pointermove', { bubbles: true })
  ev.clientX = clientX
  ev.clientY = clientY
  target.dispatchEvent(ev)
}
function pointerUp(target) {
  target.dispatchEvent(new Event('pointerup', { bubbles: true }))
}

describe('Month marquee selection + copy/paste', () => {
  it('marquee-selects a day cell and pastes it (one batched write) anchored to the hovered day', async () => {
    const onAddManySessions = vi.fn()
    const { container } = render(<MonthGridPanel {...baseProps({ onAddManySessions })} />)
    stubCellRects(container)

    const grid = container.querySelector('.pb-month-grid')

    // Marquee over W21 Monday cell (x 0–100, y 0–100).
    act(() => {
      fireEvent(grid, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 5, clientY: 5 }))
      pointerMoveAt(window, 95, 95)
      pointerUp(window)
    })

    const mondayW21 = container.querySelector('[data-cell-key="2026-21-1"]')
    expect(mondayW21.className).toContain('is-selected-cell')

    // Copy.
    fireEvent.keyDown(document, { key: 'c', ctrlKey: true })

    // Hover W22 Thursday (weekday 4), then paste.
    const thuW22 = container.querySelector('[data-cell-key="2026-22-4"]')
    fireEvent.pointerEnter(thuW22)
    fireEvent.keyDown(document, { key: 'v', ctrlKey: true })

    await Promise.resolve(); await Promise.resolve()

    // Single batched call containing all pasted sessions.
    expect(onAddManySessions).toHaveBeenCalledTimes(1)
    const items = onAddManySessions.mock.calls[0][0]
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ week: 22, year: 2026, weekday: 4 })
    expect(items[0].session).toMatchObject({ title: 'Intervals' })
    expect(items[0].session.id).toBeUndefined() // snapshot strips identity
  })

  it('does not copy/paste while typing in an input', async () => {
    const onAddManySessions = vi.fn()
    const { container } = render(
      <div>
        <input data-testid="field" />
        <MonthGridPanel {...baseProps({ onAddManySessions })} />
      </div>
    )
    stubCellRects(container)
    const grid = container.querySelector('.pb-month-grid')
    act(() => {
      fireEvent(grid, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 5, clientY: 5 }))
      pointerMoveAt(window, 95, 95)
      pointerUp(window)
    })

    const input = screen.getByTestId('field')
    input.focus()
    fireEvent.keyDown(input, { key: 'c', ctrlKey: true })
    const thuW22 = container.querySelector('[data-cell-key="2026-22-4"]')
    fireEvent.pointerEnter(thuW22)
    fireEvent.keyDown(input, { key: 'v', ctrlKey: true })
    await Promise.resolve()

    expect(onAddManySessions).not.toHaveBeenCalled()
  })

  it('drags the whole selection by grabbing a selected cell, without re-marqueeing', async () => {
    const onMoveMany = vi.fn()
    const { container } = render(<MonthGridPanel {...baseProps({ onMoveMany })} />)
    stubCellRects(container)
    const grid = container.querySelector('.pb-month-grid')

    // Select W21 Monday (the cell with the session).
    act(() => {
      fireEvent(grid, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 5, clientY: 5 }))
      pointerMoveAt(window, 95, 95)
      pointerUp(window)
    })
    const mondayW21 = container.querySelector('[data-cell-key="2026-21-1"]')
    expect(mondayW21.className).toContain('is-selected-cell')

    // Pressing inside the selected cell must NOT start a new marquee (which would
    // clear the selection) — it begins the selection drag instead.
    act(() => {
      fireEvent(mondayW21, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 10, clientY: 10 }))
    })
    expect(container.querySelector('[data-cell-key="2026-21-1"]').className).toContain('is-selected-cell')

    // Native drag the selected cell and drop on W22 Thursday → moveMany.
    const thuW22 = container.querySelector('[data-cell-key="2026-22-4"]')
    await act(async () => {
      fireEvent.dragStart(mondayW21)
      fireEvent.dragOver(thuW22)
      fireEvent.drop(thuW22)
    })

    expect(onMoveMany).toHaveBeenCalledTimes(1)
    expect(onMoveMany.mock.calls[0][0]).toEqual([
      { id: 's1', week: 22, year: 2026, weekday: 4 },
    ])
  })

  it('shows a destination ghost and dims the original while dragging the selection', () => {
    const { container } = render(<MonthGridPanel {...baseProps()} />)
    stubCellRects(container)
    const grid = container.querySelector('.pb-month-grid')

    // Select W21 Monday (holds session s1 "Intervals").
    act(() => {
      fireEvent(grid, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 5, clientY: 5 }))
      pointerMoveAt(window, 95, 95)
      pointerUp(window)
    })
    const mondayW21 = container.querySelector('[data-cell-key="2026-21-1"]')

    // Begin the selection drag and hover over W22 Thursday.
    const thuW22 = container.querySelector('[data-cell-key="2026-22-4"]')
    act(() => {
      fireEvent.dragStart(mondayW21)
      fireEvent.dragOver(thuW22)
    })

    // A dashed ghost chip appears in the destination cell…
    const ghost = thuW22.querySelector('.pb-month-chip--ghost')
    expect(ghost).not.toBeNull()
    expect(ghost.textContent).toContain('Intervals')

    // …and the original chip in the source cell is dimmed.
    expect(mondayW21.querySelector('.pb-month-chip.is-ghosting')).not.toBeNull()
  })

  it('keeps the marquee selection through the click that ends the drag', () => {
    const { container } = render(<MonthGridPanel {...baseProps()} />)
    stubCellRects(container)
    const grid = container.querySelector('.pb-month-grid')

    // Drag-select W21 Monday: down at (5,5), move to (95,95), up.
    act(() => {
      fireEvent(grid, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 5, clientY: 5 }))
      pointerMoveAt(window, 95, 95)
      pointerUp(window)
    })
    // The browser fires a trailing click after the drag — at the up position.
    fireEvent.click(grid, { clientX: 95, clientY: 95 })

    expect(container.querySelector('[data-cell-key="2026-21-1"]').className).toContain('is-selected-cell')
  })

  it('clears the selection on a plain click (no drag) on a dead spot', () => {
    const { container } = render(<MonthGridPanel {...baseProps()} />)
    stubCellRects(container)
    const grid = container.querySelector('.pb-month-grid')

    // Select W21 Monday via a drag.
    act(() => {
      fireEvent(grid, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 5, clientY: 5 }))
      pointerMoveAt(window, 95, 95)
      pointerUp(window)
    })
    fireEvent.click(grid, { clientX: 95, clientY: 95 }) // trailing drag-click keeps it
    expect(container.querySelector('.is-selected-cell')).not.toBeNull()

    // A later plain click (down and up at the same spot) on a dead area clears it.
    const deadSpot = container.querySelector('.pb-month-head')
    act(() => {
      fireEvent(grid, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 200, clientY: 200 }))
      pointerUp(window)
    })
    fireEvent.click(deadSpot, { clientX: 200, clientY: 200 })

    expect(container.querySelector('.is-selected-cell')).toBeNull()
  })

  it('hides the active-week row outline on open, shows it on jump, hides it on dead-spot click', () => {
    const onJumpToWeek = vi.fn()
    const { container } = render(<MonthGridPanel {...baseProps({ onJumpToWeek })} />)

    const row = () => [...container.querySelectorAll('.pb-month-row')]
      .find(r => r.querySelector('[data-cell-key^="2026-21-"]'))

    // On opening the month view the outline is hidden, even for the active week.
    expect(row().className).not.toContain('is-selected')

    // Open a week from its label → outline appears.
    fireEvent.click(container.querySelectorAll('.pb-month-week-label')[0])
    expect(onJumpToWeek).toHaveBeenCalled()
    expect(row().className).toContain('is-selected')

    // Click a dead spot → outline suppressed again.
    fireEvent.click(container.querySelector('.pb-month-head'))
    expect(row().className).not.toContain('is-selected')
  })
})
