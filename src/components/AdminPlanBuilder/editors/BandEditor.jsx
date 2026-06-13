import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import EditorPopover from './EditorPopover'
import {
  BAND_TYPES, BAND_TYPE_MAP, CUSTOM_BAND_TYPE, CUSTOM_BAND_DEFAULT_COLOR,
} from '../../../utils/planTypes'

// Create/edit a phase/focus band. `draft` supplies an id (new or existing) and a
// prefilled date range from the selection. onSave persists the full band;
// onRemove deletes it (edit mode only).
export default function BandEditor({ at, draft, onSave, onRemove, onClose }) {
  const [type, setType] = useState(draft.type || BAND_TYPES[0].value)
  const [label, setLabel] = useState(draft.label || '')
  const [color, setColor] = useState(draft.color || '')
  const [startDate, setStartDate] = useState(draft.startDate || '')
  const [endDate, setEndDate] = useState(draft.endDate || draft.startDate || '')
  const isCustom = type === CUSTOM_BAND_TYPE
  const isEditing = Boolean(draft.existing)

  function pickType(value) {
    setType(value)
    if (value !== CUSTOM_BAND_TYPE) {
      // Adopt the preset's label/color unless the user already typed a custom label.
      setLabel(BAND_TYPE_MAP[value]?.label || '')
      setColor(BAND_TYPE_MAP[value]?.color || '')
    } else if (!color) {
      setColor(CUSTOM_BAND_DEFAULT_COLOR)
    }
  }

  function submit() {
    if (!startDate || !endDate) return
    const lo = startDate <= endDate ? startDate : endDate
    const hi = startDate <= endDate ? endDate : startDate
    onSave({
      id: draft.id,
      type,
      label: isCustom ? (label || 'Custom') : (BAND_TYPE_MAP[type]?.label || label),
      color: isCustom ? (color || CUSTOM_BAND_DEFAULT_COLOR) : (BAND_TYPE_MAP[type]?.color || color),
      startDate: lo,
      endDate: hi,
    })
    onClose?.()
  }

  return (
    <EditorPopover at={at} onClose={onClose} width={280}>
      <div className="pb-editor-title">{isEditing ? 'Edit band' : 'Add band'}</div>

      <div className="pb-editor-swatches">
        {BAND_TYPES.map(t => (
          <button
            type="button"
            key={t.value}
            className={`pb-editor-swatch${type === t.value ? ' is-active' : ''}`}
            style={{ '--pb-swatch': t.color }}
            onClick={() => pickType(t.value)}
            title={t.label}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          className={`pb-editor-swatch pb-editor-swatch--custom${isCustom ? ' is-active' : ''}`}
          onClick={() => pickType(CUSTOM_BAND_TYPE)}
        >
          Custom…
        </button>
      </div>

      {isCustom && (
        <div className="pb-editor-row">
          <input
            type="text"
            className="pb-editor-input"
            placeholder="Label"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
          <input
            type="color"
            className="pb-editor-color"
            value={color || CUSTOM_BAND_DEFAULT_COLOR}
            onChange={e => setColor(e.target.value)}
            aria-label="Band color"
          />
        </div>
      )}

      <div className="pb-editor-row">
        <label className="pb-editor-field">
          <span>Start</span>
          <input type="date" className="pb-editor-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </label>
        <label className="pb-editor-field">
          <span>End</span>
          <input type="date" className="pb-editor-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </label>
      </div>

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
