import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import WorkoutList from './WorkoutList'

// A run with one steady section: 10 km @ 360 s/km (6:00/km) = 60 min. These
// sessions carry their time as structured blocks, NOT a flat `duration` field.
function runWorkout(id, distanceKm, paceSecPerKm) {
  return {
    id,
    activityTag: 'run',
    type: 'continuous',
    intensityZone: [2],
    blocks: {
      sections: [
        { id: `${id}-s`, kind: 'steady', distanceKm, paceSecPerKm, paceMode: 'pace' },
      ],
    },
  }
}

function renderList(workouts) {
  return render(
    <WorkoutList
      loading={false}
      workouts={workouts}
      workoutDays={[]}
      doneCount={0}
      homeWorkoutLayout="list"
      canManageWorkouts={false}
      activeHomeAthlete={null}
      setSelectedWorkout={() => {}}
      handleToggleComplete={() => {}}
    />
  )
}

describe('WorkoutList — Planned total', () => {
  it('sums structured-block duration, not a flat duration field', () => {
    // Three 60-min runs = 180 min = 3 h.
    renderList([
      runWorkout('a', 10, 360),
      runWorkout('b', 10, 360),
      runWorkout('c', 10, 360),
    ])
    expect(screen.getByText('3 h')).toBeInTheDocument()
  })
})
