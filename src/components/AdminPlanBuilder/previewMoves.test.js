import { describe, it, expect } from 'vitest'
import { computePreviewMoves } from './previewMoves'

// sessionsInCell stub: map of "week-year-weekday" → sessions.
function makeSessionsInCell(map) {
  return (week, year, weekday) => map[`${week}-${year}-${weekday}`] || []
}

describe('computePreviewMoves', () => {
  it('shifts a single selected cell to the hovered target', () => {
    const sessionsInCell = makeSessionsInCell({
      '20-2026-1': [{ id: 'a', title: 'Run' }],
    })
    // Selected key format is "year-week-weekday".
    const moves = computePreviewMoves({
      selectedKeys: ['2026-20-1'],
      sessionsInCell,
      target: { week: 20, year: 2026, weekday: 3 },
    })
    expect(moves).toEqual([
      { session: { id: 'a', title: 'Run' }, week: 20, year: 2026, weekday: 3 },
    ])
  })

  it('preserves the selection shape across multiple cells (anchor = earliest)', () => {
    const sessionsInCell = makeSessionsInCell({
      '20-2026-1': [{ id: 'a' }], // anchor (earliest day-index)
      '20-2026-3': [{ id: 'b' }], // +2 days from anchor
    })
    const moves = computePreviewMoves({
      selectedKeys: ['2026-20-1', '2026-20-3'],
      sessionsInCell,
      target: { week: 21, year: 2026, weekday: 2 }, // anchor lands on Tue W21
    })
    // a → Tue W21 (target); b keeps its +2 offset → Thu W21.
    expect(moves).toContainEqual({ session: { id: 'a' }, week: 21, year: 2026, weekday: 2 })
    expect(moves).toContainEqual({ session: { id: 'b' }, week: 21, year: 2026, weekday: 4 })
  })

  it('returns one entry per session in a multi-session cell', () => {
    const sessionsInCell = makeSessionsInCell({
      '20-2026-1': [{ id: 'a' }, { id: 'b' }],
    })
    const moves = computePreviewMoves({
      selectedKeys: ['2026-20-1'],
      sessionsInCell,
      target: { week: 20, year: 2026, weekday: 5 },
    })
    expect(moves).toHaveLength(2)
    expect(moves.every(m => m.week === 20 && m.weekday === 5)).toBe(true)
  })

  it('returns [] when nothing is selected', () => {
    expect(computePreviewMoves({
      selectedKeys: [],
      sessionsInCell: makeSessionsInCell({}),
      target: { week: 20, year: 2026, weekday: 1 },
    })).toEqual([])
  })
})
