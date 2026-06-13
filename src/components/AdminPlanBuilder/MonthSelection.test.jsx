import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import MonthGridPanel from './MonthGridPanel'

const WEEKS = [
  { week: 21, year: 2026, monday: new Date(2026, 4, 18), sunday: new Date(2026, 4, 24), key: '2026-21' },
  { week: 22, year: 2026, monday: new Date(2026, 4, 25), sunday: new Date(2026, 4, 31), key: '2026-22' },
]

const BY_KEY = {
  // W21 Monday (weekday 1): s1 — the session we marquee/copy/move.
  // W21 Wednesday (weekday 3): s2 — a second session, used to prove the marquee
  // only grabs the chips it actually touches.
  '2026-21': [
    { id: 's1', title: 'Intervals', type: 'interval', intensityZone: [4], week: 21, year: 2026, weekday: 1 },
    { id: 's2', title: 'Easy run', type: 'easy', intensityZone: [2], week: 21, year: 2026, weekday: 3 },
  ],
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
    onDeleteMany: vi.fn(),
    onJumpToWeek: () => {},
    handleWorkoutDragStart: () => {},
    handleDragEnd: () => {},
    ...overrides,
  }
}

// Give each session chip a deterministic rect so the marquee can "intersect" it.
// Layout mirrors the grid: a chip sits at its (weekday, week-row) cell position,
// each cell 100px wide / 100px tall, keyed by data-session-id.
const CHIP_POS = {
  s1: { weekday: 1, week: 21, year: 2026 },
  s2: { weekday: 3, week: 21, year: 2026 },
}
function stubChipRects(container) {
  const wraps = container.querySelectorAll('[data-session-id]')
  wraps.forEach(el => {
    const pos = CHIP_POS[el.dataset.sessionId]
    if (!pos) return
    const rowIndex = WEEKS.findIndex(w => w.week === pos.week && w.year === pos.year)
    const x = (pos.weekday - 1) * 100
    const y = rowIndex * 100
    el.getBoundingClientRect = () => ({
      left: x + 10, right: x + 90, top: y + 10, bottom: y + 90, width: 80, height: 80, x: x + 10, y: y + 10,
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

function chip(container, id) {
  return container.querySelector(`[data-session-id="${id}"] .pb-month-chip`)
}

describe('Month marquee selection + copy/paste (session-level)', () => {
  it('marquee-selects only the session chips the rectangle touches', () => {
    const { container } = render(<MonthGridPanel {...baseProps()} />)
    stubChipRects(container)
    const grid = container.querySelector('.pb-month-grid')

    // Marquee over Monday's chip (x 10–90, y 10–90) only — not Wednesday's.
    act(() => {
      fireEvent(grid, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 0, clientY: 0 }))
      pointerMoveAt(window, 95, 95)
      pointerUp(window)
    })

    expect(chip(container, 's1').className).toContain('is-selected')
    expect(chip(container, 's2').className).not.toContain('is-selected')
  })

  it('starts a marquee from on top of a day’s "+" add button', () => {
    const onAddSessionToDay = vi.fn()
    const { container } = render(<MonthGridPanel {...baseProps({ onAddSessionToDay })} />)
    stubChipRects(container)

    // Press down on a "+" add button (Monday W21), then drag down-right across
    // Monday's chip and release → marquee activates and selects s1.
    const addBtn = container.querySelectorAll('.pb-month-row')[0].querySelector('.pb-month-add')
    act(() => {
      fireEvent(addBtn, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 0, clientY: 0 }))
      pointerMoveAt(window, 95, 95)
      pointerUp(window)
    })

    expect(chip(container, 's1').className).toContain('is-selected')
    expect(onAddSessionToDay).not.toHaveBeenCalled() // a real drag, not a click
  })

  it('a plain press on the "+" add button adds a session and does not start a marquee', () => {
    const onAddSessionToDay = vi.fn()
    const { container } = render(<MonthGridPanel {...baseProps({ onAddSessionToDay })} />)
    stubChipRects(container)

    const addBtn = container.querySelectorAll('.pb-month-row')[0].querySelector('.pb-month-add')
    // Press + release with no movement → not a marquee; the click adds a session.
    act(() => {
      fireEvent(addBtn, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 5, clientY: 5 }))
      pointerUp(window)
    })
    fireEvent.click(addBtn, { clientX: 5, clientY: 5 })

    expect(onAddSessionToDay).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.pb-month-chip.is-selected')).toBeNull()
  })

  it('marquee-selects a session and pastes it (one batched write) anchored to the hovered day', async () => {
    const onAddManySessions = vi.fn()
    const { container } = render(<MonthGridPanel {...baseProps({ onAddManySessions })} />)
    stubChipRects(container)
    const grid = container.querySelector('.pb-month-grid')

    // Marquee over Monday's chip only.
    act(() => {
      fireEvent(grid, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 0, clientY: 0 }))
      pointerMoveAt(window, 95, 95)
      pointerUp(window)
    })
    expect(chip(container, 's1').className).toContain('is-selected')

    // Copy.
    fireEvent.keyDown(document, { key: 'c', ctrlKey: true })

    // Hover W22 Thursday (weekday 4), then paste.
    const thuW22 = container.querySelectorAll('.pb-month-row')[1].querySelectorAll('.pb-month-cell')[3]
    fireEvent.pointerEnter(thuW22)
    fireEvent.keyDown(document, { key: 'v', ctrlKey: true })

    await Promise.resolve(); await Promise.resolve()

    expect(onAddManySessions).toHaveBeenCalledTimes(1)
    const items = onAddManySessions.mock.calls[0][0]
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ week: 22, year: 2026, weekday: 4 })
    expect(items[0].session).toMatchObject({ title: 'Intervals' })
    expect(items[0].session.id).toBeUndefined() // snapshot strips identity
  })

  it('toggles a single session into the selection with ⌘/Ctrl+click', () => {
    const onSelectWorkout = vi.fn()
    const { container } = render(<MonthGridPanel {...baseProps({ onSelectWorkout })} />)
    stubChipRects(container)

    // ⌘/Ctrl+click selects without opening the editor.
    fireEvent.click(chip(container, 's2'), { ctrlKey: true })
    expect(chip(container, 's2').className).toContain('is-selected')
    expect(onSelectWorkout).not.toHaveBeenCalled()

    // A plain click opens the editor and does not select.
    fireEvent.click(chip(container, 's1'))
    expect(onSelectWorkout).toHaveBeenCalledTimes(1)
    expect(chip(container, 's1').className).not.toContain('is-selected')
  })

  it('does not copy/paste while typing in an input', async () => {
    const onAddManySessions = vi.fn()
    const { container } = render(
      <div>
        <input data-testid="field" />
        <MonthGridPanel {...baseProps({ onAddManySessions })} />
      </div>
    )
    stubChipRects(container)
    const grid = container.querySelector('.pb-month-grid')
    act(() => {
      fireEvent(grid, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 0, clientY: 0 }))
      pointerMoveAt(window, 95, 95)
      pointerUp(window)
    })

    const input = screen.getByTestId('field')
    input.focus()
    fireEvent.keyDown(input, { key: 'c', ctrlKey: true })
    const thuW22 = container.querySelectorAll('.pb-month-row')[1].querySelectorAll('.pb-month-cell')[3]
    fireEvent.pointerEnter(thuW22)
    fireEvent.keyDown(input, { key: 'v', ctrlKey: true })
    await Promise.resolve()

    expect(onAddManySessions).not.toHaveBeenCalled()
  })

  it('drags the whole selection by grabbing a selected chip', async () => {
    const onMoveMany = vi.fn()
    const { container } = render(<MonthGridPanel {...baseProps({ onMoveMany })} />)
    stubChipRects(container)
    const grid = container.querySelector('.pb-month-grid')

    // Select s1 via marquee.
    act(() => {
      fireEvent(grid, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 0, clientY: 0 }))
      pointerMoveAt(window, 95, 95)
      pointerUp(window)
    })
    expect(chip(container, 's1').className).toContain('is-selected')

    // Native drag the selected chip and drop on W22 Thursday → moveMany.
    const thuW22 = container.querySelectorAll('.pb-month-row')[1].querySelectorAll('.pb-month-cell')[3]
    await act(async () => {
      fireEvent.dragStart(chip(container, 's1'))
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
    stubChipRects(container)
    const grid = container.querySelector('.pb-month-grid')

    // Select s1 ("Intervals").
    act(() => {
      fireEvent(grid, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 0, clientY: 0 }))
      pointerMoveAt(window, 95, 95)
      pointerUp(window)
    })

    const thuW22 = container.querySelectorAll('.pb-month-row')[1].querySelectorAll('.pb-month-cell')[3]
    act(() => {
      fireEvent.dragStart(chip(container, 's1'))
      fireEvent.dragOver(thuW22)
    })

    // A dashed ghost chip appears in the destination cell…
    const ghost = thuW22.querySelector('.pb-month-chip--ghost')
    expect(ghost).not.toBeNull()
    expect(ghost.textContent).toContain('Intervals')

    // …and the original chip is dimmed.
    expect(chip(container, 's1').className).toContain('is-ghosting')
  })

  it('keeps the marquee selection through the click that ends the drag', () => {
    const { container } = render(<MonthGridPanel {...baseProps()} />)
    stubChipRects(container)
    const grid = container.querySelector('.pb-month-grid')

    act(() => {
      fireEvent(grid, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 0, clientY: 0 }))
      pointerMoveAt(window, 95, 95)
      pointerUp(window)
    })
    // The browser fires a trailing click after the drag — at the up position.
    fireEvent.click(grid, { clientX: 95, clientY: 95 })

    expect(chip(container, 's1').className).toContain('is-selected')
  })

  it('clears the selection on a plain click (no drag) on a dead spot', () => {
    const { container } = render(<MonthGridPanel {...baseProps()} />)
    stubChipRects(container)
    const grid = container.querySelector('.pb-month-grid')

    act(() => {
      fireEvent(grid, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 0, clientY: 0 }))
      pointerMoveAt(window, 95, 95)
      pointerUp(window)
    })
    fireEvent.click(grid, { clientX: 95, clientY: 95 }) // trailing drag-click keeps it
    expect(container.querySelector('.pb-month-chip.is-selected')).not.toBeNull()

    // A later plain click on a dead area clears it.
    const deadSpot = container.querySelector('.pb-month-head')
    act(() => {
      fireEvent(grid, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 300, clientY: 300 }))
      pointerUp(window)
    })
    fireEvent.click(deadSpot, { clientX: 300, clientY: 300 })

    expect(container.querySelector('.pb-month-chip.is-selected')).toBeNull()
  })

  it('hides the active-week row outline on open, shows it on jump, hides it on dead-spot click', () => {
    const onJumpToWeek = vi.fn()
    const { container } = render(<MonthGridPanel {...baseProps({ onJumpToWeek })} />)

    const row = () => container.querySelectorAll('.pb-month-row')[0]

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

describe('Right-click Copy/Cut placement', () => {
  // Marquee-select s1 (W21 Monday).
  function selectS1(container) {
    const grid = container.querySelector('.pb-month-grid')
    act(() => {
      fireEvent(grid, Object.assign(new Event('pointerdown', { bubbles: true }), { button: 0, clientX: 0, clientY: 0 }))
      pointerMoveAt(window, 95, 95)
      pointerUp(window)
    })
  }
  // The W22 Thursday cell (row 2, weekday 4).
  function thuW22(container) {
    return container.querySelectorAll('.pb-month-row')[1].querySelectorAll('.pb-month-cell')[3]
  }

  it('opens the menu only when right-clicking inside the selection', () => {
    const { container } = render(<MonthGridPanel {...baseProps()} />)
    stubChipRects(container)
    selectS1(container) // s1 selected, s2 not

    // Right-click the UNselected chip → no menu.
    fireEvent.contextMenu(container.querySelector('[data-session-id="s2"]'))
    expect(container.querySelector('.pb-month-context-menu')).toBeNull()

    // Right-click the selected chip → menu appears.
    fireEvent.contextMenu(container.querySelector('[data-session-id="s1"]'))
    expect(container.querySelector('.pb-month-context-menu')).not.toBeNull()
  })

  it('Copy then clicking a day creates a duplicate there (batched), originals kept', async () => {
    const onAddManySessions = vi.fn()
    const onMoveMany = vi.fn()
    const { container } = render(<MonthGridPanel {...baseProps({ onAddManySessions, onMoveMany })} />)
    stubChipRects(container)
    selectS1(container)

    fireEvent.contextMenu(container.querySelector('[data-session-id="s1"]'))
    fireEvent.click(container.querySelectorAll('.pb-month-context-item')[0]) // Copy

    // Hover W22 Thursday, then click to place.
    const target = thuW22(container)
    fireEvent.pointerEnter(target)
    await act(async () => { fireEvent.click(target) })

    expect(onMoveMany).not.toHaveBeenCalled()
    expect(onAddManySessions).toHaveBeenCalledTimes(1)
    const items = onAddManySessions.mock.calls[0][0]
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ week: 22, year: 2026, weekday: 4 })
    expect(items[0].session).toMatchObject({ title: 'Intervals' })
    expect(items[0].session.id).toBeUndefined() // copy strips identity
  })

  it('Cut deletes the originals immediately, then placing recreates them at the target', async () => {
    const onAddManySessions = vi.fn()
    const onMoveMany = vi.fn()
    const onDeleteMany = vi.fn()
    const { container } = render(<MonthGridPanel {...baseProps({ onAddManySessions, onMoveMany, onDeleteMany })} />)
    stubChipRects(container)
    selectS1(container)

    fireEvent.contextMenu(container.querySelector('[data-session-id="s1"]'))
    await act(async () => { fireEvent.click(container.querySelectorAll('.pb-month-context-item')[1]) }) // Cut

    // Originals are deleted the moment you cut.
    expect(onDeleteMany).toHaveBeenCalledTimes(1)
    expect(onDeleteMany.mock.calls[0][0]).toEqual(['s1'])

    const target = thuW22(container)
    fireEvent.pointerEnter(target)
    await act(async () => { fireEvent.click(target) })

    // Placing recreates (never moves) — the originals no longer exist.
    expect(onMoveMany).not.toHaveBeenCalled()
    expect(onAddManySessions).toHaveBeenCalledTimes(1)
    const items = onAddManySessions.mock.calls[0][0]
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ week: 22, year: 2026, weekday: 4 })
    expect(items[0].session).toMatchObject({ title: 'Intervals' })
    expect(items[0].session.id).toBeUndefined()
  })

  it('right-click while holding sessions discards them (no placement write)', async () => {
    const onAddManySessions = vi.fn()
    const { container } = render(<MonthGridPanel {...baseProps({ onAddManySessions })} />)
    stubChipRects(container)
    selectS1(container)

    fireEvent.contextMenu(container.querySelector('[data-session-id="s1"]'))
    fireEvent.click(container.querySelectorAll('.pb-month-context-item')[0]) // Copy
    expect(container.querySelector('.pb-month-grid.is-placing')).not.toBeNull()

    // Right-click anywhere → discard the in-hand sessions.
    fireEvent.contextMenu(container.querySelector('.pb-month-grid'))
    expect(container.querySelector('.pb-month-grid.is-placing')).toBeNull()

    // A later click on a day does nothing now.
    const target = thuW22(container)
    fireEvent.pointerEnter(target)
    fireEvent.click(target)
    expect(onAddManySessions).not.toHaveBeenCalled()
  })

  it('previews the armed sessions as a ghost at the hovered day', () => {
    const { container } = render(<MonthGridPanel {...baseProps()} />)
    stubChipRects(container)
    selectS1(container)

    fireEvent.contextMenu(container.querySelector('[data-session-id="s1"]'))
    fireEvent.click(container.querySelectorAll('.pb-month-context-item')[0]) // Copy

    const target = thuW22(container)
    act(() => { fireEvent.pointerEnter(target) })

    const ghost = target.querySelector('.pb-month-chip--ghost')
    expect(ghost).not.toBeNull()
    expect(ghost.textContent).toContain('Intervals')
  })

  it('Esc cancels an armed placement without writing', () => {
    const onAddManySessions = vi.fn()
    const { container } = render(<MonthGridPanel {...baseProps({ onAddManySessions })} />)
    stubChipRects(container)
    selectS1(container)

    fireEvent.contextMenu(container.querySelector('[data-session-id="s1"]'))
    fireEvent.click(container.querySelectorAll('.pb-month-context-item')[0]) // Copy
    expect(container.querySelector('.pb-month-grid.is-placing')).not.toBeNull()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(container.querySelector('.pb-month-grid.is-placing')).toBeNull()

    // A later click on a day does nothing now.
    const target = thuW22(container)
    fireEvent.pointerEnter(target)
    fireEvent.click(target)
    expect(onAddManySessions).not.toHaveBeenCalled()
  })
})
