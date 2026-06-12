import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Capture the data handed to the chart so we can assert the view transform,
// without needing a real canvas.
let lastData = null
vi.mock('react-chartjs-2', () => ({
  Line: ({ data }) => {
    lastData = data
    return <div data-testid="line-chart" data-datasets={data.datasets.length} />
  },
}))

import QualityTrendChart from './QualityTrendChart'

const WEEKLY = [
  { threshold: 20, endurance: 55, vo2max: 10, speed: 15, strength: 60 },
  { threshold: 50, endurance: 66, vo2max: 18, speed: 20, strength: 50 },
  { threshold: 80, endurance: 74, vo2max: 34, speed: 34, strength: 34 },
  { threshold: 0, endurance: 0, vo2max: 0, speed: 0, strength: 0 },
]
const LABELS = ['w1', 'w2', 'w3', 'w4']

describe('QualityTrendChart', () => {
  it('renders five quality lines and starts on the stimulus view', () => {
    render(<QualityTrendChart weeklyDims={WEEKLY} labels={LABELS} nowIndex={2} />)
    expect(screen.getByTestId('line-chart')).toHaveAttribute('data-datasets', '5')
    expect(screen.getByRole('tablist')).toHaveAttribute('data-view', 'stimulus')
    // Stimulus view shows the raw weekly value (threshold 80 in week 3).
    const threshold = lastData.datasets.find(d => d.label === 'Threshold')
    expect(threshold.data[2]).toBe(80)
  })

  it('switching to buildup transforms the series (decay accumulation)', async () => {
    const user = userEvent.setup()
    render(<QualityTrendChart weeklyDims={WEEKLY} labels={LABELS} nowIndex={2} />)
    await user.click(screen.getByRole('tab', { name: 'Buildup' }))
    expect(screen.getByRole('tablist')).toHaveAttribute('data-view', 'buildup')
    // Buildup accumulates: week-3 threshold is no longer the raw 80.
    const threshold = lastData.datasets.find(d => d.label === 'Threshold')
    expect(threshold.data[2]).not.toBe(80)
    // Week-4 (stimulus 0) should still carry residual buildup (> 0) due to decay.
    expect(threshold.data[3]).toBeGreaterThan(0)
  })
})
