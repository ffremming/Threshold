import { useRef, useState } from 'react'
import { StickyNote } from 'lucide-react'
import { dateToColumn, columnToPercent } from '../../utils/planGeometry'
import { noteHasUnread } from '../../utils/planReducers'

// Resolve a note's time anchor to a column (0..6) within this week, or null if
// the note doesn't belong to this week. Session anchors resolve through the
// sessions list (each carries weekday 1..7); range anchors use their startDate.
function noteColumn(note, weekMonday, sessionsById) {
  const anchor = note.anchor
  if (!anchor) return null
  if (anchor.kind === 'session') {
    const session = sessionsById.get(anchor.sessionId)
    if (!session) return null // session deleted or in another week — skip here
    return Number(session.weekday) - 1 // weekday 1..7 → col 0..6
  }
  if (anchor.kind === 'range') {
    return dateToColumn(anchor.startDate, weekMonday)
  }
  return null
}

// Free-floating post-it notes for ONE week. Each note renders at its anchor's
// column plus a stored drag-offset (the "scattered sticky" nudge). Dragging a
// note updates the offset (committed on drop). Clicking opens the editor.
export default function NoteLayer({ notes, weekMonday, sessions, viewer = 'coach', onEditNote, onMoveNote }) {
  const sessionsById = new Map((sessions || []).map(s => [s.id, s]))
  const placed = []
  for (const note of notes || []) {
    const col = noteColumn(note, weekMonday, sessionsById)
    if (col == null) continue
    placed.push({ note, col })
  }
  if (placed.length === 0) return null

  return (
    <div className="pb-note-layer">
      {placed.map(({ note, col }) => (
        <PostIt
          key={note.id}
          note={note}
          col={col}
          unread={noteHasUnread(note, viewer)}
          onEdit={onEditNote}
          onMove={onMoveNote}
        />
      ))}
    </div>
  )
}

function PostIt({ note, col, unread, onEdit, onMove }) {
  const offset = note.offset || { dx: 0, dy: 0 }
  const [drag, setDrag] = useState(null) // { startX, startY, dx, dy } while dragging
  const movedRef = useRef(false)

  function onPointerDown(event) {
    if (event.button !== 0) return
    event.stopPropagation()
    movedRef.current = false
    const start = { startX: event.clientX, startY: event.clientY, dx: offset.dx, dy: offset.dy }
    setDrag(start)

    const onMoveEvt = e => {
      const ddx = e.clientX - start.startX
      const ddy = e.clientY - start.startY
      if (Math.abs(ddx) > 3 || Math.abs(ddy) > 3) movedRef.current = true
      setDrag({ ...start, dx: start.dx + ddx, dy: start.dy + ddy })
    }
    const onUp = e => {
      window.removeEventListener('pointermove', onMoveEvt)
      window.removeEventListener('pointerup', onUp)
      const ddx = e.clientX - start.startX
      const ddy = e.clientY - start.startY
      setDrag(null)
      if (movedRef.current) {
        onMove?.(note, { dx: start.dx + ddx, dy: start.dy + ddy })
      } else {
        onEdit?.(note)
      }
    }
    window.addEventListener('pointermove', onMoveEvt)
    window.addEventListener('pointerup', onUp)
  }

  const dx = drag ? drag.dx : offset.dx
  const dy = drag ? drag.dy : offset.dy
  return (
    <div
      className={`pb-postit${drag ? ' is-dragging' : ''}`}
      style={{
        left: `${columnToPercent(col)}%`,
        transform: `translate(${dx}px, ${dy}px)`,
        '--pb-note-color': note.color || 'var(--th-accent)',
      }}
      onPointerDown={onPointerDown}
      role="button"
      tabIndex={0}
      title={note.body}
    >
      {unread && <span className="pb-postit-dot" aria-label="New" title="New" />}
      <StickyNote className="pb-postit-icon" aria-hidden="true" strokeWidth={2} />
      <span className="pb-postit-body">{note.body || '…'}</span>
    </div>
  )
}
