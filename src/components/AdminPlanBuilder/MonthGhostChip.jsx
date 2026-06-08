import {
  ACTIVITY_TAG_MAP, normalizeIntensityZones, getZoneBarBackground,
  workoutHasZones, ZONE_COLORS,
} from '../../utils'
import ActivityIcon from '../ActivityIcon'

// A dimmed, dashed copy of a session chip — used to preview where dragged
// sessions will land (in destination day cells) and inside the cursor follower.
// Non-interactive and hidden from assistive tech.
export default function MonthGhostChip({ workout }) {
  const tag = ACTIVITY_TAG_MAP[workout.activityTag]
  const zones = workoutHasZones(workout.activityTag)
    ? normalizeIntensityZones(workout.type, workout.intensityZone)
    : []
  const zoneBar = zones.length > 0 ? getZoneBarBackground(zones) : 'none'
  const peakZone = zones.length > 0 ? Math.max(...zones) : null
  const peakColor = peakZone && peakZone >= 3 ? ZONE_COLORS[peakZone]?.border : null
  const zoneFill = peakColor
    ? `color-mix(in srgb, ${peakColor} 30%, var(--th-surface))`
    : (peakZone ? (ZONE_COLORS[1]?.bg || 'var(--th-surface)') : 'var(--th-surface)')

  return (
    <div
      className="pb-month-chip pb-month-chip--ghost"
      style={{ '--pb-zone-bar': zoneBar, '--pb-zone-fill': zoneFill }}
      aria-hidden="true"
    >
      <span className="pb-month-chip-line">
        {tag?.icon && <ActivityIcon name={tag.icon} className="pb-month-chip-icon" title={tag.label} />}
        <span className="pb-month-chip-title">{workout.title || tag?.label || 'Session'}</span>
      </span>
    </div>
  )
}
