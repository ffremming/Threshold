import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import BankPickerWindow from './BankPickerWindow'

const TEMPLATES = [
  { id: '1', title: '5x6 min', type: 'interval', intensityZone: 3, activityTag: 'run' },
  { id: '2', title: 'Rolig jogg', type: 'easy', intensityZone: 1, activityTag: 'run' },
  { id: '3', title: 'Styrke', type: 'strength', intensityZone: 1, activityTag: 'strength' },
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
    />
  )
}

describe('BankPickerWindow search', () => {
  it('shows all sessions by default', () => {
    renderPicker()
    expect(screen.getByText('5x6 min')).toBeInTheDocument()
    expect(screen.getByText('Rolig jogg')).toBeInTheDocument()
    expect(screen.getByText('Styrke')).toBeInTheDocument()
  })

  it('filters sessions by title as the user types', async () => {
    const user = userEvent.setup()
    renderPicker()
    await user.type(screen.getByLabelText('Search sessions by title'), 'rolig')

    expect(screen.getByText('Rolig jogg')).toBeInTheDocument()
    expect(screen.queryByText('5x6 min')).not.toBeInTheDocument()
    expect(screen.queryByText('Styrke')).not.toBeInTheDocument()
  })

  it('matches case-insensitively', async () => {
    const user = userEvent.setup()
    renderPicker()
    await user.type(screen.getByLabelText('Search sessions by title'), 'STYRKE')
    expect(screen.getByText('Styrke')).toBeInTheDocument()
    expect(screen.queryByText('Rolig jogg')).not.toBeInTheDocument()
  })
})
