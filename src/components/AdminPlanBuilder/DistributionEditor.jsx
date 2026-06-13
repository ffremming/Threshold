import { ACTIVITY_TAG_MAP } from '../../utils'
import { SportPicker } from '../ui'

// Editor for a week's activity distribution: a numeric % per chosen activity
// plus a SportPicker (multi-select) to add/remove tags. Controlled: `value` is
// { tag: pct }, onChange returns the next map. Shows a running total that flags
// when not ~100%.
export default function DistributionEditor({ value = {}, onChange }) {
  const entries = Object.entries(value)
  const total = entries.reduce((s, [, v]) => s + Number(v || 0), 0)
  const off = Math.round(total) !== 100 && entries.length > 0
  const selectedTags = entries.map(([tag]) => tag)

  function setPct(tag, pct) {
    onChange({ ...value, [tag]: pct })
  }
  function removeTag(tag) {
    const next = { ...value }
    delete next[tag]
    onChange(next)
  }
  // SportPicker returns the full next array of selected tags. Add any new tag at
  // 0%, keep existing percentages, drop any tag no longer selected.
  function syncTags(nextTags) {
    const next = {}
    for (const tag of nextTags) next[tag] = value[tag] ?? 0
    onChange(next)
  }

  return (
    <div className="pb-dist-editor">
      {entries.map(([tag, pct]) => {
        const meta = ACTIVITY_TAG_MAP[tag]
        return (
          <div key={tag} className="pb-dist-row">
            <span className="pb-dist-tag" style={{ color: meta?.color }}>{meta?.label || tag}</span>
            <input
              type="number"
              min="0"
              max="100"
              aria-label={`${meta?.label || tag} %`}
              value={pct}
              onChange={e => setPct(tag, Number(e.target.value))}
            />
            <button
              type="button"
              className="pb-dist-remove"
              aria-label={`Remove ${meta?.label || tag}`}
              onClick={() => removeTag(tag)}
            >
              ×
            </button>
          </div>
        )
      })}
      <div className="pb-dist-foot">
        <span className={`pb-dist-total${off ? ' is-off' : ''}`}>{Math.round(total)}%</span>
        <SportPicker value={selectedTags} onChange={syncTags} placeholder="+ activity" />
      </div>
    </div>
  )
}
