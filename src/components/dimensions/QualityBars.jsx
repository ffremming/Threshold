import { QUALITY_ORDER, QUALITY_COLORS, QUALITY_LABELS } from '../../utils/dimensions'
import './QualityBars.css'

// Horizontal 0–100 bars, one per quality, in a fixed order for week-to-week
// stability. `dims` is the engine's { strength, endurance, vo2max, speed, threshold }.
export default function QualityBars({ dims = {}, className = '' }) {
  return (
    <div className={`q-bars ${className}`.trim()}>
      {QUALITY_ORDER.map((q) => {
        const value = Math.round(dims[q] || 0)
        return (
          <div className="q-bars-row" key={q}>
            <span className="q-bars-label">{QUALITY_LABELS[q]}</span>
            <span className="q-bars-track">
              <span
                className="q-bars-fill"
                style={{ width: `${value}%`, background: QUALITY_COLORS[q] }}
              />
            </span>
            <span className="q-bars-value th-num">{value}</span>
          </div>
        )
      })}
    </div>
  )
}
