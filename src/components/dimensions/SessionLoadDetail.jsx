import { QUALITY_ORDER, QUALITY_COLORS, QUALITY_LABELS } from '../../utils/dimensions'
import './SessionLoadDetail.css'

// Shows a session's total load + the specific load each quality received.
// `score` is a scoreSession result: { load, dims }.
// The session's total load is attributed across the qualities by their dose
// share, so the per-quality load numbers sum back to the total.
export default function SessionLoadDetail({ score, className = '' }) {
  if (!score) return null
  const { load = 0, dims = {} } = score
  const doseTotal = QUALITY_ORDER.reduce((sum, q) => sum + (dims[q] || 0), 0)

  // Contributing qualities (non-zero), largest first, each carrying the share of
  // the session load it earned (rounded; sums to ~load).
  const parts = QUALITY_ORDER
    .map((q) => ({ q, dose: dims[q] || 0 }))
    .filter((p) => p.dose > 0)
    .map((p) => ({
      ...p,
      load: doseTotal > 0 ? Math.round((p.dose / doseTotal) * load) : 0,
      pct: doseTotal > 0 ? (p.dose / doseTotal) * 100 : 0,
    }))
    .sort((a, b) => b.dose - a.dose)

  return (
    <div className={`sld ${className}`.trim()}>
      <div className="sld-head">
        <span className="sld-label">Session load</span>
        <span className="sld-value th-num">{load}</span>
      </div>

      {parts.length > 0 && (
        <>
          <div className="sld-bar" role="img" aria-label="Load by quality">
            {parts.map((p) => (
              <span
                key={p.q}
                className="sld-seg"
                style={{ width: `${p.pct}%`, background: QUALITY_COLORS[p.q] }}
              />
            ))}
          </div>
          <ul className="sld-legend">
            {parts.map((p) => (
              <li className="sld-legend-item" key={p.q}>
                <i className="sld-dot" style={{ background: QUALITY_COLORS[p.q] }} />
                <span className="sld-legend-label">{QUALITY_LABELS[p.q]}</span>
                <span className="sld-legend-load th-num">{p.load}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="sld-hint">Total load (Edwards HR-zone TRIMP), split by what each session trained.</p>
    </div>
  )
}
