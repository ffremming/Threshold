import { rangeToSpan, packLanes, columnToPercent, spanWidthPercent, formatDate } from '../../utils/planGeometry'
import { resolveBandColor, resolveBandLabel } from '../../utils/planTypes'

const LANE_HEIGHT = 18 // px per band lane, kept in sync with annotations.css
const EMPTY_HEIGHT = 15 // px reserved when a week has no bands, so it stays drawable

// Which day-column (0..6) a pointer x lands in, over this strip element. Used to
// seed a draw gesture with the day the press started on, without consulting the
// grid hit-test (the strip itself carries no data-date cells).
function colAtPointer(stripEl, clientX) {
  const r = stripEl.getBoundingClientRect()
  if (r.width <= 0) return 0
  const frac = (clientX - r.left) / r.width
  return Math.max(0, Math.min(6, Math.floor(frac * 7)))
}

// Date for column c within the week starting weekMonday.
function dateForColumn(weekMonday, c) {
  const d = new Date(weekMonday.getFullYear(), weekMonday.getMonth(), weekMonday.getDate() + c)
  return formatDate(d)
}

// Lane-packed phase/focus band pills for ONE week. Each band is clipped to the
// week's visible Mon..Sun span; bands continuing past an edge render flush
// (open) on that side. Clicking a pill opens its editor; dragging a pill's edge
// handle resizes it (across week rows). Dragging across the empty strip draws a
// new band's range. The strip keeps a minimum height even when empty so there
// is always somewhere to start a draw.
export default function BandTrack({
  bands, weekMonday, onEditBand,
  onResizeHandleDown, onDrawHandleDown, preview,
}) {
  // Compute each band's span within this week, dropping those that don't touch it.
  const spans = []
  for (const band of bands || []) {
    const span = rangeToSpan({ startDate: band.startDate, endDate: band.endDate }, weekMonday)
    if (!span) continue
    spans.push({ band, ...span })
  }

  const packed = packLanes(spans, s => s.startCol, s => s.endCol)
  const laneCount = packed.reduce((max, s) => Math.max(max, s.lane + 1), 0)
  const trackHeight = Math.max(laneCount * LANE_HEIGHT, EMPTY_HEIGHT)

  // The live gesture ghost clipped to THIS week (resize preview or draw preview).
  const ghost = preview ? rangeToSpan({ startDate: preview.startDate, endDate: preview.endDate }, weekMonday) : null

  function handleStripDown(event) {
    // Only a primary-button press on empty strip space starts a draw; presses on
    // a pill or its handle are handled by those elements (they stopPropagation).
    if (event.button != null && event.button !== 0) return
    if (event.target.closest?.('.pb-band-pill, .pb-band-handle')) return
    const col = colAtPointer(event.currentTarget, event.clientX)
    onDrawHandleDown?.(dateForColumn(weekMonday, col), event)
  }

  return (
    <div
      className="pb-band-track"
      style={{ height: trackHeight }}
      onPointerDown={onDrawHandleDown ? handleStripDown : undefined}
    >
      {laneCount === 0 && onDrawHandleDown && (
        <span className="pb-band-draw-hint" aria-hidden="true">Drag to add band</span>
      )}

      {packed.map(({ band, startCol, endCol, openLeft, openRight, lane }) => {
        const color = resolveBandColor(band)
        const label = resolveBandLabel(band)
        const className = [
          'pb-band-pill',
          openLeft ? 'is-open-left' : '',
          openRight ? 'is-open-right' : '',
        ].filter(Boolean).join(' ')
        return (
          <div
            key={band.id}
            className={className}
            style={{
              left: `${columnToPercent(startCol)}%`,
              width: `${spanWidthPercent(startCol, endCol)}%`,
              top: lane * LANE_HEIGHT,
              '--pb-band-color': color,
            }}
            title={label}
          >
            {/* Left resize handle — only on the band's real start (not an open,
                clipped edge that lives in another week row). */}
            {!openLeft && onResizeHandleDown && (
              <span
                className="pb-band-handle pb-band-handle--start"
                onPointerDown={e => onResizeHandleDown(band, 'start', e)}
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              className="pb-band-pill-body"
              onClick={event => { event.stopPropagation(); onEditBand?.(band) }}
            >
              <span className="pb-band-label">{label}</span>
            </button>
            {!openRight && onResizeHandleDown && (
              <span
                className="pb-band-handle pb-band-handle--end"
                onPointerDown={e => onResizeHandleDown(band, 'end', e)}
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}

      {ghost && (
        <div
          className={`pb-band-ghost${preview.drawing ? ' is-drawing' : ''}`}
          style={{
            left: `${columnToPercent(ghost.startCol)}%`,
            width: `${spanWidthPercent(ghost.startCol, ghost.endCol)}%`,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
