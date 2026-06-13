import { QUALITY_ORDER, QUALITY_LABELS, QUALITY_COLORS } from '../../utils'

// Multi-select chips for the week's quality focus. Selected chips fill with the
// quality color; clicking toggles membership. Pure controlled component. The
// result is ordered by QUALITY_ORDER for a stable, readable set.
export default function QualityFocusChips({ selected = [], onChange }) {
  const set = new Set(selected)
  function toggle(q) {
    const next = new Set(set)
    if (next.has(q)) next.delete(q)
    else next.add(q)
    onChange(QUALITY_ORDER.filter(x => next.has(x)))
  }
  return (
    <div className="pb-quality-chips">
      {QUALITY_ORDER.map(q => {
        const active = set.has(q)
        const color = QUALITY_COLORS[q]
        return (
          <button
            key={q}
            type="button"
            className={`pb-quality-chip${active ? ' is-active' : ''}`}
            aria-pressed={active}
            onClick={() => toggle(q)}
            style={active
              ? { background: color, borderColor: color, color: '#fff' }
              : { borderColor: color, color }}
          >
            {QUALITY_LABELS[q]}
          </button>
        )
      })}
    </div>
  )
}
