// A tiny cycling control in a Plan-view day-cell header: none → hard → easy →
// rest → none. Colors hint intensity. Controlled by `value` ('hard'|'easy'|
// 'rest'|null) and `onChange`.
const CYCLE = [null, 'hard', 'easy', 'rest']
const LABELS = { hard: 'Hard', easy: 'Easy', rest: 'Rest' }
const COLORS = { hard: '#ef4444', easy: '#22c55e', rest: '#94a3b8' }

export default function DayIntensityTag({ value = null, onChange }) {
  const next = () => {
    const i = CYCLE.indexOf(value ?? null)
    onChange(CYCLE[(i + 1) % CYCLE.length])
  }
  const label = value ? LABELS[value] : 'Set intensity'
  return (
    <button
      type="button"
      className={`pb-day-tag${value ? ` is-${value}` : ''}`}
      aria-label={label}
      title={label}
      onClick={next}
      style={value ? { background: COLORS[value], color: '#fff' } : undefined}
    >
      {value ? LABELS[value][0] : '·'}
    </button>
  )
}
