import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DistributionEditor from './DistributionEditor'

describe('DistributionEditor', () => {
  it('shows a row per active tag with its percentage and the running total', () => {
    render(<DistributionEditor value={{ run: 60, bike: 40 }} onChange={() => {}} />)
    expect(screen.getByLabelText(/running %/i)).toHaveValue(60)
    expect(screen.getByLabelText(/cycling %/i)).toHaveValue(40)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('edits a tag percentage', () => {
    const onChange = vi.fn()
    render(<DistributionEditor value={{ run: 60, bike: 40 }} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/running %/i), { target: { value: '70' } })
    expect(onChange).toHaveBeenCalledWith({ run: 70, bike: 40 })
  })

  it('removes a tag', () => {
    const onChange = vi.fn()
    render(<DistributionEditor value={{ run: 60, bike: 40 }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /remove running/i }))
    expect(onChange).toHaveBeenCalledWith({ bike: 40 })
  })

  it('flags the total when it is not 100', () => {
    render(<DistributionEditor value={{ run: 60, bike: 30 }} onChange={() => {}} />)
    expect(screen.getByText('90%')).toHaveClass('is-off')
  })
})
