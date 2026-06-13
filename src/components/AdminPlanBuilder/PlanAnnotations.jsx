import GoalStrip from './GoalStrip'
import BandTrack from './BandTrack'
import NoteLayer from './NoteLayer'
import { formatDate, rangeToSpan, columnToPercent, spanWidthPercent } from '../../utils/planGeometry'

// A live highlight of the currently-selected day-range, drawn across the columns
// it covers, with a hint prompting the right-click. Shown the moment a marquee
// produces a range so the user sees the selection before opening the menu.
function RangeHighlight({ range, weekMonday }) {
  if (!range) return null
  const span = rangeToSpan(range, weekMonday)
  if (!span) return null
  return (
    <div
      className="pb-range-highlight"
      style={{
        left: `${columnToPercent(span.startCol)}%`,
        width: `${spanWidthPercent(span.startCol, span.endCol)}%`,
      }}
    >
      <span className="pb-range-hint">Right-click to add band / note / competition</span>
    </div>
  )
}

// Seven thin day-slots carrying data-date, so a marquee can sweep a day-range
// even when the week has no session columns to hit (week view, empty week).
// Harmless in the month view (it already has dated cells) so it's week-only.
function DayScale({ weekMonday }) {
  const slots = []
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(weekMonday.getFullYear(), weekMonday.getMonth(), weekMonday.getDate() + i)
    slots.push(formatDate(d))
  }
  return (
    <div className="pb-annotations-scale" aria-hidden="true">
      {slots.map(date => <span key={date} className="pb-annotations-slot" data-date={date} />)}
    </div>
  )
}

// One week's annotation region: goal strip on top, band lanes below, post-it
// notes floating over both. Pure presentation — all data and callbacks come
// from the owner (MonthGridPanel per week-row, WeekOverview once). Positioned by
// the consumer to span the seven day columns; everything inside is laid out by
// percentage so it works at any column width (month vs week).
export default function PlanAnnotations({
  weekMonday,
  bands,
  goals,
  notes,
  sessions,
  view,            // 'month' | 'week'
  today,           // 'YYYY-MM-DD' for past-dimming / countdown
  viewer,          // current user role, for the unread "new" dot
  selectedRange,   // live { startDate, endDate } selection to highlight
  bandPreview,     // live resize/draw ghost span from useBandGesture, or null
  onEditBand,
  onResizeBandHandle, // (band, edge, event) → start an edge-resize drag
  onDrawBand,         // (date, event) → start drawing a new band's range
  onEditGoal,
  onEditNote,
  onMoveNote,
}) {
  if (!weekMonday) return null
  return (
    <div className={`pb-annotations pb-annotations--${view}`}>
      {view === 'week' && <DayScale weekMonday={weekMonday} />}
      <RangeHighlight range={selectedRange} weekMonday={weekMonday} />
      <GoalStrip
        goals={goals}
        weekMonday={weekMonday}
        view={view}
        today={today}
        onEditGoal={onEditGoal}
      />
      <BandTrack
        bands={bands}
        weekMonday={weekMonday}
        preview={bandPreview}
        onEditBand={onEditBand}
        onResizeHandleDown={onResizeBandHandle}
        onDrawHandleDown={onDrawBand}
      />
      <NoteLayer
        notes={notes}
        weekMonday={weekMonday}
        sessions={sessions}
        viewer={viewer}
        onEditNote={onEditNote}
        onMoveNote={onMoveNote}
      />
    </div>
  )
}
