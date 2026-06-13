import { useCallback, useRef, useState } from 'react'
import { dateUnderPoint } from '../../utils/planGeometry'

// Pointer gestures for plan bands, shared by every week-row of the grid:
//   • beginResize(band, edge, event) — drag one edge ('start'|'end') of an
//     existing band; the dragged edge follows the day under the cursor anywhere
//     in the grid (so a resize can cross into the row above/below), the other
//     edge stays put. Commits via onResizeBand on release; a no-move release is
//     a no-op.
//   • beginDraw(date, event) — sweep out a fresh range from an empty band strip.
//     Calls onDraw(range, point) on release so the caller can open a prefilled
//     band editor.
// While a gesture runs, `preview` carries the live span so the track can render
// a ghost; it is null otherwise.
//
// Both gestures resolve the calendar day under the cursor through the same
// grid-wide hit-test (dateUnderPoint over [data-date] cells) and share one
// window-listener lifecycle, attached imperatively on pointerdown so the very
// first move is captured (mirrors useMonthSelection.beginMarquee).
export function useBandGesture({ gridRef, onResizeBand, onDraw }) {
  const [preview, setPreview] = useState(null)
  // Active gesture: { kind:'resize', band, edge } | { kind:'draw', anchor } | null
  const activeRef = useRef(null)

  const order = (a, b) => (a <= b ? [a, b] : [b, a])

  // Attach window listeners for one gesture. onMove/onUp receive (event, moved)
  // where `moved` is true once the pointer has travelled past a small threshold
  // from where it started — so a press-and-release without a real drag reads as
  // a click (no commit), independent of any pixel-on-a-boundary hit-test.
  const MOVE_THRESHOLD = 4
  const begin = useCallback((event, onMove, onUp) => {
    if (event.button != null && event.button !== 0) return false
    const startX = event.clientX
    const startY = event.clientY
    let moved = false
    const past = (e) => Math.abs(e.clientX - startX) > MOVE_THRESHOLD
      || Math.abs(e.clientY - startY) > MOVE_THRESHOLD
    const handleMove = (e) => {
      if (!moved && past(e)) moved = true
      onMove(e, moved)
    }
    const handleUp = (e) => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      activeRef.current = null
      setPreview(null)
      onUp(e, moved || past(e))
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return true
  }, [])

  // ── Resize an existing band from one edge ───────────────────────────
  const beginResize = useCallback((band, edge, event) => {
    if (!band) return
    event.stopPropagation?.()
    activeRef.current = { kind: 'resize', band, edge }
    // The edge NOT being dragged is fixed; the dragged edge tracks the cursor.
    // The fixed edge AND the dragged edge's baseline both come from the band's
    // stored dates — never from hit-testing the handle's pixel, which sits on a
    // column boundary and is inherently ambiguous (that was the off-by-one bug).
    const fixed = edge === 'start' ? band.endDate : band.startDate
    const spanFrom = (date) => {
      const [startDate, endDate] = order(fixed, date)
      return { startDate, endDate }
    }
    const started = begin(
      event,
      (e, moved) => {
        // Until the pointer actually moves, hold the band's current span so the
        // ghost doesn't jump to whatever column the boundary pixel resolves to.
        if (!moved) return
        const date = dateUnderPoint(e.clientX, e.clientY, gridRef.current)
        if (!date) return
        setPreview({ bandId: band.id, edge, ...spanFrom(date) })
      },
      (e, moved) => {
        // A press-and-release with no real drag is a click → no write.
        if (!moved) return
        const date = dateUnderPoint(e.clientX, e.clientY, gridRef.current)
        if (!date) return
        const next = spanFrom(date)
        if (next.startDate === band.startDate && next.endDate === band.endDate) return
        onResizeBand?.({ ...band, ...next })
      },
    )
    if (started) setPreview({ bandId: band.id, edge, startDate: band.startDate, endDate: band.endDate })
  }, [begin, gridRef, onResizeBand])

  // ── Draw a fresh range in an empty band strip ───────────────────────
  const beginDraw = useCallback((date, event) => {
    if (!date) return
    event.stopPropagation?.()
    activeRef.current = { kind: 'draw', anchor: date }
    // `date` (the anchor) is the column the press started on, computed from the
    // strip's own geometry (no DOM-tie ambiguity). The other end tracks the
    // cursor's day; before any real movement the range is just the anchor day,
    // so a plain click draws a clean 1-day band instead of snapping to whatever
    // column the press pixel happens to border.
    const spanFrom = (to) => {
      const [startDate, endDate] = order(date, to || date)
      return { startDate, endDate }
    }
    const started = begin(
      event,
      (e, moved) => {
        const to = moved ? dateUnderPoint(e.clientX, e.clientY, gridRef.current) : date
        setPreview({ drawing: true, ...spanFrom(to) })
      },
      (e, moved) => {
        const to = moved ? dateUnderPoint(e.clientX, e.clientY, gridRef.current) : date
        onDraw?.(spanFrom(to), { x: e.clientX, y: e.clientY })
      },
    )
    if (started) setPreview({ drawing: true, ...spanFrom(date) })
  }, [begin, gridRef, onDraw])

  return { preview, beginResize, beginDraw }
}
