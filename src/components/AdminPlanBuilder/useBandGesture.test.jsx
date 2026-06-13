import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBandGesture } from './useBandGesture'

// Fake grid of one week-row, 7 cells 50px wide / 40px tall, Mon..Sun.
// col c → date 2026-06-08 + c, x in [c*50, c*50+50), y in [0, 40).
function fakeGrid() {
  const cells = []
  for (let c = 0; c < 7; c += 1) {
    const day = String(8 + c).padStart(2, '0')
    cells.push({
      dataset: { date: `2026-06-${day}` },
      getBoundingClientRect: () => ({
        left: c * 50, right: c * 50 + 50, top: 0, bottom: 40, width: 50, height: 40,
      }),
    })
  }
  return { querySelectorAll: () => cells }
}

// Center x of column c (so dateUnderPoint lands squarely on that day).
const colX = c => c * 50 + 25

// jsdom drops fields off synthetic PointerEvents; dispatch plain Events with
// the fields the handlers read attached directly (mirrors PlanAnnotations.test).
function down(x, y) {
  const ev = new Event('pointerdown', { bubbles: true })
  ev.button = 0; ev.clientX = x; ev.clientY = y
  return ev
}
function winEvt(type, x, y) {
  act(() => {
    const ev = new Event(type)
    ev.clientX = x; ev.clientY = y
    window.dispatchEvent(ev)
  })
}

function setup(over = {}) {
  const onResizeBand = vi.fn()
  const onDraw = vi.fn()
  const gridRef = { current: fakeGrid() }
  const { result } = renderHook(() =>
    useBandGesture({ gridRef, onResizeBand, onDraw, ...over }))
  return { result, onResizeBand, onDraw }
}

describe('useBandGesture — resize', () => {
  const band = { id: 'b1', startDate: '2026-06-09', endDate: '2026-06-11' } // Tue..Thu

  it('dragging the end edge to a later day commits the new endDate', () => {
    const { result, onResizeBand } = setup()
    act(() => result.current.beginResize(band, 'end', down(colX(2), 20)))
    winEvt('pointermove', colX(5), 20) // Sat
    winEvt('pointerup', colX(5), 20)
    expect(onResizeBand).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'b1', startDate: '2026-06-09', endDate: '2026-06-13' }),
    )
  })

  it('dragging the start edge earlier commits the new startDate', () => {
    const { result, onResizeBand } = setup()
    act(() => result.current.beginResize(band, 'start', down(colX(1), 20)))
    winEvt('pointermove', colX(0), 20) // Mon
    winEvt('pointerup', colX(0), 20)
    expect(onResizeBand).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'b1', startDate: '2026-06-08', endDate: '2026-06-11' }),
    )
  })

  it('dragging the end edge past the start swaps them so the band never inverts', () => {
    const { result, onResizeBand } = setup()
    act(() => result.current.beginResize(band, 'end', down(colX(2), 20)))
    winEvt('pointermove', colX(0), 20) // Mon, before the start (Tue)
    winEvt('pointerup', colX(0), 20)
    const saved = onResizeBand.mock.calls[0][0]
    expect(saved.startDate).toBe('2026-06-08')
    expect(saved.endDate).toBe('2026-06-09')
  })

  it('exposes a live preview span during the drag and clears it on release', () => {
    const { result } = setup()
    act(() => result.current.beginResize(band, 'end', down(colX(2), 20)))
    winEvt('pointermove', colX(4), 20)
    expect(result.current.preview).toMatchObject({
      bandId: 'b1', startDate: '2026-06-09', endDate: '2026-06-12',
    })
    winEvt('pointerup', colX(4), 20)
    expect(result.current.preview).toBeNull()
  })

  it('a release with no date change is a no-op (does not call onResizeBand)', () => {
    const { result, onResizeBand } = setup()
    act(() => result.current.beginResize(band, 'end', down(colX(2), 20)))
    winEvt('pointerup', colX(2), 20) // never moved
    expect(onResizeBand).not.toHaveBeenCalled()
  })
})

describe('useBandGesture — draw', () => {
  it('drawing from one day to another calls onDraw with the ordered range', () => {
    const { result, onDraw } = setup()
    act(() => result.current.beginDraw(down(colX(1), 20)))
    winEvt('pointermove', colX(4), 20) // Fri
    winEvt('pointerup', colX(4), 20)
    expect(onDraw).toHaveBeenCalledWith(
      { startDate: '2026-06-09', endDate: '2026-06-12' },
      expect.objectContaining({ x: colX(4), y: 20 }),
    )
  })

  it('a single-day draw (no move) still creates a one-day range', () => {
    const { result, onDraw } = setup()
    act(() => result.current.beginDraw(down(colX(2), 20)))
    winEvt('pointerup', colX(2), 20)
    expect(onDraw).toHaveBeenCalledWith(
      { startDate: '2026-06-10', endDate: '2026-06-10' },
      expect.anything(),
    )
  })

  it('orders the range when dragging right-to-left (backwards)', () => {
    const { result, onDraw } = setup()
    act(() => result.current.beginDraw(down(colX(4), 20)))
    winEvt('pointermove', colX(1), 20) // Tue, before the anchor
    winEvt('pointerup', colX(1), 20)
    expect(onDraw).toHaveBeenCalledWith(
      { startDate: '2026-06-09', endDate: '2026-06-12' },
      expect.anything(),
    )
  })

  it('exposes a live draw preview during the gesture', () => {
    const { result } = setup()
    act(() => result.current.beginDraw(down(colX(1), 20)))
    winEvt('pointermove', colX(3), 20)
    expect(result.current.preview).toMatchObject({
      drawing: true, startDate: '2026-06-09', endDate: '2026-06-11',
    })
    winEvt('pointerup', colX(3), 20)
    expect(result.current.preview).toBeNull()
  })

  it('ignores a non-primary button', () => {
    const { result, onDraw } = setup()
    const ev = new Event('pointerdown', { bubbles: true })
    ev.button = 2; ev.clientX = colX(1); ev.clientY = 20
    act(() => result.current.beginDraw(ev))
    winEvt('pointerup', colX(1), 20)
    expect(onDraw).not.toHaveBeenCalled()
  })
})
