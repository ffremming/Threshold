import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import SessionLoadDetail from './SessionLoadDetail'

describe('SessionLoadDetail', () => {
  it('shows the load number and a legend of contributing qualities', () => {
    render(
      <SessionLoadDetail
        score={{ load: 118, dims: { threshold: 40, vo2max: 54, endurance: 24, speed: 0, strength: 0 } }}
      />
    )
    expect(screen.getByText('118')).toBeInTheDocument()
    expect(screen.getByText('Session load')).toBeInTheDocument()
    // three non-zero qualities -> three legend entries (zero ones omitted)
    expect(screen.getByText(/VO2max/)).toBeInTheDocument()
    expect(screen.getByText(/Threshold/)).toBeInTheDocument()
    expect(screen.getByText(/Endurance/)).toBeInTheDocument()
    expect(screen.queryByText(/Speed/)).not.toBeInTheDocument()
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
