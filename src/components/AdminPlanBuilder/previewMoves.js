import { getDayIndex, getCellFromDayIndex } from '../../utils'

// Pure: given the selected sessions and the hovered target cell, compute the
// destination of every selected session — preserving the selection's shape
// relative to its earliest session's day (the anchor). Each session shifts by
// the same day offset, so a session two days after the anchor lands two days
// after the target. Returns [{ session, week, year, weekday }]. No side effects.
//
// Each entry supplies its current day either as {week, year, weekday} or as a
// precomputed {index} (absolute day-index). When `anchorIndex` is passed it
// overrides the derived earliest-day anchor (used by armed placement, whose
// snapshot carries indices, not live cells).
export function computePreviewMoves({ selectedSessions, target, anchorIndex }) {
  const sessions = selectedSessions || []
  if (sessions.length === 0 || !target) return []

  const entries = sessions.map(s => ({
    session: s.session,
    index: s.index != null ? s.index : getDayIndex(s.week, s.year, s.weekday),
  }))
  const anchor = anchorIndex != null ? anchorIndex : Math.min(...entries.map(e => e.index))
  const targetIndex = getDayIndex(target.week, target.year, target.weekday)

  return entries.map(entry => {
    const dest = getCellFromDayIndex(targetIndex + (entry.index - anchor))
    return { session: entry.session, week: dest.week, year: dest.year, weekday: dest.weekday }
  })
}
