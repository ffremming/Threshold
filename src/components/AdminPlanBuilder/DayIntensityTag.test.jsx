import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DayIntensityTag from './DayIntensityTag'

describe('DayIntensityTag', () => {
  it('cycles none → hard → easy → rest → none on click', () => {
    const onChange = vi.fn()
    const { rerender } = render(<DayIntensityTag value={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenLastCalledWith('hard')
    rerender(<DayIntensityTag value="hard" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenLastCalledWith('easy')
    rerender(<DayIntensityTag value="easy" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenLastCalledWith('rest')
    rerender(<DayIntensityTag value="rest" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('labels the current tag', () => {
    render(<DayIntensityTag value="hard" onChange={() => {}} />)
    expect(screen.getByRole('button')).toHaveAccessibleName(/hard/i)
  })
})
