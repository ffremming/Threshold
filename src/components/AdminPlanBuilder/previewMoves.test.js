import { describe, it, expect } from 'vitest'
import { computePreviewMoves } from './previewMoves'

describe('computePreviewMoves', () => {
  it('shifts a single selected session to the hovered target', () => {
    const moves = computePreviewMoves({
      selectedSessions: [{ session: { id: 'a', title: 'Run' }, week: 20, year: 2026, weekday: 1 }],
      target: { week: 20, year: 2026, weekday: 3 },
    })
    expect(moves).toEqual([
      { session: { id: 'a', title: 'Run' }, week: 20, year: 2026, weekday: 3 },
    ])
  })

  it('preserves the selection shape across multiple sessions (anchor = earliest)', () => {
    const moves = computePreviewMoves({
      selectedSessions: [
        { session: { id: 'a' }, week: 20, year: 2026, weekday: 1 }, // anchor (earliest day-index)
        { session: { id: 'b' }, week: 20, year: 2026, weekday: 3 }, // +2 days from anchor
      ],
      target: { week: 21, year: 2026, weekday: 2 }, // anchor lands on Tue W21
    })
    // a → Tue W21 (target); b keeps its +2 offset → Thu W21.
    expect(moves).toContainEqual({ session: { id: 'a' }, week: 21, year: 2026, weekday: 2 })
    expect(moves).toContainEqual({ session: { id: 'b' }, week: 21, year: 2026, weekday: 4 })
  })

  it('returns one entry per selected session sharing a day', () => {
    const moves = computePreviewMoves({
      selectedSessions: [
        { session: { id: 'a' }, week: 20, year: 2026, weekday: 1 },
        { session: { id: 'b' }, week: 20, year: 2026, weekday: 1 },
      ],
      target: { week: 20, year: 2026, weekday: 5 },
    })
    expect(moves).toHaveLength(2)
    expect(moves.every(m => m.week === 20 && m.weekday === 5)).toBe(true)
  })

  it('returns [] when nothing is selected', () => {
    expect(computePreviewMoves({
      selectedSessions: [],
      target: { week: 20, year: 2026, weekday: 1 },
    })).toEqual([])
  })
})
