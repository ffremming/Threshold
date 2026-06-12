import { QUALITY_ORDER, QUALITY_COLORS, QUALITY_LABELS } from '../../utils/dimensions'
import './QualityRadar.css'

const ACCENT = '#0052FF'

// Vertex on axis `i` (of n) at the given radius fraction (0..1).
function vertex(cx, cy, r, i, n, fraction) {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
  return [cx + Math.cos(angle) * r * fraction, cy + Math.sin(angle) * r * fraction]
}

function ringPoints(cx, cy, r, n, fraction) {
  return Array.from({ length: n }, (_, i) => vertex(cx, cy, r, i, n, fraction).map((v) => v.toFixed(1)).join(','))
    .join(' ')
}

// Pentagon radar of the five qualities. `dims` is the engine output (0–100).
export default function QualityRadar({ dims = {}, size = 220, className = '' }) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 34 // padding for axis labels
  const n = QUALITY_ORDER.length

  const dataPoints = QUALITY_ORDER.map((q, i) =>
    vertex(cx, cy, r, i, n, Math.max(0, Math.min(100, dims[q] || 0)) / 100)
      .map((v) => v.toFixed(1))
      .join(',')
  ).join(' ')

  return (
    <svg
      className={`q-radar ${className}`.trim()}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label="Training quality radar"
    >
      {/* grid rings */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} className="q-radar-ring" points={ringPoints(cx, cy, r, n, f)} />
      ))}
      {/* axes */}
      {QUALITY_ORDER.map((q, i) => {
        const [x, y] = vertex(cx, cy, r, i, n, 1)
        return <line key={q} className="q-radar-axis" x1={cx} y1={cy} x2={x} y2={y} />
      })}
      {/* data polygon */}
      <polygon
        className="q-radar-area"
        points={dataPoints}
        style={{ fill: `${ACCENT}2e`, stroke: ACCENT }}
      />
      {/* axis labels */}
      {QUALITY_ORDER.map((q, i) => {
        const [x, y] = vertex(cx, cy, r + 16, i, n, 1)
        return (
          <text
            key={q}
            className="q-radar-label"
            x={x}
            y={y}
            fill={QUALITY_COLORS[q]}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {QUALITY_LABELS[q]}
          </text>
        )
      })}
    </svg>
  )
}
