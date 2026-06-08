import { describe, it, expect } from 'vitest'
import { getDayIndex, getCellFromDayIndex, getISOWeeksInYear } from './week'

describe('day-index offset helpers', () => {
  it('round-trips (week, year, weekday) → index → cell', () => {
    const cases = [
      { week: 1, year: 2026, weekday: 1 },
      { week: 21, year: 2026, weekday: 4 },
      { week: 52, year: 2025, weekday: 7 },
      { week: 1, year: 2024, weekday: 3 },
    ]
    for (const c of cases) {
      const idx = getDayIndex(c.week, c.year, c.weekday)
      expect(getCellFromDayIndex(idx)).toEqual(c)
    }
  })

  it('advances one weekday by +1 index within a week', () => {
    const mon = getDayIndex(21, 2026, 1)
    expect(getCellFromDayIndex(mon + 3)).toEqual({ week: 21, year: 2026, weekday: 4 })
  })

  it('rolls Sunday → next Monday across a +1 weekday step', () => {
    const sun = getDayIndex(21, 2026, 7)
    expect(getCellFromDayIndex(sun + 1)).toEqual({ week: 22, year: 2026, weekday: 1 })
  })

  it('rolls across the year boundary', () => {
    const lastWeek = getISOWeeksInYear(2026)
    const lastSun = getDayIndex(lastWeek, 2026, 7)
    expect(getCellFromDayIndex(lastSun + 1)).toEqual({ week: 1, year: 2027, weekday: 1 })
  })

  it('preserves a multi-cell offset applied to a new anchor', () => {
    // Selection: Mon W21, Tue W21, Mon W22. Anchor = Mon W21.
    const anchor = getDayIndex(21, 2026, 1)
    const offsets = [
      getDayIndex(21, 2026, 1) - anchor, // 0
      getDayIndex(21, 2026, 2) - anchor, // +1
      getDayIndex(22, 2026, 1) - anchor, // +7
    ]
    // Paste target: Thu W24.
    const target = getDayIndex(24, 2026, 4)
    const dests = offsets.map(o => getCellFromDayIndex(target + o))
    expect(dests).toEqual([
      { week: 24, year: 2026, weekday: 4 }, // Thu W24
      { week: 24, year: 2026, weekday: 5 }, // Fri W24
      { week: 25, year: 2026, weekday: 4 }, // Thu W25
    ])
  })
})
