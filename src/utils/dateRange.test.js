import { describe, it, expect } from 'vitest'
import { weeksInDateRange } from './dateRange'

describe('weeksInDateRange', () => {
  it('returns a single week for a one-day range', () => {
    // 2026-06-03 is a Wednesday in ISO week 23
    expect(weeksInDateRange('2026-06-03', '2026-06-03')).toEqual([
      { week: 23, year: 2026 },
    ])
  })

  it('returns consecutive weeks spanning the range', () => {
    // 2026-06-03 (wk23) .. 2026-06-15 (wk25)
    expect(weeksInDateRange('2026-06-03', '2026-06-15')).toEqual([
      { week: 23, year: 2026 },
      { week: 24, year: 2026 },
      { week: 25, year: 2026 },
    ])
  })

  it('crosses a year boundary', () => {
    // 2025-12-29 is ISO wk1 of 2026; 2025-12-22 is wk52 of 2025
    const result = weeksInDateRange('2025-12-22', '2026-01-05')
    expect(result).toEqual([
      { week: 52, year: 2025 },
      { week: 1, year: 2026 },
      { week: 2, year: 2026 },
    ])
  })

  it('returns empty array when start is after end', () => {
    expect(weeksInDateRange('2026-06-15', '2026-06-03')).toEqual([])
  })
})
