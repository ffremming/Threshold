import { Card } from '../../ui'

export function SummaryCell({ label, value, note, highlight, trend }) {
  const trendClass = typeof trend === 'number' ? (trend >= 0 ? 'is-up' : 'is-down') : ''
  return (
    <div className={`an-summary-cell${highlight ? ' is-highlight' : ''}`}>
      <span className="an-summary-label">{label}</span>
      <strong className={`an-summary-value tp-num ${trendClass}`}>{value}</strong>
      {note && <span className="an-summary-note">{note}</span>}
    </div>
  )
}

export function Stat({ label, value }) {
  return (
    <div className="an-stat">
      <dt>{label}</dt>
      <dd className="tp-num">{value}</dd>
    </div>
  )
}

export function ChartCard({ title, caption, children, span, size }) {
  return (
    <Card className={`an-chart${span ? ` is-${span}` : ''}`}>
      <header className="an-chart-head">
        <h3 className="an-chart-title">{title}</h3>
        {caption && <p className="an-chart-caption">{caption}</p>}
      </header>
      <div className={`an-chart-body${size ? ` is-${size}` : ''}`}>{children}</div>
    </Card>
  )
}
