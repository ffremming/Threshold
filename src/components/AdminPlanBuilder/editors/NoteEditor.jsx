import { useState } from 'react'
import { Trash2, Send } from 'lucide-react'
import EditorPopover from './EditorPopover'
import { NOTE_AUTHOR_COLORS, defaultNoteColor } from '../../../utils/planTypes'
import { normalizeNote } from '../../../utils/planReducers'

// A post-it note as a small dialogue. Shows the message thread and a composer to
// add to it; coach and athlete messages are visually distinguished. For a brand
// new note the first sent message creates it. Color + delete live in the footer.
export default function NoteEditor({ at, draft, viewer = 'coach', onSave, onAppend, onRemove, onClose }) {
  // Local working copy of the note so freshly-appended messages render live.
  const [note, setNote] = useState(() => normalizeNote(draft))
  const [text, setText] = useState('')
  const [color, setColor] = useState(draft.color || defaultNoteColor(draft.author))
  const isEditing = Boolean(draft.existing)
  const messages = note.messages || []

  function send() {
    const trimmed = text.trim()
    if (!trimmed) return
    if (isEditing && onAppend) {
      // Existing note: append to the thread (persists immediately).
      const updated = onAppend(note, trimmed)
      setNote(normalizeNote(updated))
    } else {
      // New note: create it with this first message via onSave.
      const createdAt = Date.now()
      const message = { id: `${note.id}-m0`, author: draft.author, body: trimmed, createdAt }
      onSave({
        id: note.id,
        anchor: note.anchor,
        offset: note.offset || { dx: 0, dy: 0 },
        color,
        author: draft.author,
        body: trimmed,
        messages: [message],
        readState: { [draft.author]: createdAt },
      })
      onClose?.()
      return
    }
    setText('')
  }

  function changeColor(next) {
    setColor(next)
    if (isEditing) onSave?.({ ...note, color: next })
  }

  return (
    <EditorPopover at={at} onClose={onClose} width={260}>
      <div className="pb-editor-title">{isEditing ? 'Note' : 'Add note'}</div>

      {messages.length > 0 && (
        <div className="pb-note-thread">
          {messages.map(m => (
            <div key={m.id} className={`pb-note-msg pb-note-msg--${m.author === viewer ? 'me' : 'them'}`}>
              <span className="pb-note-msg-author">{m.author}</span>
              <span className="pb-note-msg-body">{m.body}</span>
            </div>
          ))}
        </div>
      )}

      <div className="pb-note-composer">
        <textarea
          className="pb-editor-textarea"
          placeholder={isEditing ? 'Reply…' : 'Write a note…'}
          value={text}
          autoFocus
          rows={3}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            // ⌘/Ctrl+Enter sends.
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send() }
          }}
        />
        <button type="button" className="pb-note-send" onClick={send} aria-label="Send" title="Send (⌘/Ctrl+Enter)">
          <Send aria-hidden="true" strokeWidth={2} />
        </button>
      </div>

      <div className="pb-editor-row pb-editor-row--tints">
        {Object.entries(NOTE_AUTHOR_COLORS).map(([key, value]) => (
          <button
            type="button"
            key={key}
            className={`pb-editor-tint${color === value ? ' is-active' : ''}`}
            style={{ background: value }}
            onClick={() => changeColor(value)}
            aria-label={`${key} tint`}
          />
        ))}
        <input
          type="color"
          className="pb-editor-color"
          value={color}
          onChange={e => changeColor(e.target.value)}
          aria-label="Note color"
        />
        {isEditing && (
          <button type="button" className="pb-editor-delete" onClick={() => { onRemove?.(note.id); onClose?.() }}>
            <Trash2 aria-hidden="true" strokeWidth={2} /> Delete
          </button>
        )}
      </div>
    </EditorPopover>
  )
}
