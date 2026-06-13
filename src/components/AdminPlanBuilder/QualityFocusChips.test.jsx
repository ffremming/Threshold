import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import QualityFocusChips from './QualityFocusChips'

describe('QualityFocusChips', () => {
  it('renders a chip per quality and marks selected ones', () => {
    render(<QualityFocusChips selected={['threshold']} onChange={() => {}} />)
    const thr = screen.getByRole('button', { name: /threshold/i })
    expect(thr).toHaveAttribute('aria-pressed', 'true')
    const vo2 = screen.getByRole('button', { name: /vo2max/i })
    expect(vo2).toHaveAttribute('aria-pressed', 'false')
  })

  it('toggles a quality on click', () => {
    const onChange = vi.fn()
    render(<QualityFocusChips selected={['threshold']} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /vo2max/i }))
    expect(onChange).toHaveBeenCalledWith(['threshold', 'vo2max'])
    fireEvent.click(screen.getByRole('button', { name: /threshold/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
