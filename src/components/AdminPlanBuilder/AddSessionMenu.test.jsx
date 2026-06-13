import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AddSessionMenu from './AddSessionMenu'

const baseProps = (overrides = {}) => ({
  at: { x: 100, y: 100 },
  templates: [{ id: 't1', title: 'Easy run', activityTag: 'running', type: 'easy' }],
  visibleActivities: ['running'],
  onAddActivity: vi.fn(),
  onRemoveActivity: vi.fn(),
  onCreateNew: vi.fn(),
  onPickTemplate: vi.fn(),
  onClose: vi.fn(),
  ...overrides,
})

describe('AddSessionMenu', () => {
  it('shows both choices when templates exist', () => {
    render(<AddSessionMenu {...baseProps()} />)
    expect(screen.getByRole('button', { name: /use existing/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create new/i })).toBeInTheDocument()
  })

  it('hides "Use existing" when the bank is empty', () => {
    render(<AddSessionMenu {...baseProps({ templates: [] })} />)
    expect(screen.queryByRole('button', { name: /use existing/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create new/i })).toBeInTheDocument()
  })

  it('fires onCreateNew and closes when "Create new" clicked', () => {
    const onCreateNew = vi.fn()
    const onClose = vi.fn()
    render(<AddSessionMenu {...baseProps({ onCreateNew, onClose })} />)
    fireEvent.click(screen.getByRole('button', { name: /create new/i }))
    expect(onCreateNew).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows the picker after "Use existing" and places a clicked template', () => {
    const onPickTemplate = vi.fn()
    const onClose = vi.fn()
    render(<AddSessionMenu {...baseProps({ onPickTemplate, onClose })} />)
    fireEvent.click(screen.getByRole('button', { name: /use existing/i }))
    const addBtn = screen.getByRole('button', { name: /add easy run to plan/i })
    fireEvent.click(addBtn)
    expect(onPickTemplate).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
