import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBandGesture } from './useBandGesture'
import { dateUnderPoint } from '../../utils/planGeometry'

// ── Realistic month-grid geometry ───────────────────────────────────────────
// One week-row: a 196px label column on the LEFT, then 7 day cells of 100px each.
// The band strip sits in its own row ABOVE the cells (y 0..18); the day cells are
// the row below (y 18..118). This mirrors the real CSS:
//   .pb-month-row { grid-template-columns: 196px repeat(7, 1fr); }
//   .pb-month-annotations { grid-column: 2 / -1; grid-row: 1; }  (strip)
//   .pb-month-cell { grid-row: 2; }                              (data-date cells)
const LABEL_W = 196
const CELL_W = 100
const STRIP_TOP = 0
const STRIP_BOT = 18
const CELL_TOP = 18
const CELL_BOT = 118

// Day cell c (0..6) → date 2026-06-08 + c, x in [LABEL_W + c*CELL_W, +CELL_W).
function dateOf(c) {
  const day = String(8 + c).padStart(2, '0')
  return `2026-06-${day}`
}
function cellRect(c) {
  const left = LABEL_W + c * CELL_W
  return { left, right: left + CELL_W, top: CELL_TOP, bottom: CELL_BOT, width: CELL_W, height: CELL_BOT - CELL_TOP }
}
function gridWithCells() {
  const cells = []
  for (let c = 0; c < 7; c += 1) {
    cells.push({ dataset: { date: dateOf(c) }, getBoundingClientRect: () => cellRect(c) })
  }
  return { querySelectorAll: () => cells }
}

// x at the CENTER of column c (where a click squarely on a day lands).
const centerX = c => LABEL_W + c * CELL_W + CELL_W / 2
// x at the LEFT edge of column c (where a band pill's start handle sits).
const leftEdgeX = c => LABEL_W + c * CELL_W
// x at the RIGHT edge of column c (where a band pill's end handle sits).
const rightEdgeX = c => LABEL_W + c * CELL_W + CELL_W
// y in the band strip (above the cells) — where the handles physically are.
const stripY = (STRIP_TOP + STRIP_BOT) / 2

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

describe('dateUnderPoint with realistic geometry (label column + strip above cells)', () => {
  const grid = gridWithCells()

  it('resolves a point in the strip (above cells) to the column directly below', () => {
    // Cursor over column 2 (Wed) center, but up in the strip row.
    expect(dateUnderPoint(centerX(2), stripY, grid)).toBe(dateOf(2))
  })

  it('a point at the LEFT edge of a column resolves to THAT column (boundary → right)', () => {
    // x at col2.left == col1.right. The "right wins" rule resolves to col 2.
    expect(dateUnderPoint(leftEdgeX(2), stripY, grid)).toBe(dateOf(2))
  })

  it('a point just inside a column (past its center) resolves to that column', () => {
    // A cursor 1px right of col 2's left edge is clearly inside col 2.
    expect(dateUnderPoint(leftEdgeX(2) + 1, stripY, grid)).toBe(dateOf(2))
    // A cursor 1px left of col 2's right edge is still inside col 2.
    expect(dateUnderPoint(rightEdgeX(2) - 1, stripY, grid)).toBe(dateOf(2))
  })

  it('a point exactly on a shared boundary resolves to the column to its RIGHT', () => {
    // x at col2.right == col3.left. Visually the cursor is entering col 3.
    // Deterministic rule: nearest center wins; on an exact tie, prefer the right.
    const boundary = rightEdgeX(2) // == leftEdgeX(3)
    const date = dateUnderPoint(boundary, stripY, grid)
    expect([dateOf(2), dateOf(3)]).toContain(date) // must be deterministic, not garbage
    expect(date).toBe(dateOf(3))
  })

  it('a point in the 196px label gutter resolves to the FIRST day, not a wrong one', () => {
    // Cursor still in the label column (x < LABEL_W).
    expect(dateUnderPoint(50, stripY, grid)).toBe(dateOf(0))
  })
})

describe('resize end handle commits the correct endDate', () => {
  it('grabbing the end handle and not moving is a no-op', () => {
    const onResizeBand = vi.fn()
    const grid = gridWithCells()
    const { result } = renderHook(() => useBandGesture({ gridRef: { current: grid }, onResizeBand, onDraw: vi.fn() }))
    const band = { id: 'b', startDate: dateOf(1), endDate: dateOf(3) } // Tue..Thu
    // End handle physically sits at the RIGHT edge of col 3 (Thu).
    act(() => result.current.beginResize(band, 'end', down(rightEdgeX(3), stripY)))
    winEvt('pointerup', rightEdgeX(3), stripY)
    expect(onResizeBand).not.toHaveBeenCalled()
  })

  it('dragging the end handle one day right extends the band by exactly one day', () => {
    const onResizeBand = vi.fn()
    const grid = gridWithCells()
    const { result } = renderHook(() => useBandGesture({ gridRef: { current: grid }, onResizeBand, onDraw: vi.fn() }))
    const band = { id: 'b', startDate: dateOf(1), endDate: dateOf(3) } // Tue..Thu
    act(() => result.current.beginResize(band, 'end', down(rightEdgeX(3), stripY)))
    // Move to the center of col 4 (Fri) → endDate should become Fri.
    winEvt('pointermove', centerX(4), stripY)
    winEvt('pointerup', centerX(4), stripY)
    expect(onResizeBand).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: dateOf(1), endDate: dateOf(4) }),
    )
  })
})

describe('draw in the empty strip commits the correct range', () => {
  // The empty strip spans the 7 day columns. colAtPointer maps the press x to a
  // column using the STRIP element's own rect, which spans only the day columns.
  const stripRect = { left: LABEL_W, right: LABEL_W + 7 * CELL_W, top: STRIP_TOP, bottom: STRIP_BOT, width: 7 * CELL_W, height: STRIP_BOT }
  const stripEl = { getBoundingClientRect: () => stripRect }

  it('press on col 2 then drag to col 5 yields a Wed..Sat range (4 days)', () => {
    const onDraw = vi.fn()
    const grid = gridWithCells()
    const { result } = renderHook(() => useBandGesture({ gridRef: { current: grid }, onResizeBand: vi.fn(), onDraw }))
    // BandTrack computes the start date from colAtPointer; emulate that here.
    // Press squarely on col 2 (Wed).
    act(() => result.current.beginDraw(dateOf(2), down(centerX(2), stripY)))
    winEvt('pointermove', centerX(5), stripY)
    winEvt('pointerup', centerX(5), stripY)
    expect(onDraw).toHaveBeenCalledWith(
      { startDate: dateOf(2), endDate: dateOf(5) }, expect.anything(),
    )
    void stripEl
  })
})
