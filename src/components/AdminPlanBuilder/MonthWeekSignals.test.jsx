import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import MonthWeekSignals from './MonthWeekSignals'

describe('MonthWeekSignals', () => {
  it('renders load, ramp, and ACWR band for a populated week', () => {
    render(<MonthWeekSignals signal={{
      load: 412, rampPct: 18.4, acwr: 1.35, readiness: 'caution', settling: false,
    }} />)
    expect(screen.getByText(/412/)).toBeInTheDocument()
    expect(screen.getByText(/\+18%/)).toBeInTheDocument()
    expect(screen.getByText(/1\.3/)).toBeInTheDocument()
    expect(screen.getByText(/caution/i)).toBeInTheDocument()
  })

  it('shows a down arrow / negative ramp', () => {
    render(<MonthWeekSignals signal={{
      load: 305, rampPct: -26, acwr: 0.92, readiness: 'safe', settling: false,
    }} />)
    expect(screen.getByText(/-26%/)).toBeInTheDocument()
  })

  it('marks the ramp chip hot when the magnitude exceeds 30%', () => {
    const { container } = render(<MonthWeekSignals signal={{
      load: 500, rampPct: 45, acwr: 1.6, readiness: 'spike', settling: false,
    }} />)
    expect(container.querySelector('.pb-signal-ramp')).toHaveClass('is-hot')
  })

  it('does not mark the ramp chip hot for a moderate change', () => {
    const { container } = render(<MonthWeekSignals signal={{
      load: 305, rampPct: -26, acwr: 0.92, readiness: 'safe', settling: false,
    }} />)
    expect(container.querySelector('.pb-signal-ramp')).not.toHaveClass('is-hot')
  })

  it('renders a muted dash for ramp when rampPct is null', () => {
    const { container } = render(<MonthWeekSignals signal={{
      load: 200, rampPct: null, acwr: 1.0, readiness: 'safe', settling: false,
    }} />)
    expect(container.querySelector('.pb-signal-ramp')).toHaveTextContent('—')
  })

  it('renders a settling state instead of a band when settling', () => {
    render(<MonthWeekSignals signal={{
      load: 200, rampPct: 5, acwr: 0, readiness: null, settling: true,
    }} />)
    expect(screen.getByText(/settling/i)).toBeInTheDocument()
  })

  it('shows the baseline state (not "ACWR 0.00") when there is no band, even if not settling', () => {
    render(<MonthWeekSignals signal={{
      load: 200, rampPct: 5, acwr: 0, readiness: null, settling: false,
    }} />)
    expect(screen.getByText(/settling/i)).toBeInTheDocument()
    expect(screen.queryByText(/ACWR/)).not.toBeInTheDocument()
  })

  it('renders nothing only when the signal is missing', () => {
    const { container } = render(<MonthWeekSignals signal={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a muted Load 0 bar for a zero-load week (with ramp + band)', () => {
    const { container } = render(<MonthWeekSignals signal={{
      load: 0, rampPct: -100, acwr: 0.4, readiness: 'undertraining', settling: false,
    }} />)
    expect(container.querySelector('.pb-month-signals')).toHaveClass('is-empty')
    expect(container.querySelector('.pb-signal-value')).toHaveTextContent('0')
    expect(screen.getByText(/-100%/)).toBeInTheDocument()
    expect(screen.getByText(/undertraining/i)).toBeInTheDocument()
  })
})
