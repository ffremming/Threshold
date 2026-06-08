import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import MonthWeekSummary from './MonthWeekSummary'

// A run with one steady section: 10 km @ 360 s/km (6:00/km) = 60 min, 10 km.
// Tagged zone 2 → all work minutes land in zone 2.
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

// A bike with one steady section: 20 km @ 120 s/km = 40 min, 20 km. Zone 3.
function bikeWorkout(id) {
  return {
    id,
    activityTag: 'bike',
    type: 'continuous',
    intensityZone: [3],
    blocks: {
      sections: [
        { id: `${id}-s`, kind: 'steady', distanceKm: 20, paceSecPerKm: 120, paceMode: 'pace' },
      ],
    },
  }
}

describe('MonthWeekSummary', () => {
  it('renders total duration for the week', () => {
    const { container } = render(<MonthWeekSummary workouts={[runWorkout('a', 10, 360)]} />)
    // 60 min → "1h"
    expect(container.querySelector('.pb-month-summary-dur')).toHaveTextContent('1h')
  })

  it('renders km by activity, sorted descending, omitting zero-km activities', () => {
    const { container } = render(
      <MonthWeekSummary workouts={[runWorkout('a', 10, 360), bikeWorkout('b')]} />
    )
    expect(screen.getByText('20 km')).toBeInTheDocument()
    expect(screen.getByText('10 km')).toBeInTheDocument()
    // Highest distance first.
    const values = [...container.querySelectorAll('.pb-month-km-item')].map(el => el.textContent)
    const idx20 = values.findIndex(t => t.includes('20 km'))
    const idx10 = values.findIndex(t => t.includes('10 km'))
    expect(idx20).toBeGreaterThanOrEqual(0)
    expect(idx20).toBeLessThan(idx10)
  })

  it('renders a zone bar with per-zone minutes in its title', () => {
    const { container } = render(<MonthWeekSummary workouts={[runWorkout('a', 10, 360)]} />)
    const bar = container.querySelector('.pb-month-zonebar')
    expect(bar).toBeInTheDocument()
    // 60 min in zone 2.
    expect(bar.getAttribute('title')).toContain('Z2 1h')
  })

  it('renders a per-zone legend with label and minutes for each active zone', () => {
    const { container } = render(<MonthWeekSummary workouts={[runWorkout('a', 10, 360)]} />)
    const items = [...container.querySelectorAll('.pb-month-zonelist-item')]
    // Only zone 2 has minutes for this workout.
    expect(items).toHaveLength(1)
    expect(items[0].textContent).toContain('Z2')
    expect(items[0].textContent).toContain('1h')
  })

  it('renders nothing for an empty week', () => {
    const { container } = render(<MonthWeekSummary workouts={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
