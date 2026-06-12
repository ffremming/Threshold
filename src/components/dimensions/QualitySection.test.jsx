import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('react-chartjs-2', () => ({ Line: () => <div data-testid="line-chart" /> }))
vi.mock('react-body-highlighter', () => ({
  default: ({ data }) => <div data-testid="body-model" data-regions={(data || []).length} />,
}))

import QualitySection from './QualitySection'

// weeklyStats mimics the analysis dashboard shape: each entry carries .workouts.
const weeklyStats = [
  { workouts: [{ activityTag: 'run', type: 'continuous', intensityZone: [2], notes: '60 min' }] },
  {
    workouts: [
      { activityTag: 'run', type: 'interval', intensityZone: [4], notes: '40 min' },
      {
        activityTag: 'strength',
        blocks: { sections: [{ kind: 'exercise', exerciseId: 'Barbell_Full_Squat', sets: 5, reps: 5 }] },
      },
    ],
  },
]

describe('QualitySection (analysis)', () => {
  it('renders the trend chart over the window', () => {
    render(<QualitySection weeklyStats={weeklyStats} labels={['w1', 'w2']} currentVisibleIndex={1} />)
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByText('Training quality over time')).toBeInTheDocument()
  })

  it('shows the window muscle heatmap when strength work is present', () => {
    render(<QualitySection weeklyStats={weeklyStats} labels={['w1', 'w2']} currentVisibleIndex={1} />)
    expect(screen.getByText('Muscles trained in this period')).toBeInTheDocument()
    expect(screen.getAllByTestId('body-model').length).toBeGreaterThan(0)
  })

  it('hides the heatmap for a strength-free window', () => {
    const cardioOnly = [{ workouts: [{ activityTag: 'run', type: 'continuous', intensityZone: [2], notes: '60 min' }] }]
    render(<QualitySection weeklyStats={cardioOnly} labels={['w1']} currentVisibleIndex={0} />)
    expect(screen.queryByText('Muscles trained in this period')).not.toBeInTheDocument()
  })
})
