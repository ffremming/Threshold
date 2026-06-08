import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import RelationshipSection from './RelationshipSection'

// Stub ui primitives to plain elements so we test this component in isolation.
vi.mock('../ui', () => ({
  Button: ({ children, ...p }) => <button {...p}>{children}</button>,
  IconButton: ({ children, ariaLabel, ...p }) => <button aria-label={ariaLabel} {...p}>{children}</button>,
  Section: ({ title, children }) => <section><h2>{title}</h2>{children}</section>,
}))

const base = {
  title: 'Coaches',
  subtitle: '',
  emptyLabel: 'none',
  addLabel: 'Add coach',
  assignTitle: 'Pick',
  noneLeftLabel: 'no more',
  unassigned: [],
  onAdd: vi.fn(),
  onRemove: vi.fn(),
}

describe('RelationshipSection hideEmail', () => {
  it('shows email by default', () => {
    render(<RelationshipSection {...base} members={[{ uid: 'c1', displayName: 'Coach One', email: 'c1@x.com' }]} />)
    expect(screen.getByText('c1@x.com')).toBeInTheDocument()
  })

  it('hides email when hideEmail is set', () => {
    render(<RelationshipSection {...base} hideEmail members={[{ uid: 'c1', displayName: 'Coach One', email: 'c1@x.com' }]} />)
    expect(screen.queryByText('c1@x.com')).not.toBeInTheDocument()
    expect(screen.getByText('Coach One')).toBeInTheDocument()
  })
})
