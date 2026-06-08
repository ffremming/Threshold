import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const addRelationship = vi.fn(() => Promise.resolve())
const removeRelationship = vi.fn(() => Promise.resolve())
let relCb, coachCb

vi.mock('../../userService', () => ({
  addRelationship: (...a) => addRelationship(...a),
  removeRelationship: (...a) => removeRelationship(...a),
  onRelationshipsSnapshot: (cb) => { relCb = cb; return () => {} },
  onCoachesSnapshot: (cb) => { coachCb = cb; return () => {} },
}))

// Render PageShell children directly; stub nav context.
vi.mock('../ui', async () => {
  const actual = await vi.importActual('../ui')
  return {
    ...actual,
    PageShell: ({ children }) => <div>{children}</div>,
    ShellBrand: ({ title }) => <h1>{title}</h1>,
  }
})
vi.mock('../../App/primaryNav', () => ({ useNav: () => ({ items: [], onChange: vi.fn() }) }))

import MyCoaches from './index'

const me = { uid: 'a1', displayName: 'Athlete One', email: 'a1@x.com' }

function seed() {
  act(() => {
    coachCb([
      { uid: 'c1', displayName: 'Coach One', email: 'c1@x.com', roles: ['coach'], status: 'active' },
      { uid: 'c2', displayName: 'Coach Two', email: 'c2@x.com', roles: ['coach'], status: 'active' },
    ])
    relCb([{ id: 'c1_a1', coachId: 'c1', athleteId: 'a1' }])
  })
}

describe('MyCoaches', () => {
  beforeEach(() => { addRelationship.mockClear(); removeRelationship.mockClear() })

  it('lists current coaches (names only) and adds a coach', () => {
    render(<MyCoaches currentUser={me} onBack={vi.fn()} />)
    seed()

    // current coach shown by name, no email
    expect(screen.getByText('Coach One')).toBeInTheDocument()
    expect(screen.queryByText('c1@x.com')).not.toBeInTheDocument()

    // open the add list and pick the unassigned coach
    fireEvent.click(screen.getByText('Add coach'))
    fireEvent.click(screen.getByText('Coach Two'))
    expect(addRelationship).toHaveBeenCalledWith('c2', 'a1')
  })

  it('removes a coach with confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<MyCoaches currentUser={me} onBack={vi.fn()} />)
    seed()

    fireEvent.click(screen.getByLabelText(/Remove link to Coach One/i))
    expect(removeRelationship).toHaveBeenCalledWith('c1', 'a1')
  })
})
