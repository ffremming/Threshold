import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { EMPTY_CRITERIA } from '../../../utils/sessionFilters'
import SessionFilterBar from './index'

function renderBar(props = {}) {
  const set = {
    search: vi.fn(), activities: vi.fn(), toggleZone: vi.fn(), zones: vi.fn(),
    toggleType: vi.fn(), types: vi.fn(), toggleCategory: vi.fn(), categories: vi.fn(),
    duration: vi.fn(), templateCategory: vi.fn(),
  }
  const clearAll = vi.fn()
  render(
    <SessionFilterBar
      criteria={EMPTY_CRITERIA}
      set={set}
      filtersActive={false}
      clearAll={clearAll}
      enabled={['search', 'zones', 'types', 'categories', 'duration']}
      resultCount={3}
      {...props}
    />,
  )
  return { set, clearAll }
}

describe('SessionFilterBar', () => {
  it('renders only the enabled rows', () => {
    render(
      <SessionFilterBar
        criteria={EMPTY_CRITERIA}
        set={{ toggleZone: () => {} }}
        filtersActive={false}
        clearAll={() => {}}
        enabled={['zones']}
      />,
    )
    expect(screen.getByText('Z3')).toBeInTheDocument()
    expect(screen.queryByText('Focus')).not.toBeInTheDocument()
    expect(screen.queryByText('Duration')).not.toBeInTheDocument()
  })

  it('toggles a zone when a zone button is clicked', async () => {
    const user = userEvent.setup()
    const { set } = renderBar()
    await user.click(screen.getByText('Z4'))
    expect(set.toggleZone).toHaveBeenCalledWith(4)
  })

  it('toggles a training category', async () => {
    const user = userEvent.setup()
    const { set } = renderBar()
    await user.click(screen.getByText('VO2max'))
    expect(set.toggleCategory).toHaveBeenCalledWith('vo2max')
  })

  it('selects a duration preset', async () => {
    const user = userEvent.setup()
    const { set } = renderBar()
    await user.click(screen.getByText('30–60 min'))
    expect(set.duration).toHaveBeenCalledWith({ min: 30, max: 60 })
  })

  it('shows the result count', () => {
    renderBar()
    expect(screen.getByText('3 sessions')).toBeInTheDocument()
  })

  it('shows Clear filter only when filters are active', () => {
    renderBar({ filtersActive: true })
    expect(screen.getByText('Clear filter')).toBeInTheDocument()
  })
})
