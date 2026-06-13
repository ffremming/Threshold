import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Charts rely on a real canvas, which jsdom does not provide. Stub them so the
// timetable (the part under test) renders without a canvas context.
vi.mock('react-chartjs-2', () => ({ Doughnut: () => null }))
// Stub the body figure so the heatmap's show/hide is testable without the lib.
vi.mock('react-body-highlighter', () => ({
  default: ({ data }) => <div data-testid="body-model" data-regions={(data || []).length} />,
}))

import WeekOverview from './WeekOverview'

const WORKOUTS = [
  { id: 'w1', title: 'Morning run', type: 'easy', weekday: 1, activityTag: 'run', durationMinutes: 45 },
]

const STRENGTH_WORKOUT = {
  id: 's1',
  title: 'Leg day',
  weekday: 2,
  activityTag: 'strength',
  blocks: { sections: [{ kind: 'exercise', exerciseId: 'Barbell_Full_Squat', exerciseName: 'Squat', sets: 5, reps: 5 }] },
}

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
    expect(onAddSessionToDay).toHaveBeenCalledWith(1, expect.anything())
  })

  it('dragging a session does not also start a whole-day drag', () => {
    // The session cell sits inside the day body, which is itself draggable
    // (whole-day move). dragstart bubbles, so without stopPropagation the day
    // handler clobbers the session drag and you can only ever move the day.
    const onWorkoutDragStart = vi.fn()
    const onDayDragStart = vi.fn()
    render(
      <WeekOverview
        workouts={WORKOUTS}
        onSelectWorkout={() => {}}
        dnd={{
          onWorkoutDragStart,
          onWorkoutDragEnd: () => {},
          onDayDragStart,
          getDayDropZoneProps: () => ({}),
          getCellDropZoneProps: () => ({}),
          isWorkoutDragging: () => false,
          isCellDropTarget: () => false,
          isDayDropTarget: () => false,
        }}
      />
    )
    const cell = screen.getByText('Morning run').closest('.wo-cell')
    cell.dispatchEvent(new Event('dragstart', { bubbles: true }))
    expect(onWorkoutDragStart).toHaveBeenCalledTimes(1)
    expect(onDayDragStart).not.toHaveBeenCalled()
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

describe('WeekOverview training-quality widget + muscle heatmap', () => {
  it('renders the training-quality widget for the week', () => {
    const { container } = render(<WeekOverview workouts={WORKOUTS} onSelectWorkout={() => {}} />)
    expect(screen.getByText('Training quality this week')).toBeInTheDocument()
    expect(container.querySelector('svg.q-radar')).toBeTruthy()
  })

  it('renders the daily load chart above the week view', () => {
    // A session with a parseable duration so it produces a nonzero Edwards load.
    const withLoad = [
      { id: 'r1', title: 'Z2 run', type: 'continuous', weekday: 1, activityTag: 'run', intensityZone: [2], notes: '60 min' },
    ]
    const { container } = render(<WeekOverview workouts={withLoad} onSelectWorkout={() => {}} />)
    expect(screen.getByText('Daily load')).toBeInTheDocument()
    expect(container.querySelector('.dlc')).toBeTruthy()
  })

  it('hides the muscle heatmap on a pure-cardio week', () => {
    render(<WeekOverview workouts={WORKOUTS} onSelectWorkout={() => {}} />)
    expect(screen.queryByText('Muscles worked this week')).not.toBeInTheDocument()
    expect(screen.queryByTestId('body-model')).not.toBeInTheDocument()
  })

  it('shows the muscle heatmap when the week contains strength work', () => {
    render(<WeekOverview workouts={[...WORKOUTS, STRENGTH_WORKOUT]} onSelectWorkout={() => {}} />)
    expect(screen.getByText('Muscles worked this week')).toBeInTheDocument()
    expect(screen.getAllByTestId('body-model').length).toBeGreaterThan(0)
  })
})
