import { useCallback, useRef, useState } from 'react'

// Lightweight marquee for the WEEK view: a pointer drag over the day columns
// reports the touched day-range as { startDate, endDate } ('YYYY-MM-DD'). Unlike
// the month grid's useMonthSelection (which also moves/copies session chips),
// the week view only needs the time range for adding a band / note / goal, so
// this is intentionally minimal. Reads day columns by their data-date attribute.
export function useWeekDayRange(containerRef) {
  const [dayRange, setDayRange] = useState(null)
  const [marquee, setMarquee] = useState(null)
  const downRef = useRef(null)

  const intersects = (rect, box) => (
    rect.left < box.right && rect.right > box.left
    && rect.top < box.bottom && rect.bottom > box.top
  )

  const begin = useCallback((event) => {
    if (event.button > 0 || !containerRef.current) return
    // Don't start a marquee on an interactive element: a session card, the
    // add button, an annotation leaf (goal marker / post-it), or the band track
    // (it owns its area for drawing/resizing bands). Empty goal-strip space and
    // the day-scale ARE valid sweep-start surfaces, so they are not excluded.
    if (event.target.closest?.('.wo-cell-wrap, .wo-col-add, .pb-band-track, .pb-goal-marker, .pb-postit')) return
    const dayEls = [...containerRef.current.querySelectorAll('[data-date]')]
    if (dayEls.length === 0) return
    const start = { startX: event.clientX, startY: event.clientY, active: false,
      dayRects: dayEls.map(el => ({ date: el.dataset.date, rect: el.getBoundingClientRect() })) }
    downRef.current = start

    const onMove = (e) => {
      const m = downRef.current
      if (!m) return
      if (!m.active) {
        const moved = Math.abs(e.clientX - m.startX) > 4 || Math.abs(e.clientY - m.startY) > 4
        if (!moved) return
        m.active = true
        setDayRange(null)
      }
      const box = {
        left: Math.min(m.startX, e.clientX), right: Math.max(m.startX, e.clientX),
        top: Math.min(m.startY, e.clientY), bottom: Math.max(m.startY, e.clientY),
      }
      setMarquee({ left: box.left, top: box.top, width: box.right - box.left, height: box.bottom - box.top })
      const dates = []
      for (const { date, rect } of m.dayRects) {
        if (date && intersects(rect, box)) dates.push(date)
      }
      if (dates.length > 0) {
        dates.sort()
        setDayRange({ startDate: dates[0], endDate: dates[dates.length - 1] })
      } else {
        setDayRange(null)
      }
    }
    const onUp = () => {
      downRef.current = null
      setMarquee(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [containerRef])

  const clear = useCallback(() => setDayRange(null), [])

  return { dayRange, marquee, begin, clear }
}
