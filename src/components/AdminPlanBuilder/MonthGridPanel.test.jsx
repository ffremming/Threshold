import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import MonthGridPanel from './MonthGridPanel'

vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="trend-line" />,
}))

const WEEKS = [
  { week: 20, year: 2026, monday: new Date(2026, 4, 11), sunday: new Date(2026, 4, 17), key: '2026-20' },
  { week: 21, year: 2026, monday: new Date(2026, 4, 18), sunday: new Date(2026, 4, 24), key: '2026-21' },
]

const BY_KEY = {
  '2026-20': [{ id: 'a', title: 'Long run', type: 'easy', week: 20, year: 2026, weekday: 3, activityTag: 'run', notes: '60 min' }],
  '2026-21': [],
}

function renderPanel(overrides = {}) {
  const props = {
    visiblePanelIds: ['bank', 'calendar'],
    currentWeek: 20,
    currentYear: 2026,
    overviewWeeks: WEEKS,
    overviewWorkoutsByWeekKey: BY_KEY,
    selectedWeekKey: '2026-20',
    loadingOverview: false,
    dragState: null,
    dropTarget: null,
    handleDropTargetChange: () => {},
    handleDrop: () => {},
    onSelectWorkout: () => {},
    onDeleteWorkout: () => {},
    onAddSessionToDay: () => {},
    onAddTemplateToDayAcross: () => {},
    templates: [],
    visibleActivities: [],
    addVisibleActivity: () => {},
    removeVisibleActivity: () => {},
    onJumpToWeek: () => {},
    handleWorkoutDragStart: () => {},
    handleDragEnd: () => {},
    ...overrides,
  }
  return render(<MonthGridPanel {...props} />)
}

describe('MonthGridPanel', () => {
  beforeEach(() => window.localStorage.clear())

  it('renders one row per overview week', () => {
    renderPanel()
    expect(screen.getByText('W20')).toBeInTheDocument()
    expect(screen.getByText('W21')).toBeInTheDocument()
  })

  it('renders a session in the correct day cell', () => {
    renderPanel()
    expect(screen.getByTitle('Long run')).toBeInTheDocument()
  })

  it('jumps to the week when the week label is clicked', async () => {
    const user = userEvent.setup()
    const onJumpToWeek = vi.fn()
    renderPanel({ onJumpToWeek })
    await user.click(screen.getByLabelText('Open week 21 in the week view'))
    expect(onJumpToWeek).toHaveBeenCalledWith(21, 2026)
  })

  it('adds a session to the right (week, weekday) via the per-day +', async () => {
    const user = userEvent.setup()
    const onAddSessionToDay = vi.fn()
    renderPanel({ onAddSessionToDay, templates: [] })
    // Week 21 (empty) Monday add button opens the menu; empty bank → only "Create new".
    await user.click(screen.getByLabelText('Add a session on Monday, week 21'))
    await user.click(screen.getByRole('button', { name: /create new/i }))
    expect(onAddSessionToDay).toHaveBeenCalledWith(21, 2026, 1)
  })

  it('fires handleDrop with the cell week/year/weekday when a drag is dropped on it', () => {
    const handleDrop = vi.fn()
    const handleDropTargetChange = vi.fn()
    renderPanel({
      handleDrop,
      handleDropTargetChange,
      dragState: { kind: 'template', template: { id: 't', title: 'X' } },
    })
    // Week 21 (empty) Monday cell — find via its add button, then the cell parent.
    const addBtn = screen.getByLabelText('Add a session on Monday, week 21')
    const cell = addBtn.closest('.pb-month-cell')
    fireEvent.dragOver(cell)
    fireEvent.drop(cell)
    expect(handleDropTargetChange).toHaveBeenCalledWith(1, null, 21, 2026)
    expect(handleDrop).toHaveBeenCalledWith(1, null, 21, 2026)
  })

  it('fires onDeleteWorkout from a chip X', async () => {
    const user = userEvent.setup()
    const onDeleteWorkout = vi.fn()
    renderPanel({ onDeleteWorkout })
    await user.click(screen.getByLabelText('Remove Long run'))
    expect(onDeleteWorkout).toHaveBeenCalledWith(BY_KEY['2026-20'][0])
  })

  it('marks empty day cells with is-empty (full-cell add target)', () => {
    const { container } = renderPanel()
    const cells = [...container.querySelectorAll('.pb-month-cell')]
    // One session on weekday 3 of week 20; all other cells are empty.
    const empty = cells.filter(c => c.classList.contains('is-empty'))
    const filled = cells.filter(c => !c.classList.contains('is-empty'))
    expect(filled).toHaveLength(1)
    expect(empty.length).toBe(cells.length - 1)
  })

  it('marks the cell whose date is today with is-today', () => {
    // Build a week whose Monday is the Monday of the real current week, so
    // exactly one cell's date equals today regardless of when the test runs.
    const now = new Date()
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const isoDow = (now.getDay() + 6) % 7 // 0=Mon..6=Sun
    monday.setDate(monday.getDate() - isoDow)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const weeks = [{ week: 99, year: now.getFullYear(), monday, sunday, key: 'now' }]

    const { container } = renderPanel({
      overviewWeeks: weeks,
      overviewWorkoutsByWeekKey: { now: [] },
      selectedWeekKey: 'now',
    })
    const todayCells = [...container.querySelectorAll('.pb-month-cell.is-today')]
    expect(todayCells).toHaveLength(1)
  })

  it('shows a per-day duration and km footer for days with sessions', () => {
    // 10 km @ 360 s/km (6:00/km) = 60 min, 10 km.
    const workout = {
      id: 'd', title: 'Steady', type: 'continuous', week: 20, year: 2026,
      weekday: 2, activityTag: 'run', intensityZone: [2],
      blocks: { sections: [{ id: 'd-s', kind: 'steady', distanceKm: 10, paceSecPerKm: 360, paceMode: 'pace' }] },
    }
    const { container } = renderPanel({
      overviewWorkoutsByWeekKey: { '2026-20': [workout], '2026-21': [] },
    })
    const foots = [...container.querySelectorAll('.pb-month-cell-foot')]
    expect(foots).toHaveLength(1)
    expect(foots[0]).toHaveTextContent('1h')
    expect(foots[0]).toHaveTextContent('10 km')
  })

  it('shows load signals only after toggling them on', () => {
    renderPanel()
    expect(screen.queryByLabelText('Weekly load signals')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /show load signals/i }))
    expect(screen.getAllByLabelText('Weekly load signals').length).toBeGreaterThan(0)
  })

  it('shows the trend chart only after toggling trends on', () => {
    renderPanel()
    expect(screen.queryByLabelText('Training trend chart')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /show trends/i }))
    expect(screen.getByLabelText('Training trend chart')).toBeInTheDocument()
  })
})
