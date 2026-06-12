import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import DailyLoadChart from './DailyLoadChart'

// groupWorkoutsByWeekday-shaped input.
const day = (value, shortLabel, workouts = []) => ({ value, shortLabel, workouts })
const z2run = (min) => ({ activityTag: 'run', type: 'continuous', intensityZone: [2],
  blocks: { sections: [{ kind: 'steady', paceMode: 'time', durationMin: min }] } })

describe('DailyLoadChart', () => {
  it('renders a labelled bar per day with the day load (Edwards TRIMP)', () => {
    const days = [
      day(1, 'Mon', [z2run(60)]), // 60 min Z2 -> load 120
      day(2, 'Tue'),
      day(3, 'Wed', [z2run(30)]), // 30 min Z2 -> load 60
      day(4, 'Thu'),
      day(5, 'Fri'),
      day(6, 'Sat'),
      day(7, 'Sun'),
    ]
    render(<DailyLoadChart days={days} />)
    expect(screen.getByText('Daily load')).toBeInTheDocument()
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Sun')).toBeInTheDocument()
    // Monday's load value (120) shown
    expect(screen.getByText('120')).toBeInTheDocument()
    // week total (120 + 60 = 180)
    expect(screen.getByText('180')).toBeInTheDocument()
  })

  it('renders nothing for an empty week', () => {
    const days = [1, 2, 3, 4, 5, 6, 7].map((v) => day(v, `d${v}`))
    const { container } = render(<DailyLoadChart days={days} />)
    expect(container.firstChild).toBeNull()
  })
})
