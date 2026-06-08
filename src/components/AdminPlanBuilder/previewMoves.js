import { getDayIndex, getCellFromDayIndex } from '../../utils'

// Parse a selection cellKey "year-week-weekday" into numbers.
function parseKey(key) {
  const [year, week, weekday] = key.split('-').map(Number)
  return { week, year, weekday }
}

// Pure: given the selected cells, a sessionsInCell lookup, and the hovered target
// cell, compute the destination of every selected session — preserving the
// selection's shape relative to its earliest cell (the anchor), exactly like
// moveSelection. Returns [{ session, week, year, weekday }]. No side effects.
export function computePreviewMoves({ selectedKeys, sessionsInCell, target }) {
  const keys = selectedKeys || []
  if (keys.length === 0 || !target) return []

  const cells = keys.map(parseKey).map(c => ({
    ...c, index: getDayIndex(c.week, c.year, c.weekday),
  }))
  const anchorIndex = Math.min(...cells.map(c => c.index))
  const targetIndex = getDayIndex(target.week, target.year, target.weekday)

  return cells.flatMap(cell => {
    const dest = getCellFromDayIndex(targetIndex + (cell.index - anchorIndex))
    return sessionsInCell(cell.week, cell.year, cell.weekday).map(session => ({
      session, week: dest.week, year: dest.year, weekday: dest.weekday,
    }))
  })
}
