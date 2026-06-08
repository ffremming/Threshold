import ActivityIcon from '../ActivityIcon'
import { computeWeekSummary } from '../../utils/weekSummary'
import {
  ACTIVITY_TAG_MAP, ZONE_COLORS, formatDurationLabel, formatKmValue,
} from '../../utils'

// Compact per-week training summary for the month grid's left label column:
// total duration, a proportional zone-distribution bar (per-zone minutes on
// hover), and km by activity (icon + km, distance-bearing activities only).
// Renders nothing for an empty week so quiet weeks stay short. All numbers come
// from computeWeekSummary — no aggregation logic lives here.
export default function MonthWeekSummary({ workouts }) {
  const summary = computeWeekSummary(workouts || [])
  if (summary.count === 0) return null

  const zoneEntries = [1, 2, 3, 4, 5]
    .map(z => [z, summary.zones[z] || 0])
    .filter(([, mins]) => mins > 0)
  const totalZoneMinutes = zoneEntries.reduce((sum, [, mins]) => sum + mins, 0)
  const zoneTitle = zoneEntries
    .map(([z, mins]) => `Z${z} ${formatDurationLabel(Math.round(mins))}`)
    .join(' · ')

  const distanceList = Object.entries(summary.activityDistance)
    .filter(([, km]) => km > 0)
    .sort((a, b) => b[1] - a[1])

  return (
    <div className="pb-month-summary">
      <span className="pb-month-summary-dur">
        {formatDurationLabel(Math.round(summary.totalDuration))}
      </span>

      {totalZoneMinutes > 0 && (
        <div className="pb-month-zones">
          <div className="pb-month-zonebar" title={zoneTitle} aria-label={`Zone minutes: ${zoneTitle}`}>
            {zoneEntries.map(([z, mins]) => (
              <span
                key={z}
                className="pb-month-zonebar-seg"
                style={{
                  width: `${(mins / totalZoneMinutes) * 100}%`,
                  background: ZONE_COLORS[z]?.border || '#94a3b8',
                }}
              />
            ))}
          </div>
          <ul className="pb-month-zonelist">
            {zoneEntries.map(([z, mins]) => (
              <li key={z} className="pb-month-zonelist-item">
                <span
                  className="pb-month-zonelist-dot"
                  style={{ background: ZONE_COLORS[z]?.border || '#94a3b8' }}
                  aria-hidden="true"
                />
                <span className="pb-month-zonelist-label">Z{z}</span>
                <span className="pb-month-zonelist-mins">{formatDurationLabel(Math.round(mins))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {distanceList.length > 0 && (
        <ul className="pb-month-km">
          {distanceList.map(([tag, km]) => {
            const meta = ACTIVITY_TAG_MAP[tag]
            return (
              <li key={tag} className="pb-month-km-item">
                {meta?.icon && (
                  <ActivityIcon name={meta.icon} className="pb-month-km-icon" title={meta.label} />
                )}
                <span className="pb-month-km-value">{formatKmValue(km)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
