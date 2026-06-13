import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import QuickBuildSidebar from './QuickBuildSidebar'

const weeks = [
  { week: 1, year: 2026, monday: new Date('2026-01-05'), sunday: new Date('2026-01-11'), key: '2026-01' },
  { week: 2, year: 2026, monday: new Date('2026-01-12'), sunday: new Date('2026-01-18'), key: '2026-02' },
]

describe('QuickBuildSidebar', () => {
  it('renders all parameter groups', () => {
    render(<QuickBuildSidebar overviewWeeks={weeks} onGenerate={() => {}} />)
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/weekly ramp/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/hard sessions/i)).toBeInTheDocument()
    // a quality weight slider per quality (at least threshold + vo2max present)
    expect(screen.getByLabelText(/threshold weight/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/vo2max weight/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
  })

  it('switches the volume unit', () => {
    render(<QuickBuildSidebar overviewWeeks={weeks} onGenerate={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /^distance$/i }))
    expect(screen.getByLabelText(/start distance/i)).toBeInTheDocument()
  })

  it('passes all parameters to onGenerate', () => {
    const onGenerate = vi.fn()
    render(<QuickBuildSidebar overviewWeeks={weeks} onGenerate={onGenerate} />)
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '300' } })
    fireEvent.change(screen.getByLabelText(/weekly ramp/i), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText(/hard sessions/i), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText(/vo2max weight/i), { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: /generate/i }))
    expect(onGenerate).toHaveBeenCalledTimes(1)
    const [range, opts] = onGenerate.mock.calls[0]
    expect(range.length).toBe(2) // both visible weeks by default
    expect(opts).toMatchObject({ startVolume: 300, unit: 'time', rampPct: 8, hardPerWeek: 3 })
    expect(opts.qualityWeights.vo2max).toBe(60)
  })

  it('disables Generate until a start volume is set', () => {
    render(<QuickBuildSidebar overviewWeeks={weeks} onGenerate={() => {}} />)
    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '300' } })
    expect(screen.getByRole('button', { name: /generate/i })).not.toBeDisabled()
  })
})
