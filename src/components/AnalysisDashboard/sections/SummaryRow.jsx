import { SummaryCell } from './primitives'
import { formatDelta, formatMetricValue, getMetricTooltip } from '../utils'

export default function SummaryRow({
  selectedMetricMeta, primaryMetric, totals, trendDelta, focusWeek,
  density, monotony, consistencyScore,
}) {
  return (
    <div className="an-summary">
      <SummaryCell
        label={selectedMetricMeta.label}
        value={formatMetricValue(primaryMetric, totals[primaryMetric] || 0)}
        note={getMetricTooltip(primaryMetric)}
        highlight
      />
      <SummaryCell
        label="Trend siste 3 uker"
        value={formatDelta(trendDelta)}
        note="Sammenlignet med de tre foregående ukene."
        trend={trendDelta}
      />
      <SummaryCell
        label="Readiness ratio"
        value={focusWeek?.readinessRatio ? focusWeek.readinessRatio.toFixed(2) : '0.00'}
        note="Akutt/kronisk load. Rundt 0.8–1.3 er ofte robust."
      />
      <SummaryCell label="Tetthet" value={density} note="Load per time." />
      <SummaryCell
        label="Monotoni"
        value={monotony ? monotony.toFixed(2) : '0.00'}
        note="Lite variasjon dag til dag → høyere."
      />
      <SummaryCell
        label="Konsistens"
        value={`${consistencyScore}%`}
        note="Andel uker med minst tre økter."
      />
    </div>
  )
}
