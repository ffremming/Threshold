import { formatDurationLabel } from '../../../utils'

export default function HeatCell({ week, weekdayIndex, weekdayLabel }) {
  const load = week.dailyLoads[weekdayIndex] || 0
  const duration = week.dailyDurations[weekdayIndex] || 0
  const intensity = Math.min(1, load / 220)

  return (
    <div
      className={`an-heat-cell${load > 0 ? ' has-load' : ''}`}
      title={`${weekdayLabel}: ${Math.round(load)} load · ${formatDurationLabel(duration)}`}
      style={{ '--cell-strength': intensity }}
    >
      <span className="tp-num">{load > 0 ? Math.round(load) : ''}</span>
    </div>
  )
}
