import { QUALITY_ORDER, QUALITY_COLORS, QUALITY_LABELS } from '../../utils/dimensions'
import './SessionLoadDetail.css'

// Shows a session's total load + which qualities that load fed.
// `score` is a scoreSession result: { load, dims }.
export default function SessionLoadDetail({ score, className = '' }) {
  if (!score) return null
  const { load = 0, dims = {} } = score
  const total = QUALITY_ORDER.reduce((sum, q) => sum + (dims[q] || 0), 0)

  // Contributing qualities (non-zero), largest first, with their % share.
  const shares = QUALITY_ORDER
    .map((q) => ({ q, value: dims[q] || 0 }))
    .filter((s) => s.value > 0)
    .map((s) => ({ ...s, pct: Math.round((s.value / total) * 100) }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className={`sld ${className}`.trim()}>
      <div className="sld-head">
        <span className="sld-label">Session load</span>
        <span className="sld-value th-num">{load}</span>
      </div>

      {shares.length > 0 && (
        <>
          <div className="sld-bar" role="img" aria-label="Load by quality">
            {shares.map((s) => (
              <span
                key={s.q}
                className="sld-seg"
                style={{ width: `${s.pct}%`, background: QUALITY_COLORS[s.q] }}
              />
            ))}
          </div>
          <div className="sld-legend">
            {shares.map((s) => (
              <span className="sld-legend-item" key={s.q}>
                <i className="sld-dot" style={{ background: QUALITY_COLORS[s.q] }} />
                {QUALITY_LABELS[s.q]} {s.pct}%
              </span>
            ))}
          </div>
        </>
      )}

      <p className="sld-hint">Load = sum of every block.</p>
    </div>
  )
}
