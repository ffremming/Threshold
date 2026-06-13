import { RefreshCw } from 'lucide-react'

// Per-session replace affordance shown on the Plan page. Calls onReplace(workout)
// which re-solves that single slot for the next-best bank candidate.
export default function ReplaceSessionButton({ workout, onReplace }) {
  return (
    <button
      type="button"
      className="pb-replace-btn"
      aria-label={`Replace ${workout.title || 'session'}`}
      title="Replace with a similar session"
      onClick={e => { e.stopPropagation(); onReplace(workout) }}
    >
      <RefreshCw size={12} aria-hidden="true" />
    </button>
  )
}
