export default function MetricCard({ label, value, helper }) {
  return (
    <div className="pb-metric">
      <span className="pb-metric-label">{label}</span>
      <strong className="pb-metric-value tp-num">{value}</strong>
      {helper && <small className="pb-metric-helper">{helper}</small>}
    </div>
  )
}
