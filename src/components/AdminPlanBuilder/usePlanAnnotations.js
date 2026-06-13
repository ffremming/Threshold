import { useCallback, useState } from 'react'
import { defaultNoteColor } from '../../utils/planTypes'
import { appendNoteMessage, markNoteRead, noteHasUnread } from '../../utils/planReducers'

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Math.random().toString(36).slice(2)}-${performance.now()}`
}

// Shared controller for the band / note / goal editors and the
// create-from-context-menu / edit-on-click flows. Owns the single open-editor
// state (only one editor at a time) and turns a selection day-range or a clicked
// session into a prefilled editor draft. View-agnostic: used by both the month
// grid and the week view.
export function usePlanAnnotations({ planActions, noteAuthor = 'coach' }) {
  // { kind: 'band'|'note'|'goal', at: {x,y}, draft } | null
  const [editor, setEditor] = useState(null)
  const close = useCallback(() => setEditor(null), [])

  // ── Create from a selected day-range (right-click → Add …) ───────────
  const addBandForRange = useCallback((range, at) => {
    if (!range) return
    setEditor({ kind: 'band', at, draft: {
      id: newId(), startDate: range.startDate, endDate: range.endDate,
    } })
  }, [])

  const addNoteForRange = useCallback((range, at) => {
    if (!range) return
    setEditor({ kind: 'note', at, draft: {
      id: newId(), author: noteAuthor, color: defaultNoteColor(noteAuthor),
      offset: { dx: 0, dy: 0 }, messages: [], readState: {},
      anchor: { kind: 'range', startDate: range.startDate, endDate: range.endDate },
    } })
  }, [noteAuthor])

  const addGoalForRange = useCallback((range, at) => {
    if (!range) return
    setEditor({ kind: 'goal', at, draft: { id: newId(), date: range.startDate, priority: 'A' } })
  }, [])

  // ── Create a note anchored to a specific session ────────────────────
  const addNoteForSession = useCallback((sessionId, at) => {
    setEditor({ kind: 'note', at, draft: {
      id: newId(), author: noteAuthor, color: defaultNoteColor(noteAuthor),
      offset: { dx: 0, dy: 0 }, messages: [], readState: {},
      anchor: { kind: 'session', sessionId },
    } })
  }, [noteAuthor])

  // ── Edit existing (click a band / goal / note) ──────────────────────
  const editBand = useCallback((band, at) => {
    setEditor({ kind: 'band', at: at || lastPoint(), draft: { ...band, existing: true } })
  }, [])
  const editGoal = useCallback((goal, at) => {
    setEditor({ kind: 'goal', at: at || lastPoint(), draft: { ...goal, existing: true } })
  }, [])
  const editNote = useCallback((note, at) => {
    // Opening the thread marks the viewer caught-up (clears the "new" dot), but
    // only writes if there was actually something unread.
    if (noteHasUnread(note, noteAuthor)) {
      planActions?.upsertNote(markNoteRead(note, noteAuthor, Date.now()))
    }
    setEditor({ kind: 'note', at: at || lastPoint(), draft: { ...note, existing: true } })
  }, [planActions, noteAuthor])

  // ── Persist ─────────────────────────────────────────────────────────
  const saveBand = useCallback(band => planActions?.upsertBand(band), [planActions])
  const removeBand = useCallback(id => planActions?.removeBand(id), [planActions])
  const saveNote = useCallback(note => planActions?.upsertNote(note), [planActions])
  const removeNote = useCallback(id => planActions?.removeNote(id), [planActions])

  // Append a message to a note's dialogue thread. Generates the message id +
  // timestamp here (reducers stay pure) and persists the whole updated note.
  // Returns the updated note so the editor can render the new message live.
  const appendMessage = useCallback((note, text) => {
    const trimmed = (text || '').trim()
    if (!trimmed) return note
    const updated = appendNoteMessage(note, {
      id: newId(), author: noteAuthor, body: trimmed, createdAt: Date.now(),
    })
    planActions?.upsertNote(updated)
    return updated
  }, [planActions, noteAuthor])
  const saveGoal = useCallback(goal => planActions?.upsertGoal(goal), [planActions])
  const removeGoal = useCallback(id => planActions?.removeGoal(id), [planActions])

  // Nudge a note's offset (drag-to-reposition), without opening the editor.
  const moveNote = useCallback((note, offset) => {
    planActions?.upsertNote({ ...note, offset })
  }, [planActions])

  return {
    editor, close, noteAuthor,
    addBandForRange, addNoteForRange, addGoalForRange, addNoteForSession,
    editBand, editGoal, editNote,
    saveBand, removeBand, saveNote, removeNote, saveGoal, removeGoal, moveNote,
    appendMessage,
  }
}

// Fallback anchor point for edit-on-click when no event point is supplied:
// roughly the center of the viewport.
function lastPoint() {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 800
  const vh = typeof window !== 'undefined' ? window.innerHeight : 600
  return { x: vw / 2 - 130, y: vh / 3 }
}
