import { SummaryCell } from './primitives'
import { formatDelta, formatMetricValue, getMetricTooltip } from '../utils'
import './summary.css'

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
        label="Trend last 3 weeks"
        value={formatDelta(trendDelta)}
        note="Compared to the three preceding weeks."
        trend={trendDelta}
      />
      <SummaryCell
        label="Readiness ratio"
        value={focusWeek?.readinessRatio ? focusWeek.readinessRatio.toFixed(2) : '0.00'}
        note="Acute/chronic load. Around 0.8–1.3 is often robust."
      />
      <SummaryCell label="Density" value={density} note="Load per hour." />
      <SummaryCell
        label="Monotony"
        value={monotony ? monotony.toFixed(2) : '0.00'}
        note="Little day-to-day variation → higher."
      />
      <SummaryCell
        label="Consistency"
        value={`${consistencyScore}%`}
        note="Share of weeks with at least three sessions."
      />
    </div>
  )
}
