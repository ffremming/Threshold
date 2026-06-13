// Pure geometry for plan annotations. Maps calendar dates onto a single week's
// seven day-columns (Mon=0 … Sun=6) and packs overlapping ranges into lanes.
// Shared by the month grid (one week per row) and the week view (one week).
//
// All dates are 'YYYY-MM-DD' strings or Date objects. A "week" is identified by
// its Monday Date. Comparisons are done in whole local days to avoid DST/TZ
// drift from millisecond math.

// Parse 'YYYY-MM-DD' (or pass through a Date) to a local-midnight Date.
export function parseDate(value) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const [, y, m, d] = match
  return new Date(Number(y), Number(m) - 1, Number(d))
}

// Format a Date as 'YYYY-MM-DD' (local).
export function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Whole-day difference (b - a), ignoring time-of-day. Positive when b is later.
export function dayDiff(a, b) {
  const da = parseDate(a)
  const db = parseDate(b)
  if (!da || !db) return null
  // Use UTC of the local Y/M/D so DST transitions don't add/drop an hour.
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate())
  return Math.round((ub - ua) / 86400000)
}

// Column 0..6 (Mon..Sun) for a date within the week starting at weekMonday, or
// null if the date falls outside that week.
export function dateToColumn(date, weekMonday) {
  const diff = dayDiff(weekMonday, date)
  if (diff == null || diff < 0 || diff > 6) return null
  return diff
}

// Clip a [startDate, endDate] range to a single week's visible Mon..Sun span.
// Returns { startCol, endCol, openLeft, openRight } or null if the range does
// not intersect this week. openLeft/openRight flag that the band continues past
// the week edge (rendered with a flush/open end).
export function rangeToSpan(range, weekMonday) {
  if (!range) return null
  const startDiff = dayDiff(weekMonday, range.startDate)
  const endDiff = dayDiff(weekMonday, range.endDate)
  if (startDiff == null || endDiff == null) return null
  // Normalize a possibly-reversed range.
  const lo = Math.min(startDiff, endDiff)
  const hi = Math.max(startDiff, endDiff)
  // No intersection with [0,6].
  if (hi < 0 || lo > 6) return null
  const startCol = Math.max(0, lo)
  const endCol = Math.min(6, hi)
  return {
    startCol,
    endCol,
    openLeft: lo < 0,
    openRight: hi > 6,
  }
}

// Greedy interval packing into lanes. Each item must expose a comparable
// [start, end] (inclusive). Returns the same items, each annotated with a `lane`
// index (0-based), sorted by start then end. Non-overlapping items reuse the
// lowest free lane so a row holds as many disjoint items as fit.
export function packLanes(items, getStart, getEnd) {
  const sorted = [...items].sort((a, b) => {
    const sa = getStart(a)
    const sb = getStart(b)
    if (sa !== sb) return sa - sb
    return getEnd(a) - getEnd(b)
  })
  const laneEnds = [] // laneEnds[i] = end column currently occupying lane i
  return sorted.map(item => {
    const start = getStart(item)
    const end = getEnd(item)
    let lane = laneEnds.findIndex(occupiedEnd => occupiedEnd < start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(end)
    } else {
      laneEnds[lane] = end
    }
    return { ...item, lane }
  })
}

// Which calendar date sits under a viewport point (clientX, clientY)?
// Hit-tests every day cell in `grid` (elements carrying data-date) and returns
// that cell's 'YYYY-MM-DD', or null if the grid has no dated cells. A point
// inside a cell returns that cell; a point outside all cells snaps to the
// nearest one — so a drag can run off the row edges or into the row above/below
// and still resolve to a sensible day. Used by the band resize and draw
// gestures, which sweep freely across the whole multi-week grid.
export function dateUnderPoint(x, y, grid) {
  if (!grid || typeof grid.querySelectorAll !== 'function') return null
  const cells = grid.querySelectorAll('[data-date]')
  let best = null
  let bestDist = Infinity
  let bestCenterDist = Infinity
  let bestLeft = -Infinity
  for (const el of cells) {
    const date = el.dataset?.date
    if (!date) continue
    const r = el.getBoundingClientRect()
    // Clamp the point into the cell; clamped distance is 0 when the point is
    // inside, and grows with how far outside it is — so a point above/below all
    // rows snaps to the nearest row, and one off the left/right snaps to the
    // nearest column. This is the primary key.
    const cx = Math.max(r.left, Math.min(x, r.right))
    const cy = Math.max(r.top, Math.min(y, r.bottom))
    const dist = (x - cx) ** 2 + (y - cy) ** 2
    // Two adjacent cells share a vertical edge, so a point exactly on that edge
    // is clamped-distance 0 to BOTH. Disambiguate by the horizontal distance to
    // each cell's CENTER (the cursor "belongs to" the column it is more inside),
    // and on an exact center tie prefer the right-hand cell (greater left) so a
    // point on a shared edge reads as entering the next column, never the prior.
    const centerDist = Math.abs(x - (r.left + r.right) / 2)
    const better = dist < bestDist
      || (dist === bestDist && centerDist < bestCenterDist)
      || (dist === bestDist && centerDist === bestCenterDist && r.left > bestLeft)
    if (better) {
      bestDist = dist
      bestCenterDist = centerDist
      bestLeft = r.left
      best = date
    }
  }
  return best
}

// Convert a column index (0..6) to a left-edge percentage over 7 columns.
export function columnToPercent(col) {
  return (col / 7) * 100
}

// Width percentage for a span covering [startCol, endCol] inclusive.
export function spanWidthPercent(startCol, endCol) {
  return ((endCol - startCol + 1) / 7) * 100
}

// Gap-aware column geometry. The day columns the band track overlays are a CSS
// grid with a fixed GAP between them, so a column is NOT a flat 1/7 of the
// track width — there are 6 internal gaps. These return CSS calc() strings that
// place an overlay exactly on the day-column grid for any track width.
//
// Track width W holds 7 columns of width c and 6 gaps of width g:
//   W = 7c + 6g           ⇒  c = (W - 6g) / 7
//   left(col)      = col * (c + g)            = (W - 6g)/7 * col + col*g
//   width(s..e)    = n*c + (n-1)*g, n=e-s+1   = (W - 6g)/7 * n + (n-1)*g
// We express (W - 6g)/7 as calc((100% - 6*gap)/7) so the browser resolves W.

// Left edge of column `col` as a calc() string, given the CSS gap (e.g. '4px').
export function columnLeftCalc(col, gap) {
  if (!col) return '0px'
  return `calc((100% - 6 * ${gap}) / 7 * ${col} + ${col} * ${gap})`
}

// Width of a span covering [startCol, endCol] inclusive, as a calc() string.
export function spanWidthCalc(startCol, endCol, gap) {
  const n = endCol - startCol + 1
  const innerGaps = n - 1
  if (innerGaps <= 0) return `calc((100% - 6 * ${gap}) / 7 * ${n})`
  return `calc((100% - 6 * ${gap}) / 7 * ${n} + ${innerGaps} * ${gap})`
}

// Center x of column `col` as a calc() string (for point markers like goals).
export function columnCenterCalc(col, gap) {
  return `calc((100% - 6 * ${gap}) / 7 * ${col + 0.5} + ${col} * ${gap})`
}
