import { describe, it, expect } from 'vitest'
import {
  parseDate, formatDate, dayDiff, dateToColumn, rangeToSpan, packLanes,
  columnToPercent, spanWidthPercent, dateUnderPoint,
  columnLeftCalc, spanWidthCalc, columnCenterCalc,
} from './planGeometry'

// A known Monday: 2026-06-08 is a Monday (week 24, 2026).
const MON = '2026-06-08'

describe('parseDate / formatDate', () => {
  it('round-trips a YYYY-MM-DD string', () => {
    expect(formatDate(parseDate('2026-06-08'))).toBe('2026-06-08')
  })
  it('parses a Date to local midnight', () => {
    const d = parseDate(new Date(2026, 5, 8, 15, 30))
    expect(formatDate(d)).toBe('2026-06-08')
  })
  it('returns null for garbage', () => {
    expect(parseDate('nope')).toBeNull()
    expect(parseDate(42)).toBeNull()
  })
})

describe('dayDiff', () => {
  it('counts whole days forward and back', () => {
    expect(dayDiff(MON, '2026-06-08')).toBe(0)
    expect(dayDiff(MON, '2026-06-14')).toBe(6)
    expect(dayDiff(MON, '2026-06-07')).toBe(-1)
  })
  it('crosses month and year boundaries', () => {
    expect(dayDiff('2026-12-31', '2027-01-01')).toBe(1)
    expect(dayDiff('2026-06-30', '2026-07-01')).toBe(1)
  })
})

describe('dateToColumn', () => {
  it('maps Mon..Sun to 0..6', () => {
    expect(dateToColumn('2026-06-08', MON)).toBe(0) // Mon
    expect(dateToColumn('2026-06-10', MON)).toBe(2) // Wed
    expect(dateToColumn('2026-06-14', MON)).toBe(6) // Sun
  })
  it('returns null outside the week', () => {
    expect(dateToColumn('2026-06-07', MON)).toBeNull() // day before
    expect(dateToColumn('2026-06-15', MON)).toBeNull() // day after
  })
})

describe('rangeToSpan', () => {
  it('spans a full week flush to both edges', () => {
    expect(rangeToSpan({ startDate: '2026-06-08', endDate: '2026-06-14' }, MON))
      .toEqual({ startCol: 0, endCol: 6, openLeft: false, openRight: false })
  })
  it('handles a partial mid-week range', () => {
    expect(rangeToSpan({ startDate: '2026-06-10', endDate: '2026-06-12' }, MON))
      .toEqual({ startCol: 2, endCol: 4, openLeft: false, openRight: false })
  })
  it('handles a 1-day range', () => {
    expect(rangeToSpan({ startDate: '2026-06-11', endDate: '2026-06-11' }, MON))
      .toEqual({ startCol: 3, endCol: 3, openLeft: false, openRight: false })
  })
  it('clips and flags a band that starts before the week', () => {
    expect(rangeToSpan({ startDate: '2026-06-01', endDate: '2026-06-10' }, MON))
      .toEqual({ startCol: 0, endCol: 2, openLeft: true, openRight: false })
  })
  it('clips and flags a band that ends after the week', () => {
    expect(rangeToSpan({ startDate: '2026-06-12', endDate: '2026-06-20' }, MON))
      .toEqual({ startCol: 4, endCol: 6, openLeft: false, openRight: true })
  })
  it('flags both ends for a band spanning across the whole week', () => {
    expect(rangeToSpan({ startDate: '2026-06-01', endDate: '2026-06-20' }, MON))
      .toEqual({ startCol: 0, endCol: 6, openLeft: true, openRight: true })
  })
  it('returns null when the range misses the week entirely', () => {
    expect(rangeToSpan({ startDate: '2026-06-15', endDate: '2026-06-20' }, MON)).toBeNull()
    expect(rangeToSpan({ startDate: '2026-06-01', endDate: '2026-06-07' }, MON)).toBeNull()
  })
  it('normalizes a reversed range', () => {
    expect(rangeToSpan({ startDate: '2026-06-12', endDate: '2026-06-10' }, MON))
      .toEqual({ startCol: 2, endCol: 4, openLeft: false, openRight: false })
  })
})

describe('packLanes', () => {
  const start = i => i.s
  const end = i => i.e
  it('puts overlapping items on separate lanes', () => {
    const out = packLanes([{ id: 'a', s: 0, e: 3 }, { id: 'b', s: 2, e: 5 }], start, end)
    const byId = Object.fromEntries(out.map(o => [o.id, o.lane]))
    expect(byId.a).toBe(0)
    expect(byId.b).toBe(1)
  })
  it('reuses a lane for disjoint items', () => {
    const out = packLanes([{ id: 'a', s: 0, e: 2 }, { id: 'b', s: 3, e: 5 }], start, end)
    const byId = Object.fromEntries(out.map(o => [o.id, o.lane]))
    expect(byId.a).toBe(0)
    expect(byId.b).toBe(0)
  })
  it('greedily fills lane 0 by start order, overlapper spills to lane 1', () => {
    // Sorted by start: a(0-1), b(3-6), c(4-5). a→lane0; b disjoint from a so
    // reuses lane0 (now ends at 6); c overlaps b so spills to lane1.
    const out = packLanes(
      [{ id: 'a', s: 0, e: 1 }, { id: 'b', s: 3, e: 6 }, { id: 'c', s: 4, e: 5 }],
      start, end,
    )
    const byId = Object.fromEntries(out.map(o => [o.id, o.lane]))
    expect(byId.a).toBe(0)
    expect(byId.b).toBe(0)
    expect(byId.c).toBe(1)
  })
})

describe('percent helpers', () => {
  it('columnToPercent', () => {
    expect(columnToPercent(0)).toBe(0)
    expect(columnToPercent(7)).toBe(100)
  })
  it('spanWidthPercent', () => {
    expect(spanWidthPercent(0, 6)).toBeCloseTo(100)
    expect(spanWidthPercent(0, 0)).toBeCloseTo(100 / 7)
  })
})

describe('gap-aware column calc helpers', () => {
  const G = '4px'
  it('columnLeftCalc: col 0 is the flush left edge', () => {
    expect(columnLeftCalc(0, G)).toBe('0px')
  })
  it('columnLeftCalc: later columns add their share of width + preceding gaps', () => {
    expect(columnLeftCalc(1, G)).toBe('calc((100% - 6 * 4px) / 7 * 1 + 1 * 4px)')
    expect(columnLeftCalc(3, G)).toBe('calc((100% - 6 * 4px) / 7 * 3 + 3 * 4px)')
  })
  it('spanWidthCalc: a single column has no internal gap', () => {
    expect(spanWidthCalc(2, 2, G)).toBe('calc((100% - 6 * 4px) / 7 * 1)')
  })
  it('spanWidthCalc: a multi-column span adds the internal gaps', () => {
    // cols 1..3 → 3 columns + 2 internal gaps.
    expect(spanWidthCalc(1, 3, G)).toBe('calc((100% - 6 * 4px) / 7 * 3 + 2 * 4px)')
    // full week cols 0..6 → 7 columns + 6 gaps == 100%.
    expect(spanWidthCalc(0, 6, G)).toBe('calc((100% - 6 * 4px) / 7 * 7 + 6 * 4px)')
  })
  it('columnCenterCalc: centers within the column accounting for gaps', () => {
    expect(columnCenterCalc(0, G)).toBe('calc((100% - 6 * 4px) / 7 * 0.5 + 0 * 4px)')
    expect(columnCenterCalc(2, G)).toBe('calc((100% - 6 * 4px) / 7 * 2.5 + 2 * 4px)')
  })
})

describe('dateUnderPoint', () => {
  // Build a fake grid: two rows of 3 day-cells each (50px wide, 40px tall).
  // Row 1 (y 0..40):  [0,50)=d1  [50,100)=d2  [100,150)=d3
  // Row 2 (y 40..80): [0,50)=d4  [50,100)=d5  [100,150)=d6
  function fakeGrid(cells) {
    return {
      querySelectorAll: () => cells.map(c => ({
        dataset: { date: c.date },
        getBoundingClientRect: () => ({
          left: c.x, right: c.x + 50, top: c.y, bottom: c.y + 40,
          width: 50, height: 40,
        }),
      })),
    }
  }
  const grid = fakeGrid([
    { date: '2026-06-08', x: 0, y: 0 }, { date: '2026-06-09', x: 50, y: 0 }, { date: '2026-06-10', x: 100, y: 0 },
    { date: '2026-06-11', x: 0, y: 40 }, { date: '2026-06-12', x: 50, y: 40 }, { date: '2026-06-13', x: 100, y: 40 },
  ])

  it('returns the date of the cell directly under the point', () => {
    expect(dateUnderPoint(25, 20, grid)).toBe('2026-06-08')
    expect(dateUnderPoint(75, 20, grid)).toBe('2026-06-09')
    expect(dateUnderPoint(75, 60, grid)).toBe('2026-06-12') // second row
  })

  it('snaps vertically to the nearest row when between/above/below rows', () => {
    // Above all rows but x over column 3 → top row's d3.
    expect(dateUnderPoint(120, -50, grid)).toBe('2026-06-10')
    // Below all rows, x over column 1 → bottom row's d4.
    expect(dateUnderPoint(10, 200, grid)).toBe('2026-06-11')
  })

  it('clamps horizontally to the nearest column edge', () => {
    // Left of everything → leftmost column of the nearest row.
    expect(dateUnderPoint(-30, 20, grid)).toBe('2026-06-08')
    // Right of everything → rightmost column of the nearest row.
    expect(dateUnderPoint(999, 60, grid)).toBe('2026-06-13')
  })

  it('returns null when the grid has no dated cells', () => {
    expect(dateUnderPoint(10, 10, fakeGrid([]))).toBeNull()
    expect(dateUnderPoint(10, 10, null)).toBeNull()
  })
})
