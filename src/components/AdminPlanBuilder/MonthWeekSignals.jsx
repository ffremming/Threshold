// Compact per-week load-signal bar for the month grid: training load, the
// week-over-week ramp %, and an ACWR readiness pill. Pure presentation — every
// number comes precomputed from computeWeekSignals; no aggregation lives here.
// Renders for every week; zero-load weeks get an `is-empty` muted style.

function formatRamp(rampPct) {
  if (rampPct == null || !Number.isFinite(rampPct)) return '—'
  const rounded = Math.round(rampPct)
  const arrow = rounded > 0 ? '↑' : rounded < 0 ? '↓' : ''
  const sign = rounded > 0 ? '+' : ''
  return `${arrow}${sign}${rounded}%`
}

export default function MonthWeekSignals({ signal }) {
  if (!signal) return null

  const { load, rampPct, acwr, readiness } = signal
  // High-magnitude ramp gets an amber chip regardless of direction.
  const rampHot = rampPct != null && Math.abs(rampPct) > 30
  // No classified band means there's no usable chronic baseline yet — whether
  // because the series is still settling (< 6 weeks) or chronic load is zero.
  // Either way, show the neutral baseline state rather than "ACWR 0.00".
  const hasBand = Boolean(readiness)
  const band = readiness || 'settling'

  return (
    <div className={`pb-month-signals${load > 0 ? '' : ' is-empty'}`} aria-label="Weekly load signals">
      <span className="pb-signal-load">
        <span className="pb-signal-label">Load</span>
        <span className="pb-signal-value">{Math.round(load)}</span>
      </span>

      <span className={`pb-signal-ramp${rampHot ? ' is-hot' : ''}`} title="Week-over-week load change">
        {formatRamp(rampPct)}
      </span>

      <span
        className={`pb-signal-acwr pb-band-${band}`}
        title={hasBand ? `Acute:chronic load ratio (${band})` : 'Building chronic baseline (needs 6 weeks)'}
      >
        <span className="pb-signal-dot" aria-hidden="true" />
        {hasBand ? (
          <span className="pb-signal-acwr-text">
            ACWR {acwr.toFixed(2)} {band}
          </span>
        ) : (
          <span className="pb-signal-acwr-text">settling</span>
        )}
      </span>
    </div>
  )
}
