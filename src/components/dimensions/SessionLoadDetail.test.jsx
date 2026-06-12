import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import SessionLoadDetail from './SessionLoadDetail'

describe('SessionLoadDetail', () => {
  it('shows the total load and each quality as a specific load that sums to the total', () => {
    // dose split 40/54/24 of total 118 dose -> loads ~ 40/54/24 share of 118 load
    const { container } = render(
      <SessionLoadDetail
        score={{ load: 118, dims: { threshold: 40, vo2max: 54, endurance: 24, speed: 0, strength: 0 } }}
      />
    )
    expect(screen.getByText('Session load')).toBeInTheDocument()
    // labels present for the three non-zero qualities, zero omitted
    expect(screen.getByText('VO2max')).toBeInTheDocument()
    expect(screen.getByText('Threshold')).toBeInTheDocument()
    expect(screen.getByText('Endurance')).toBeInTheDocument()
    expect(screen.queryByText('Speed')).not.toBeInTheDocument()

    // The per-quality load numbers should sum (approximately) to the total load.
    const loads = [...container.querySelectorAll('.sld-legend-load')].map((el) => Number(el.textContent))
    expect(loads).toHaveLength(3)
    const sum = loads.reduce((a, b) => a + b, 0)
    expect(Math.abs(sum - 118)).toBeLessThanOrEqual(2) // rounding tolerance
    // no percent signs anywhere
    expect(container.textContent).not.toMatch(/%/)
  })

  it('renders nothing without a score', () => {
    const { container } = render(<SessionLoadDetail score={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('handles a zero-dose session (load only, no bar)', () => {
    const { container } = render(<SessionLoadDetail score={{ load: 0, dims: {} }} />)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(container.querySelector('.sld-bar')).toBeNull()
  })
})
