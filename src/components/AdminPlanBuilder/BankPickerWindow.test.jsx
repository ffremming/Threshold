import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import BankPickerWindow from './BankPickerWindow'

const TEMPLATES = [
  { id: '1', title: '5x6 min', type: 'interval', intensityZone: 3, activityTag: 'run', notes: '50 min' },
  { id: '2', title: 'Rolig jogg', type: 'continuous', intensityZone: 1, activityTag: 'run', notes: '90 min' },
  { id: '3', title: 'Styrke', type: 'continuous', activityTag: 'strength', notes: '45 min' },
]

function renderPicker() {
  return render(
    <BankPickerWindow
      templates={TEMPLATES}
      onDragStart={() => {}}
      onDragEnd={() => {}}
      onAddTemplate={() => {}}
      visibleActivities={['run', 'strength']}
      onAddActivity={() => {}}
      onRemoveActivity={() => {}}
    />,
  )
}

function searchInput() {
  return screen.getByPlaceholderText('Search sessions…')
}

describe('BankPickerWindow search', () => {
  it('shows all sessions by default', () => {
    renderPicker()
    expect(screen.getByText('5x6 min')).toBeInTheDocument()
    expect(screen.getByText('Rolig jogg')).toBeInTheDocument()
    expect(screen.getByText('Styrke')).toBeInTheDocument()
  })

  it('filters sessions by full-text search', async () => {
    const user = userEvent.setup()
    renderPicker()
    await user.type(searchInput(), 'rolig')
    expect(screen.getByText('Rolig jogg')).toBeInTheDocument()
    expect(screen.queryByText('5x6 min')).not.toBeInTheDocument()
    expect(screen.queryByText('Styrke')).not.toBeInTheDocument()
  })

  it('matches case-insensitively', async () => {
    const user = userEvent.setup()
    renderPicker()
    await user.type(searchInput(), 'STYRKE')
    expect(screen.getByText('Styrke')).toBeInTheDocument()
    expect(screen.queryByText('Rolig jogg')).not.toBeInTheDocument()
  })
})

describe('BankPickerWindow filters', () => {
  it('filters by intensity zone', async () => {
    const user = userEvent.setup()
    renderPicker()
    await user.click(screen.getByText('Z3'))
    expect(screen.getByText('5x6 min')).toBeInTheDocument()
    expect(screen.queryByText('Rolig jogg')).not.toBeInTheDocument()
  })

  it('filters by training focus (Strength)', async () => {
    const user = userEvent.setup()
    renderPicker()
    // "Strength" appears as both a Focus chip and an activity label — target the
    // Focus chip specifically.
    const focusChip = document.querySelector('.th-cat-chip')
    const strengthChip = [...document.querySelectorAll('.th-cat-chip')]
      .find(el => el.textContent === 'Strength')
    expect(focusChip).toBeTruthy()
    await user.click(strengthChip)
    expect(screen.getByText('Styrke')).toBeInTheDocument()
    expect(screen.queryByText('5x6 min')).not.toBeInTheDocument()
    expect(screen.queryByText('Rolig jogg')).not.toBeInTheDocument()
  })

  it('filters by duration preset (90 min +)', async () => {
    const user = userEvent.setup()
    renderPicker()
    await user.click(screen.getByText('90 min +'))
    expect(screen.getByText('Rolig jogg')).toBeInTheDocument()
    expect(screen.queryByText('5x6 min')).not.toBeInTheDocument()
    expect(screen.queryByText('Styrke')).not.toBeInTheDocument()
  })

  it('clears all filters', async () => {
    const user = userEvent.setup()
    renderPicker()
    await user.click(screen.getByText('Z3'))
    expect(screen.queryByText('Rolig jogg')).not.toBeInTheDocument()
    await user.click(screen.getByText('Clear filter'))
    expect(screen.getByText('Rolig jogg')).toBeInTheDocument()
  })
})

describe('BankPickerWindow scopes', () => {
  const GLOBAL = [
    { id: 'g1', title: 'Library threshold', type: 'interval', activityTag: 'run', notes: '60 min' },
  ]
  const ATHLETE = [
    { id: 'a1', title: 'Athlete easy run', type: 'continuous', activityTag: 'run', notes: '40 min' },
  ]

  function renderScoped(extra = {}) {
    return render(
      <BankPickerWindow
        templates={TEMPLATES}
        globalTemplates={GLOBAL}
        athleteSessions={ATHLETE}
        hasAthlete
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onAddTemplate={() => {}}
        visibleActivities={['run', 'strength']}
        onAddActivity={() => {}}
        onRemoveActivity={() => {}}
        {...extra}
      />,
    )
  }

  it('opens on the coach bank (My bank) by default', () => {
    renderScoped()
    expect(screen.getByRole('tab', { name: 'My bank' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('5x6 min')).toBeInTheDocument()
    expect(screen.queryByText('Library threshold')).not.toBeInTheDocument()
    expect(screen.queryByText('Athlete easy run')).not.toBeInTheDocument()
  })

  it('shows global library sessions when the Library scope is picked', async () => {
    const user = userEvent.setup()
    renderScoped()
    await user.click(screen.getByRole('tab', { name: 'Library' }))
    expect(screen.getByText('Library threshold')).toBeInTheDocument()
    expect(screen.queryByText('5x6 min')).not.toBeInTheDocument()
    expect(screen.queryByText('Athlete easy run')).not.toBeInTheDocument()
  })

  it('shows athlete sessions when the Athlete scope is picked', async () => {
    const user = userEvent.setup()
    renderScoped()
    await user.click(screen.getByRole('tab', { name: 'Athlete' }))
    expect(screen.getByText('Athlete easy run')).toBeInTheDocument()
    expect(screen.queryByText('5x6 min')).not.toBeInTheDocument()
    expect(screen.queryByText('Library threshold')).not.toBeInTheDocument()
  })

  it('hides the Athlete scope when no athlete is selected', () => {
    renderScoped({ hasAthlete: false })
    expect(screen.queryByRole('tab', { name: 'Athlete' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'My bank' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Library' })).toBeInTheDocument()
  })

  it('shows a loading message while the active scope is still loading', async () => {
    const user = userEvent.setup()
    renderScoped({ loadingGlobalTemplates: true })
    // My bank is loaded, so the bank sessions show.
    expect(screen.getByText('5x6 min')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Library' }))
    expect(screen.getByText('Loading sessions…')).toBeInTheDocument()
    expect(screen.queryByText('Library threshold')).not.toBeInTheDocument()
  })

  it('resets the active activity tag when switching scope', async () => {
    const user = userEvent.setup()
    renderScoped()
    // Narrow the bank to strength, then switch scope — the run-only Library
    // should still show its session (tag reset), not be filtered out.
    const strengthChip = [...document.querySelectorAll('.pb-filter-chip')]
      .find(el => el.textContent?.includes('Strength'))
    await user.click(strengthChip)
    expect(screen.queryByText('5x6 min')).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Library' }))
    expect(screen.getByText('Library threshold')).toBeInTheDocument()
  })
})
