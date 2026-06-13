import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getDayIndex, getCellFromDayIndex } from '../../utils'
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

// Excel-style selection + clipboard for the month grid, at the SESSION level —
// the marquee picks individual session chips it touches, not whole days. Owns:
//  - selectedIds: Set of workout id
//  - marquee: live rectangle {startX,startY,curX,curY} | null
//  - hoverCell: {week,year,weekday} | null  (paste / move-drop destination)
//  - clipboard: { sessions:[{payload,index}], anchorIndex } | null
// and the copy/paste keyboard bindings + paste / move executors.
export function useMonthSelection({
  gridRef,
  workoutsByWeekKey,
  onAddManySessions,
  onMoveMany,
  onDeleteMany,
  modalOpen,
}) {
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [marquee, setMarquee] = useState(null)
  const [hoverCell, setHoverCell] = useState(null)
  const [clipboard, setClipboard] = useState(null)
  // Armed cursor-follow placement after a right-click → Copy / Cut. Holds the
  // snapshot of sessions to place and the mode:
  //   { mode: 'copy' | 'cut', sessions: [{payload, id, index}], anchorIndex }
  // While armed, ghosts follow the hovered day cell and a left-click places them.
  const [placement, setPlacement] = useState(null)
  // Live cursor position during a selection drag, for the custom follower. Null
  // when the pointer is over a slot (hoverCell set) so the follower hides.
  const [dragCursor, setDragCursor] = useState(null)
  // Re-render trigger when the selection drag starts/ends (draggingSelectionRef
  // is a ref, so the derived preview below needs a state nudge to recompute).
  const [selectionDragActive, setSelectionDragActive] = useState(false)

  const marqueeRef = useRef(null)        // { startX, startY, rects: [{id, rect}] }
  const hoverRef = useRef(null)
  const clipboardRef = useRef(null)
  const selectedRef = useRef(selectedIds)
  const pastingRef = useRef(false)
  const placementRef = useRef(placement)

  selectedRef.current = selectedIds
  hoverRef.current = hoverCell
  clipboardRef.current = clipboard
  placementRef.current = placement

  // id → { ...workout, week, year, weekday } across the whole overview window, so
  // a selected id resolves back to its current day for moves/copies.
  const sessionById = useMemo(() => {
    const map = new Map()
    for (const list of Object.values(workoutsByWeekKey || {})) {
      for (const w of list || []) map.set(w.id, w)
    }
    return map
  }, [workoutsByWeekKey])
  const sessionByIdRef = useRef(sessionById)
  sessionByIdRef.current = sessionById

  // The selected sessions resolved to {session, week, year, weekday}, dropping any
  // id that no longer exists in the window.
  const resolveSelected = useCallback(() => (
    [...selectedRef.current]
      .map(id => sessionByIdRef.current.get(id))
      .filter(Boolean)
      .map(w => ({ session: w, week: w.week, year: w.year, weekday: w.weekday }))
  ), [])

  // ── Marquee selection ──────────────────────────────────────────────
  // Window listeners are attached imperatively at drag start (not via an effect)
  // so the very first pointermove after pointerdown is captured.
  const beginMarquee = useCallback((event) => {
    // Only bail on a non-primary button (right/middle). Treat 0 / undefined as
    // the primary button so this works regardless of how the event was created.
    if (event.button > 0 || !gridRef.current) return
    const chipEls = [...gridRef.current.querySelectorAll('[data-session-id]')]
    const start = { startX: event.clientX, startY: event.clientY }
    // Activation is deferred until the pointer actually moves past a small
    // threshold. This lets a marquee begin on top of an interactive element (the
    // "+" add button) without a plain press hijacking that element's click or
    // clearing the current selection — only a real drag activates the marquee.
    marqueeRef.current = {
      ...start,
      active: false,
      rects: chipEls.map(el => ({ id: el.dataset.sessionId, rect: el.getBoundingClientRect() })),
    }

    const intersects = (rect, box) => (
      rect.left < box.right && rect.right > box.left
      && rect.top < box.bottom && rect.bottom > box.top
    )
    const onMove = (e) => {
      const m = marqueeRef.current
      if (!m) return
      if (!m.active) {
        const moved = Math.abs(e.clientX - m.startX) > 4 || Math.abs(e.clientY - m.startY) > 4
        if (!moved) return
        m.active = true
        // First real movement: now show the box and clear any prior selection.
        setMarquee({ startX: m.startX, startY: m.startY, curX: e.clientX, curY: e.clientY })
        setSelectedIds(new Set())
      }
      const box = {
        left: Math.min(m.startX, e.clientX),
        right: Math.max(m.startX, e.clientX),
        top: Math.min(m.startY, e.clientY),
        bottom: Math.max(m.startY, e.clientY),
      }
      const next = new Set()
      for (const { id, rect } of m.rects) {
        if (intersects(rect, box)) next.add(id)
      }
      setSelectedIds(next)
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

  const isSessionSelected = useCallback(id => selectedIds.has(id), [selectedIds])

  // ⌘/Ctrl+click on a chip toggles that single session in the selection.
  const toggleSession = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ── Copy ───────────────────────────────────────────────────────────
  const copy = useCallback(() => {
    const selected = resolveSelected()
    if (selected.length === 0) return
    const entries = selected.map(s => ({
      payload: toPayload(s.session),
      index: getDayIndex(s.week, s.year, s.weekday),
    }))
    const anchorIndex = Math.min(...entries.map(e => e.index))
    setClipboard({ sessions: entries, anchorIndex })
  }, [resolveSelected])

  // ── Paste (anchored to hover cell) ─────────────────────────────────
  // All pasted sessions go in ONE batched write to avoid tripping the
  // per-write rate limiter.
  const paste = useCallback(async () => {
    const clip = clipboardRef.current
    const hover = hoverRef.current
    if (!clip || !hover || pastingRef.current || !onAddManySessions) return
    const targetIndex = getDayIndex(hover.week, hover.year, hover.weekday)
    const items = clip.sessions.map(({ payload, index }) => {
      const dest = getCellFromDayIndex(targetIndex + (index - clip.anchorIndex))
      return { session: payload, week: dest.week, year: dest.year, weekday: dest.weekday }
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
  // Used when the user drags a selected chip: every selected session shifts by
  // the same offset, so the selection's shape is preserved.
  const moveSelection = useCallback(async (targetWeek, targetYear, targetWeekday) => {
    const selected = resolveSelected()
    if (selected.length === 0 || !onMoveMany) return
    const moves = computePreviewMoves({
      selectedSessions: selected,
      target: { week: targetWeek, year: targetYear, weekday: targetWeekday },
    }).map(({ session, week, year, weekday }) => ({ id: session.id, week, year, weekday }))
    if (moves.length === 0) return
    await onMoveMany(moves)
    setSelectedIds(new Set())
  }, [onMoveMany, resolveSelected])

  // ── Armed placement (right-click → Copy / Cut, then click a day) ───────
  // Snapshot the current selection and enter cursor-follow placement mode. Both
  // modes hold stripped payloads and place by CREATING fresh sessions; the only
  // difference is that Cut DELETES the originals immediately when armed (so they
  // leave the grid the moment you cut), making the held snapshot the only copy.
  // The snapshot preserves the selection's shape relative to its earliest day.
  const armPlacement = useCallback(async (mode) => {
    const selected = resolveSelected()
    if (selected.length === 0) return
    const sessions = selected.map(s => ({
      payload: toPayload(s.session),
      session: s.session,
      id: s.session.id,
      index: getDayIndex(s.week, s.year, s.weekday),
    }))
    const anchorIndex = Math.min(...sessions.map(s => s.index))
    if (mode === 'cut' && onDeleteMany) {
      await onDeleteMany(sessions.map(s => s.id))
    }
    setSelectedIds(new Set())
    setPlacement({ mode, sessions, anchorIndex })
  }, [resolveSelected, onDeleteMany])

  // Discard whatever is "in hand" (right-click while armed, or cancel). For Cut
  // the originals were already deleted at arm-time, so discarding loses them —
  // recoverable only via the global undo registered by the delete.
  const cancelPlacement = useCallback(() => setPlacement(null), [])

  // Place the armed sessions at a target day, preserving shape — always a batched
  // CREATE (Cut already removed the originals). Clears placement + selection.
  const placeAt = useCallback(async (targetWeek, targetYear, targetWeekday) => {
    const plan = placementRef.current
    if (!plan || pastingRef.current || !onAddManySessions) return
    const targetIndex = getDayIndex(targetWeek, targetYear, targetWeekday)
    const dest = (index) => getCellFromDayIndex(targetIndex + (index - plan.anchorIndex))
    pastingRef.current = true
    try {
      const items = plan.sessions.map(s => {
        const d = dest(s.index)
        return { session: s.payload, week: d.week, year: d.year, weekday: d.weekday }
      })
      if (items.length) await onAddManySessions(items)
    } finally {
      pastingRef.current = false
      setPlacement(null)
      setSelectedIds(new Set())
    }
  }, [onAddManySessions])

  // ── Keyboard bindings ──────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(event) {
      if (modalOpen || isTypingTarget(event.target)) return
      // Esc cancels an armed Copy/Cut placement.
      if (event.key === 'Escape' && placementRef.current) {
        event.preventDefault()
        setPlacement(null)
        return
      }
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
    setSelectedIds(new Set())
  }

  // Every selected session — used for the drag ghost so each dragged session
  // stays visible in the cursor follower.
  const selectedSessions = useCallback(() => (
    resolveSelected().map(s => s.session)
  ), [resolveSelected])

  // ── Selection drag (drag a selected chip to move the whole selection) ──
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
  // target cell. Driven by EITHER an active selection drag OR an armed
  // right-click placement — both follow the cursor's day and shift the snapshot
  // by the same offset from its anchor.
  const selectionPreview = useMemo(() => {
    if (!hoverCell) return {}
    let selectedSessions = null
    let anchorIndex
    if (placement) {
      selectedSessions = placement.sessions.map(s => ({ session: s.session, index: s.index }))
      anchorIndex = placement.anchorIndex
    } else if (selectionDragActive) {
      selectedSessions = [...selectedIds]
        .map(id => sessionById.get(id))
        .filter(Boolean)
        .map(w => ({ session: w, week: w.week, year: w.year, weekday: w.weekday }))
    } else {
      return {}
    }
    const moves = computePreviewMoves({ selectedSessions, target: hoverCell, anchorIndex })
    const byCell = {}
    for (const m of moves) {
      const key = cellKey(m.week, m.year, m.weekday)
      ;(byCell[key] ||= []).push(m.session)
    }
    return byCell
  }, [selectionDragActive, placement, hoverCell, selectedIds, sessionById])

  // True when this session belongs to an active selection drag — so the grid
  // dims the original while its ghost shows at the destination. Armed placement
  // does not dim: Copy leaves originals fully visible, and Cut already deleted
  // its originals, so there is nothing left to dim.
  const isGhostingSession = useCallback((id) => (
    selectionDragActive && hoverCell != null && selectedRef.current.has(id)
  ), [selectionDragActive, hoverCell])

  return {
    selectedIds,
    marquee,
    hoverCell,
    clipboard,
    dragCursor,
    selectionPreview,
    placement,
    beginMarquee,
    setHoverCell,
    isSessionSelected,
    toggleSession,
    isGhostingSession,
    copy,
    paste,
    moveSelection,
    clearSelection,
    armPlacement,
    placeAt,
    cancelPlacement,
    isPlacementArmed: () => placementRef.current != null,
    beginSelectionDrag,
    endSelectionDrag,
    updateDragCursor,
    isDraggingSelection,
    selectedSessions,
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
