import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlanGridPanel from './PlanGridPanel'

const weeks = [
  { week: 1, year: 2026, monday: new Date('2026-01-05'), sunday: new Date('2026-01-11'), key: '2026-01' },
]
const baseProps = (over = {}) => ({
  overviewWeeks: weeks,
  overviewWorkoutsByWeekKey: { '2026-01': [{ id: 'w1', title: 'Easy run', activityTag: 'run', weekday: 1, week: 1, year: 2026 }] },
  plan: { bands: [], notes: [], goals: [], weekTargets: [], planSettings: null },
  planActions: { upsertWeekTarget: vi.fn(), removeWeekTarget: vi.fn(), setPlanSettings: vi.fn() },
  templates: [],
  onAddManySessions: vi.fn(),
  onAddSessionToDay: vi.fn(),
  onSelectWorkout: vi.fn(),
  onDeleteWorkout: vi.fn(),
  resolveMuscles: () => [],
  ...over,
})

describe('PlanGridPanel', () => {
  it('renders a week row with the rule panel and the placed session', () => {
    render(<PlanGridPanel {...baseProps()} />)
    expect(screen.getByLabelText(/distance \(km\)/i)).toBeInTheDocument()
    expect(screen.getByText('Easy run')).toBeInTheDocument()
  })

  it('shows a replace button on a placed session', () => {
    render(<PlanGridPanel {...baseProps()} />)
    expect(screen.getByRole('button', { name: /replace easy run/i })).toBeInTheDocument()
  })

  it('has a Generate control', () => {
    render(<PlanGridPanel {...baseProps()} />)
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
  })
})
