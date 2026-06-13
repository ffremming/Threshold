import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import QuickBuildSidebar from './QuickBuildSidebar'

const weeks = [
  { week: 1, year: 2026, monday: new Date('2026-01-05'), sunday: new Date('2026-01-11'), key: '2026-01' },
  { week: 2, year: 2026, monday: new Date('2026-01-12'), sunday: new Date('2026-01-18'), key: '2026-02' },
]

// Default: one 'run' activity row seeded so the panel is usable immediately.
const render1 = (onGenerate = () => {}) =>
  render(<QuickBuildSidebar overviewWeeks={weeks} onGenerate={onGenerate} />)

describe('QuickBuildSidebar (per-activity)', () => {
  it('renders an activity row with volume + unit toggle (no per-activity hard toggle)', () => {
    render1()
    const row = screen.getByTestId('activity-row-run')
    expect(within(row).getByLabelText(/running volume/i)).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: /running distance unit/i })).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: /running time unit/i })).toBeInTheDocument()
    expect(within(row).queryByRole('checkbox', { name: /hard/i })).not.toBeInTheDocument()
  })

  it('renders the hard-days input, ramp, week span, and quality sliders', () => {
    render1()
    expect(screen.getByLabelText(/hard days/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/weekly ramp/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/from week/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/threshold weight/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/vo2max weight/i)).toBeInTheDocument()
  })

  it('renders an editable weekday-role row pre-set to hard Tue/Thu/Sat and long Sun', () => {
    render1()
    // each weekday is a button labelled with its current role
    expect(screen.getByRole('button', { name: /tuesday: hard/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /thursday: hard/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /saturday: hard/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sunday: long/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /monday: easy/i })).toBeInTheDocument()
  })

  it('cycles a weekday role on click and passes dayTags to onGenerate', () => {
    const onGenerate = vi.fn()
    render1(onGenerate)
    fireEvent.change(within(screen.getByTestId('activity-row-run')).getByLabelText(/running volume/i), { target: { value: '60' } })
    // Monday easy → hard on one click
    fireEvent.click(screen.getByRole('button', { name: /monday: easy/i }))
    expect(screen.getByRole('button', { name: /monday: hard/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /generate/i }))
    const [, opts] = onGenerate.mock.calls[0]
    expect(opts.dayTags).toMatchObject({ 1: 'hard', 2: 'hard', 4: 'hard', 6: 'hard', 7: 'long' })
  })

  it('passes per-activity targets, hard days, and quality weights to onGenerate', () => {
    const onGenerate = vi.fn()
    render1(onGenerate)
    const row = screen.getByTestId('activity-row-run')
    fireEvent.change(within(row).getByLabelText(/running volume/i), { target: { value: '60' } })
    fireEvent.click(within(row).getByRole('button', { name: /running distance unit/i }))
    fireEvent.change(screen.getByLabelText(/hard days/i), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText(/weekly ramp/i), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText(/vo2max weight/i), { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: /generate/i }))

    expect(onGenerate).toHaveBeenCalledTimes(1)
    const [range, opts] = onGenerate.mock.calls[0]
    expect(range.length).toBe(2)
    expect(opts.rampPct).toBe(8)
    expect(opts.hardPerWeek).toBe(2)
    expect(opts.qualityWeights.vo2max).toBe(60)
    expect(opts.activities).toEqual([
      expect.objectContaining({ tag: 'run', volume: 60, unit: 'distance' }),
    ])
  })

  it('disables Generate until an activity has a positive volume', () => {
    render1()
    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled()
    const row = screen.getByTestId('activity-row-run')
    fireEvent.change(within(row).getByLabelText(/running volume/i), { target: { value: '60' } })
    expect(screen.getByRole('button', { name: /generate/i })).not.toBeDisabled()
  })
})
