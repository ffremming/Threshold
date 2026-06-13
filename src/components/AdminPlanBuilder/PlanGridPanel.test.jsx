import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlanGridPanel from './PlanGridPanel'

const weeks = [
  { week: 1, year: 2026, monday: new Date('2026-01-05'), sunday: new Date('2026-01-11'), key: '2026-01' },
]
const baseProps = (over = {}) => ({
  visiblePanelIds: ['calendar'],
  currentWeek: 1,
  currentYear: 2026,
  overviewWeeks: weeks,
  overviewWorkoutsByWeekKey: { '2026-01': [{ id: 'w1', title: 'Easy run', activityTag: 'run', weekday: 1, week: 1, year: 2026 }] },
  selectedWeekKey: '2026-01',
  loadingOverview: false,
  dragState: null,
  dropTarget: null,
  handleDropTargetChange: vi.fn(),
  handleDrop: vi.fn(),
  onSelectWorkout: vi.fn(),
  onDeleteWorkout: vi.fn(),
  onAddSessionToDay: vi.fn(),
  onAddTemplateToDayAcross: vi.fn(),
  templates: [],
  visibleActivities: [],
  addVisibleActivity: vi.fn(),
  removeVisibleActivity: vi.fn(),
  onAddManySessions: vi.fn(),
  onMoveMany: vi.fn(),
  onDeleteMany: vi.fn(),
  onPlacementChange: vi.fn(),
  modalOpen: false,
  onJumpToWeek: vi.fn(),
  handleWorkoutDragStart: vi.fn(),
  handleDragEnd: vi.fn(),
  plan: { bands: [], notes: [], goals: [], weekTargets: [], planSettings: null },
  planActions: {},
  noteAuthor: 'coach',
  resolveMuscles: () => [],
  ...over,
})

describe('PlanGridPanel (quick build)', () => {
  it('renders the month grid (identical look) with the placed session', () => {
    render(<PlanGridPanel {...baseProps()} />)
    expect(screen.getByText('Easy run')).toBeInTheDocument()
  })

  it('shows the settings sidebar with volume, quality balance + Generate', () => {
    render(<PlanGridPanel {...baseProps()} />)
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/hard sessions/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/threshold weight/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
  })

  it('has a unit toggle (Time / Distance)', () => {
    render(<PlanGridPanel {...baseProps()} />)
    expect(screen.getByRole('button', { name: /^time$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^distance$/i })).toBeInTheDocument()
  })
})
