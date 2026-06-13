import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WeekRulePanel from './WeekRulePanel'

const target = {
  id: 't', week: 3, year: 2026, base: true, distanceKm: 30, durationMin: 180,
  distribution: { run: 100 }, qualities: ['threshold'], dayTags: {}, deload: false,
}

describe('WeekRulePanel', () => {
  it('shows distance and time target inputs', () => {
    render(<WeekRulePanel weekTarget={target} resolvedTarget={{ distanceKm: 30, durationMin: 180, source: 'typed' }} workouts={[]} onChange={() => {}} />)
    expect(screen.getByLabelText(/distance \(km\)/i)).toHaveValue(30)
    expect(screen.getByLabelText(/time \(min\)/i)).toHaveValue(180)
  })

  it('edits the distance target', () => {
    const onChange = vi.fn()
    render(<WeekRulePanel weekTarget={target} resolvedTarget={{ distanceKm: 30, durationMin: 180, source: 'typed' }} workouts={[]} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/distance \(km\)/i), { target: { value: '40' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ distanceKm: 40, base: true }))
  })

  it('renders a ramped read-out when the week is derived', () => {
    const derived = { ...target, base: false, distanceKm: null, durationMin: null }
    render(<WeekRulePanel weekTarget={derived} resolvedTarget={{ distanceKm: 33, durationMin: 198, source: 'ramped' }} workouts={[]} onChange={() => {}} />)
    expect(screen.getByText(/ramped/i)).toBeInTheDocument()
  })

  it('renders a distance progress bar', () => {
    render(<WeekRulePanel weekTarget={target} resolvedTarget={{ distanceKm: 30, durationMin: 180, source: 'typed' }} workouts={[]} onChange={() => {}} />)
    expect(screen.getByTestId('bar-distance')).toBeInTheDocument()
  })
})
