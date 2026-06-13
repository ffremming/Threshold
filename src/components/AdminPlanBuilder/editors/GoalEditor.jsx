import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import EditorPopover from './EditorPopover'
import { GOAL_PRIORITIES } from '../../../utils/planTypes'
import { ACTIVITY_TAGS } from '../../../utils'

// Create/edit a competition/goal. `draft` carries id and a prefilled date (from
// the selection's start day in range mode).
export default function GoalEditor({ at, draft, onSave, onRemove, onClose }) {
  const [name, setName] = useState(draft.name || '')
  const [date, setDate] = useState(draft.date || '')
  const [priority, setPriority] = useState(draft.priority || 'A')
  const [sport, setSport] = useState(draft.sport || '')
  const [target, setTarget] = useState(draft.target || '')
  const [result, setResult] = useState(draft.result || '')
  const isEditing = Boolean(draft.existing)

  function submit() {
    if (!name.trim() || !date) return
    onSave({
      id: draft.id,
      name: name.trim(),
      date,
      priority,
      sport,
      target: target.trim(),
      result: result.trim(),
    })
    onClose?.()
  }

  return (
    <EditorPopover at={at} onClose={onClose} width={280}>
      <div className="pb-editor-title">{isEditing ? 'Edit competition' : 'Add competition'}</div>
      <input
        type="text"
        className="pb-editor-input"
        placeholder="Competition name"
        value={name}
        autoFocus
        onChange={e => setName(e.target.value)}
      />
      <div className="pb-editor-row">
        <label className="pb-editor-field">
          <span>Date</span>
          <input type="date" className="pb-editor-input" value={date} onChange={e => setDate(e.target.value)} />
        </label>
        <label className="pb-editor-field">
          <span>Priority</span>
          <select className="pb-editor-input" value={priority} onChange={e => setPriority(e.target.value)}>
            {GOAL_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
      </div>
      <label className="pb-editor-field">
        <span>Sport</span>
        <select className="pb-editor-input" value={sport} onChange={e => setSport(e.target.value)}>
          <option value="">—</option>
          {ACTIVITY_TAGS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>
      <input
        type="text"
        className="pb-editor-input"
        placeholder="Target (e.g. sub-3:00)"
        value={target}
        onChange={e => setTarget(e.target.value)}
      />
      <input
        type="text"
        className="pb-editor-input"
        placeholder="Result (after the race)"
        value={result}
        onChange={e => setResult(e.target.value)}
      />
      <div className="pb-editor-actions">
        {isEditing && (
          <button type="button" className="pb-editor-delete" onClick={() => { onRemove?.(draft.id); onClose?.() }}>
            <Trash2 aria-hidden="true" strokeWidth={2} /> Delete
          </button>
        )}
        <button type="button" className="pb-editor-save" onClick={submit}>Save</button>
      </div>
    </EditorPopover>
  )
}
