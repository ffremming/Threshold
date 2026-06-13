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
