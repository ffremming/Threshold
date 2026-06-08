import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getDayIndex, getCellFromDayIndex, getWeekKey } from '../../utils'
import { computePreviewMoves } from './previewMoves'

export function cellKey(week, year, weekday) {
  return `${year}-${week}-${weekday}`
}

function isTypingTarget(target) {
  if (!target) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

// Fields stripped when snapshotting a session for paste — identity + per-instance
// runtime state. Matches what addTemplateToDayAcross discards for templates.
function toPayload(workout) {
  const { id, createdAt, updatedAt, completed, completedAt,
    userComment, userCommentUpdatedAt, ...payload } = workout
  return payload
}

// Excel-style cell selection + clipboard for the month grid. Owns:
//  - selectedCells: Set of cellKey
//  - marquee: live rectangle {startX,startY,curX,curY} | null
//  - hoverCell: {week,year,weekday} | null  (paste / move-drop destination)
//  - clipboard: { cells:[{week,year,weekday,sessions:[payload]}], anchorIndex } | null
// and the copy/paste keyboard bindings + paste / move executors.
export function useMonthSelection({
  gridRef,
  workoutsByWeekKey,
  onAddManySessions,
  onMoveMany,
  modalOpen,
}) {
  const [selectedCells, setSelectedCells] = useState(() => new Set())
  const [marquee, setMarquee] = useState(null)
  const [hoverCell, setHoverCell] = useState(null)
  const [clipboard, setClipboard] = useState(null)
  // Live cursor position during a selection drag, for the custom follower. Null
  // when the pointer is over a slot (hoverCell set) so the follower hides.
  const [dragCursor, setDragCursor] = useState(null)
  // Re-render trigger when the selection drag starts/ends (draggingSelectionRef
  // is a ref, so the derived preview below needs a state nudge to recompute).
  const [selectionDragActive, setSelectionDragActive] = useState(false)

  const marqueeRef = useRef(null)        // { startX, startY, rects: [{key, rect}] }
  const hoverRef = useRef(null)
  const clipboardRef = useRef(null)
  const selectedRef = useRef(selectedCells)
  const pastingRef = useRef(false)

  selectedRef.current = selectedCells
  hoverRef.current = hoverCell
  clipboardRef.current = clipboard

  const sessionsInCell = useCallback((week, year, weekday) => {
    const list = workoutsByWeekKey[getWeekKey(week, year)] || []
    return list.filter(w => Number(w.weekday) === Number(weekday))
  }, [workoutsByWeekKey])

  // ── Marquee selection ──────────────────────────────────────────────
  // Window listeners are attached imperatively at drag start (not via an effect)
  // so the very first pointermove after pointerdown is captured.
  const beginMarquee = useCallback((event) => {
    // Only bail on a non-primary button (right/middle). Treat 0 / undefined as
    // the primary button so this works regardless of how the event was created.
    if (event.button > 0 || !gridRef.current) return
    const cellEls = [...gridRef.current.querySelectorAll('[data-cell-key]')]
    const start = { startX: event.clientX, startY: event.clientY }
    marqueeRef.current = {
      ...start,
      rects: cellEls.map(el => ({ key: el.dataset.cellKey, rect: el.getBoundingClientRect() })),
    }
    setMarquee({ ...start, curX: event.clientX, curY: event.clientY })
    setSelectedCells(new Set())

    const intersects = (rect, box) => (
      rect.left < box.right && rect.right > box.left
      && rect.top < box.bottom && rect.bottom > box.top
    )
    const onMove = (e) => {
      const m = marqueeRef.current
      if (!m) return
      const box = {
        left: Math.min(m.startX, e.clientX),
        right: Math.max(m.startX, e.clientX),
        top: Math.min(m.startY, e.clientY),
        bottom: Math.max(m.startY, e.clientY),
      }
      const next = new Set()
      for (const { key, rect } of m.rects) {
        if (intersects(rect, box)) next.add(key)
      }
      setSelectedCells(next)
      setMarquee(prev => prev && { ...prev, curX: e.clientX, curY: e.clientY })
    }
    const onUp = () => {
      marqueeRef.current = null
      setMarquee(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [gridRef])

  const isCellSelected = useCallback(key => selectedCells.has(key), [selectedCells])

  // Parse a cellKey "year-week-weekday" back to numbers.
  function parseKey(key) {
    const [year, week, weekday] = key.split('-').map(Number)
    return { week, year, weekday }
  }

  // ── Copy ───────────────────────────────────────────────────────────
  const copy = useCallback(() => {
    const keys = [...selectedRef.current]
    if (keys.length === 0) return
    const cells = keys.map(key => {
      const { week, year, weekday } = parseKey(key)
      return {
        week, year, weekday,
        index: getDayIndex(week, year, weekday),
        sessions: sessionsInCell(week, year, weekday).map(toPayload),
      }
    }).filter(c => c.sessions.length > 0)
    if (cells.length === 0) return
    const anchorIndex = Math.min(...cells.map(c => c.index))
    setClipboard({ cells, anchorIndex })
  }, [sessionsInCell])

  // ── Paste (anchored to hover cell) ─────────────────────────────────
  // All pasted sessions go in ONE batched write to avoid tripping the
  // per-write rate limiter.
  const paste = useCallback(async () => {
    const clip = clipboardRef.current
    const hover = hoverRef.current
    if (!clip || !hover || pastingRef.current || !onAddManySessions) return
    const targetIndex = getDayIndex(hover.week, hover.year, hover.weekday)
    const items = clip.cells.flatMap(cell => {
      const dest = getCellFromDayIndex(targetIndex + (cell.index - clip.anchorIndex))
      return cell.sessions.map(session => ({
        session, week: dest.week, year: dest.year, weekday: dest.weekday,
      }))
    })
    if (items.length === 0) return
    pastingRef.current = true
    try {
      await onAddManySessions(items)
    } finally {
      pastingRef.current = false
    }
  }, [onAddManySessions])

  // ── Move the whole selection (anchored to a target cell) ───────────
  // Used when the user drags a selected chip: every session in the selected
  // cells shifts by the same offset, so the selection's shape is preserved.
  const moveSelection = useCallback(async (targetWeek, targetYear, targetWeekday) => {
    const keys = [...selectedRef.current]
    if (keys.length === 0 || !onMoveMany) return
    const moves = computePreviewMoves({
      selectedKeys: keys,
      sessionsInCell,
      target: { week: targetWeek, year: targetYear, weekday: targetWeekday },
    }).map(({ session, week, year, weekday }) => ({ id: session.id, week, year, weekday }))
    if (moves.length === 0) return
    await onMoveMany(moves)
    setSelectedCells(new Set())
  }, [onMoveMany, sessionsInCell])

  // True when the cell holding `workoutId` is part of the current selection —
  // tells the grid to route a chip drag through moveSelection instead of a
  // single-session move.
  const isSelectedWorkout = useCallback((week, year, weekday) => (
    selectedRef.current.has(cellKey(week, year, weekday))
  ), [])

  // ── Keyboard bindings ──────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(event) {
      if (modalOpen || isTypingTarget(event.target)) return
      const mod = event.metaKey || event.ctrlKey
      if (!mod) return
      const k = event.key.toLowerCase()
      if (k === 'c') {
        if (selectedRef.current.size > 0) { event.preventDefault(); copy() }
      } else if (k === 'v') {
        if (clipboardRef.current && hoverRef.current) { event.preventDefault(); paste() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [copy, paste, modalOpen])

  function clearSelection() {
    setSelectedCells(new Set())
  }

  // Every session across all selected cells — used for the drag ghost so each
  // dragged session stays visible.
  const selectedSessions = useCallback(() => (
    [...selectedRef.current].flatMap(key => {
      const { week, year, weekday } = parseKey(key)
      return sessionsInCell(week, year, weekday)
    })
  ), [sessionsInCell])

  // The live selected day-cell DOM nodes, in grid order, for the clone ghost.
  const selectedCellEls = useCallback(() => {
    const grid = gridRef.current
    if (!grid) return []
    return [...grid.querySelectorAll('[data-cell-key]')]
      .filter(el => selectedRef.current.has(el.dataset.cellKey))
  }, [gridRef])

  // ── Selection drag (drag a selected cell to move the whole selection) ──
  const draggingSelectionRef = useRef(false)
  const beginSelectionDrag = useCallback((event) => {
    draggingSelectionRef.current = true
    setSelectionDragActive(true)
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      try { event.dataTransfer.setData('text/plain', 'selection') } catch {}
      // A custom cursor-follower (rendered by the grid) replaces the drag image:
      // suppress the native image with a transparent 1×1 pixel.
      suppressNativeDragImage(event)
      setDragCursor({ x: event.clientX, y: event.clientY })
    }
  }, [])
  // Track the cursor during the drag so the follower can position itself. Pass
  // overSlot=true when the pointer is over a destination cell — the follower
  // hides there (destination ghosts take over); otherwise it shows at (x, y).
  const updateDragCursor = useCallback((x, y, overSlot) => {
    if (!draggingSelectionRef.current) return
    setDragCursor(overSlot ? null : { x, y })
  }, [])
  const endSelectionDrag = useCallback(() => {
    draggingSelectionRef.current = false
    setSelectionDragActive(false)
    setDragCursor(null)
    setHoverCell(null)
  }, [])
  const isDraggingSelection = useCallback(() => draggingSelectionRef.current, [])

  // Destination ghosts grouped by destination cellKey, derived from the hovered
  // target cell. Empty unless a selection drag is active and a cell is hovered.
  const selectionPreview = useMemo(() => {
    if (!selectionDragActive || !hoverCell) return {}
    const moves = computePreviewMoves({
      selectedKeys: [...selectedCells],
      sessionsInCell,
      target: hoverCell,
    })
    const byCell = {}
    for (const m of moves) {
      const key = cellKey(m.week, m.year, m.weekday)
      ;(byCell[key] ||= []).push(m.session)
    }
    return byCell
  }, [selectionDragActive, hoverCell, selectedCells, sessionsInCell])

  // True when this ORIGINAL session belongs to the active selection drag (so the
  // grid dims it while its ghost shows at the destination).
  const isGhostingSession = useCallback((week, year, weekday) => (
    selectionDragActive && hoverCell != null
      && selectedRef.current.has(cellKey(week, year, weekday))
  ), [selectionDragActive, hoverCell])

  return {
    selectedCells,
    marquee,
    hoverCell,
    clipboard,
    dragCursor,
    selectionPreview,
    beginMarquee,
    setHoverCell,
    isCellSelected,
    isSelectedWorkout,
    isGhostingSession,
    copy,
    paste,
    moveSelection,
    clearSelection,
    beginSelectionDrag,
    endSelectionDrag,
    updateDragCursor,
    isDraggingSelection,
    selectedSessions,
    selectedCellEls,
  }
}

// Replace the native HTML5 drag image with an invisible 1×1 pixel so our custom
// follower is the only thing the user sees moving with the cursor.
function suppressNativeDragImage(event) {
  if (typeof document === 'undefined') return
  if (typeof event.dataTransfer.setDragImage !== 'function') return
  const blank = document.createElement('canvas')
  blank.width = 1
  blank.height = 1
  blank.style.position = 'fixed'
  blank.style.top = '-10px'
  blank.style.left = '-10px'
  document.body.appendChild(blank)
  try { event.dataTransfer.setDragImage(blank, 0, 0) } catch {}
  requestAnimationFrame(() => blank.remove())
}
