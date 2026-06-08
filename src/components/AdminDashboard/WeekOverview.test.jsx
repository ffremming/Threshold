import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Charts rely on a real canvas, which jsdom does not provide. Stub them so the
// timetable (the part under test) renders without a canvas context.
vi.mock('react-chartjs-2', () => ({ Doughnut: () => null }))

import WeekOverview from './WeekOverview'

const WORKOUTS = [
  { id: 'w1', title: 'Morning run', type: 'easy', weekday: 1, activityTag: 'run', durationMinutes: 45 },
]

describe('WeekOverview drag/drop opt-in', () => {
  it('renders view-only (no draggable cells) without the dnd prop', () => {
    render(<WeekOverview workouts={WORKOUTS} onSelectWorkout={() => {}} />)
    const cell = screen.getByText('Morning run').closest('.wo-cell')
    expect(cell).toBeInTheDocument()
    expect(cell).not.toHaveAttribute('draggable', 'true')
    expect(cell.className).not.toContain('wo-cell--draggable')
  })

  it('shows no remove X or add + without those callbacks', () => {
    render(
      <WeekOverview
        workouts={WORKOUTS}
        onSelectWorkout={() => {}}
        dnd={{
          onWorkoutDragStart: () => {},
          onWorkoutDragEnd: () => {},
          getDayDropZoneProps: () => ({}),
          getCellDropZoneProps: () => ({}),
          isWorkoutDragging: () => false,
          isCellDropTarget: () => false,
          isDayDropTarget: () => false,
        }}
      />
    )
    expect(screen.queryByLabelText(/^Remove /)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^Add a session on /)).not.toBeInTheDocument()
  })

  it('renders a remove X per session and fires onRemoveWorkout', async () => {
    const user = userEvent.setup()
    const onRemoveWorkout = vi.fn()
    render(
      <WeekOverview
        workouts={WORKOUTS}
        onSelectWorkout={() => {}}
        dnd={{
          onWorkoutDragStart: () => {},
          onWorkoutDragEnd: () => {},
          getDayDropZoneProps: () => ({}),
          getCellDropZoneProps: () => ({}),
          isWorkoutDragging: () => false,
          isCellDropTarget: () => false,
          isDayDropTarget: () => false,
          onRemoveWorkout,
        }}
      />
    )
    await user.click(screen.getByLabelText('Remove Morning run'))
    expect(onRemoveWorkout).toHaveBeenCalledWith(WORKOUTS[0])
  })

  it('renders an add + for every day and fires onAddSessionToDay', async () => {
    const user = userEvent.setup()
    const onAddSessionToDay = vi.fn()
    render(
      <WeekOverview
        workouts={WORKOUTS}
        onSelectWorkout={() => {}}
        dnd={{
          onWorkoutDragStart: () => {},
          onWorkoutDragEnd: () => {},
          getDayDropZoneProps: () => ({}),
          getCellDropZoneProps: () => ({}),
          isWorkoutDragging: () => false,
          isCellDropTarget: () => false,
          isDayDropTarget: () => false,
          onAddSessionToDay,
        }}
      />
    )
    const addButtons = screen.getAllByLabelText(/^Add a session on /)
    expect(addButtons).toHaveLength(7)
    await user.click(addButtons[0])
    expect(onAddSessionToDay).toHaveBeenCalledWith(1)
  })

  it('makes cells draggable when dnd is provided', () => {
    const onWorkoutDragStart = vi.fn()
    render(
      <WeekOverview
        workouts={WORKOUTS}
        onSelectWorkout={() => {}}
        dnd={{
          onWorkoutDragStart,
          onWorkoutDragEnd: () => {},
          getDayDropZoneProps: () => ({}),
          getCellDropZoneProps: () => ({}),
          isWorkoutDragging: () => false,
          isCellDropTarget: () => false,
          isDayDropTarget: () => false,
        }}
      />
    )
    const cell = screen.getByText('Morning run').closest('.wo-cell')
    expect(cell).toHaveAttribute('draggable', 'true')
    expect(cell.className).toContain('wo-cell--draggable')
  })
})
