import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { useUndo } from './useUndo'

describe('useUndo', () => {
  it('runs the last registered action on Cmd/Ctrl+Z, once, then clears', async () => {
    const run = vi.fn(async () => {})
    const { result } = renderHook(() => useUndo({ enabled: true }))
    act(() => result.current.pushUndo(run))

    await act(async () => { fireEvent.keyDown(document, { key: 'z', ctrlKey: true }) })
    expect(run).toHaveBeenCalledTimes(1)

    // Second press is a no-op (slot cleared).
    await act(async () => { fireEvent.keyDown(document, { key: 'z', ctrlKey: true }) })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('ignores Cmd/Ctrl+Z while typing in an input', async () => {
    const run = vi.fn(async () => {})
    const { result } = renderHook(() => useUndo({ enabled: true }))
    act(() => result.current.pushUndo(run))

    const input = document.createElement('input')
    document.body.appendChild(input)
    await act(async () => { fireEvent.keyDown(input, { key: 'z', ctrlKey: true }) })
    expect(run).not.toHaveBeenCalled()
    input.remove()
  })

  it('ignores Shift+Cmd/Ctrl+Z (reserved for redo) and does nothing when disabled', async () => {
    const run = vi.fn(async () => {})
    const { result, rerender } = renderHook(
      ({ enabled }) => useUndo({ enabled }),
      { initialProps: { enabled: true } }
    )
    act(() => result.current.pushUndo(run))
    await act(async () => { fireEvent.keyDown(document, { key: 'z', ctrlKey: true, shiftKey: true }) })
    expect(run).not.toHaveBeenCalled()

    rerender({ enabled: false })
    await act(async () => { fireEvent.keyDown(document, { key: 'z', ctrlKey: true }) })
    expect(run).not.toHaveBeenCalled()
  })
})
