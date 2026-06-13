import { SummaryCell } from './primitives'
import { formatDelta, formatMetricValue, getMetricTooltip } from '../utils'
import { ACWR_THRESHOLDS } from '../../../utils/loadSignals'
import './summary.css'

const ROBUST_ACWR_NOTE = `Acute/chronic load. Around ${ACWR_THRESHOLDS.undertrainingMax}–${ACWR_THRESHOLDS.safeMax} is often robust.`

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
        note={ROBUST_ACWR_NOTE}
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
