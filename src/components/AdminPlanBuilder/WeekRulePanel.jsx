import { computeWeekSummary } from '../../utils/weekSummary'
import {
  scoreWeek, formatDurationLabel, formatKmValue, QUALITY_LABELS, QUALITY_COLORS,
} from '../../utils'
import DistributionEditor from './DistributionEditor'
import QualityFocusChips from './QualityFocusChips'

// One horizontal target-vs-actual bar: actual fills, target notch marks the aim.
// Turns the metric color when within tolerance, amber when under target.
function MetricBar({ testid, actual, target, color, label, format }) {
  const max = Math.max(actual, target || 0, 1)
  const actualPct = Math.min(100, (actual / max) * 100)
  const targetPct = target > 0 ? Math.min(100, (target / max) * 100) : null
  const met = target > 0 && actual >= target * 0.95
  return (
    <div className="pb-bar-row" data-testid={testid}>
      <span className="pb-bar-label">{label}</span>
      <div className="pb-bar">
        <span className="pb-bar-fill" style={{ width: `${actualPct}%`, background: met ? color : '#f59e0b' }} />
        {targetPct != null && <span className="pb-bar-notch" style={{ left: `${targetPct}%` }} />}
      </div>
      <span className="pb-bar-num">{format(actual)}{target > 0 ? ` / ${format(target)}` : ''}</span>
    </div>
  )
}

// The Plan-view left-column rule editor + progress bars for ONE week. Volume
// (distance/time) is either typed (base/override) or shown as a ramped read-out;
// distribution + quality focus are always editable. Actuals come straight from
// computeWeekSummary / scoreWeek of the week's workouts — no aggregation here.
export default function WeekRulePanel({ weekTarget, resolvedTarget, workouts, onChange }) {
  const summary = computeWeekSummary(workouts || [])
  const dims = scoreWeek(workouts || []).dims
  const t = weekTarget || {}
  const resolved = resolvedTarget || {
    distanceKm: t.distanceKm, durationMin: t.durationMin, source: t.base ? 'typed' : null,
  }
  const isDerived = !t.base && t.distanceKm == null && t.durationMin == null
    && resolved.source && resolved.source !== 'typed'

  return (
    <div className="pb-rule-panel">
      <div className="pb-rule-volume">
        {isDerived ? (
          <div className="pb-rule-derived">
            <span className="pb-rule-derived-val">
              {formatKmValue(resolved.distanceKm || 0)} · {formatDurationLabel(Math.round(resolved.durationMin || 0))}
            </span>
            <span className="pb-rule-source">{resolved.source}</span>
          </div>
        ) : (
          <>
            <label className="pb-rule-field">
              <span>Distance (km)</span>
              <input
                type="number" min="0" aria-label="Distance (km)"
                value={t.distanceKm ?? ''}
                onChange={e => onChange({ distanceKm: e.target.value === '' ? null : Number(e.target.value), base: true })}
              />
            </label>
            <label className="pb-rule-field">
              <span>Time (min)</span>
              <input
                type="number" min="0" aria-label="Time (min)"
                value={t.durationMin ?? ''}
                onChange={e => onChange({ durationMin: e.target.value === '' ? null : Number(e.target.value), base: true })}
              />
            </label>
          </>
        )}
      </div>

      <div className="pb-rule-bars">
        <MetricBar testid="bar-distance" label="km" actual={summary.totalDistance} target={resolved.distanceKm || 0} color="#3b82f6" format={formatKmValue} />
        <MetricBar testid="bar-time" label="time" actual={summary.totalDuration} target={resolved.durationMin || 0} color="#6366f1" format={v => formatDurationLabel(Math.round(v))} />
      </div>

      <DistributionEditor value={t.distribution || {}} onChange={dist => onChange({ distribution: dist })} />

      <QualityFocusChips selected={t.qualities || []} onChange={qs => onChange({ qualities: qs })} />

      {(t.qualities || []).length > 0 && (
        <ul className="pb-rule-quality-actuals">
          {(t.qualities || []).map(q => (
            <li key={q} className="pb-rule-qa">
              <span className="pb-rule-qa-label" style={{ color: QUALITY_COLORS[q] }}>{QUALITY_LABELS[q]}</span>
              <div className="pb-bar">
                <span className="pb-bar-fill" style={{ width: `${dims[q] || 0}%`, background: QUALITY_COLORS[q] }} />
              </div>
              <span className="pb-bar-num">{dims[q] || 0}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="pb-rule-load">Load {summary.totalLoad}</div>
    </div>
  )
}
