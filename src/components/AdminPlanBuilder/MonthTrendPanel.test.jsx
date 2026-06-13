import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// react-chartjs-2 renders a <canvas> that jsdom can't paint; stub <Line> so we
// test the panel's switcher behavior, not chart.js rendering.
vi.mock('react-chartjs-2', () => ({
  Line: ({ data }) => (
    <div
      data-testid="trend-line"
      data-primary={JSON.stringify(data.datasets[0].data)}
      data-count={data.datasets.length}
      data-labels={JSON.stringify(data.datasets.map(d => d.label))}
    />
  ),
}))

import MonthTrendPanel from './MonthTrendPanel'

const SERIES = [
  { key: '2026-23', label: 'W23', distance: 10, duration: 60, load: 100, activityDistance: { run: 10 },
    dims: { threshold: 10, vo2max: 20, speed: 0, strength: 5, muscular_endurance: 8, endurance: 40 } },
  { key: '2026-24', label: 'W24', distance: 20, duration: 90, load: 200, activityDistance: { run: 20 },
    dims: { threshold: 30, vo2max: 25, speed: 12, strength: 15, muscular_endurance: 18, endurance: 60 } },
]

describe('MonthTrendPanel', () => {
  it('renders a metric switcher with Distance/Duration/Load', () => {
    render(<MonthTrendPanel series={SERIES} />)
    expect(screen.getByRole('button', { name: /distance/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /duration/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /load/i })).toBeInTheDocument()
  })

  it('defaults to distance and switches the chart data on metric click', () => {
    render(<MonthTrendPanel series={SERIES} />)
    expect(screen.getByTestId('trend-line')).toHaveAttribute('data-primary', '[10,20]')
    fireEvent.click(screen.getByRole('button', { name: /duration/i }))
    expect(screen.getByTestId('trend-line')).toHaveAttribute('data-primary', '[60,90]')
  })

  it('moves the is-active class to the selected metric button', () => {
    render(<MonthTrendPanel series={SERIES} />)
    expect(screen.getByRole('button', { name: /distance/i })).toHaveClass('is-active')
    expect(screen.getByRole('button', { name: /duration/i })).not.toHaveClass('is-active')
    fireEvent.click(screen.getByRole('button', { name: /duration/i }))
    expect(screen.getByRole('button', { name: /duration/i })).toHaveClass('is-active')
    expect(screen.getByRole('button', { name: /distance/i })).not.toHaveClass('is-active')
  })

  it('renders a Quality option that switches to the six-quality multi-line view', () => {
    render(<MonthTrendPanel series={SERIES} />)
    const qualityBtn = screen.getByRole('button', { name: /quality/i })
    expect(qualityBtn).toBeInTheDocument()
    fireEvent.click(qualityBtn)
    expect(qualityBtn).toHaveClass('is-active')
    const line = screen.getByTestId('trend-line')
    expect(line).toHaveAttribute('data-count', '6')
    // First quality line in QUALITY_ORDER is threshold → [10, 30].
    expect(line).toHaveAttribute('data-primary', '[10,30]')
  })
})
