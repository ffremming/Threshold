import { Doughnut } from 'react-chartjs-2'
import { EmptyState } from '../ui'
import { ChartCard, Stat } from '../AnalysisDashboard/sections/primitives'
import { doughnutOptions } from '../AnalysisDashboard/charts/options'
import { buildZoneDoughnutData } from '../AnalysisDashboard/charts/data'
import { computeWeekSummary } from '../../utils/weekSummary'
import {
  ACTIVITY_TAG_MAP, ZONE_COLORS, formatDurationLabel, formatKmValue,
} from '../../utils'
import './WeekOverview.css'

// Hours-by-activity doughnut (duration, not load).
function buildHoursByActivityData(activityDuration) {
  const entries = Object.entries(activityDuration)
    .filter(([, mins]) => mins > 0)
    .sort((a, b) => b[1] - a[1])
  return {
    labels: entries.map(([tag]) => ACTIVITY_TAG_MAP[tag]?.label || tag),
    datasets: [{
      data: entries.map(([, mins]) => Math.round(mins)),
      backgroundColor: entries.map(([tag]) => ACTIVITY_TAG_MAP[tag]?.color || '#94a3b8'),
      borderWidth: 0,
      hoverOffset: 10,
    }],
  }
}

export default function WeekOverview({ workouts }) {
  const summary = computeWeekSummary(workouts)

  if (summary.count === 0) {
    return (
      <EmptyState
        title="No sessions planned this week"
        description="Plan sessions from the session bank to see the week summary here."
      />
    )
  }

  const hoursData = buildHoursByActivityData(summary.activityDuration)
  const zoneData = buildZoneDoughnutData(summary.zones)
  const hasZones = Object.values(summary.zones).some(v => v > 0)

  const distanceList = Object.entries(summary.activityDistance)
    .sort((a, b) => b[1] - a[1])

  return (
    <div className="week-overview">
      <div className="wo-summary">
        <Stat label="Total time" value={formatDurationLabel(Math.round(summary.totalDuration))} />
        <Stat label="Total distance" value={formatKmValue(summary.totalDistance)} />
        <Stat label="Sessions" value={summary.count} />
        <Stat label="Total load" value={Math.round(summary.totalLoad)} />
      </div>

      <div className="wo-grid">
        <ChartCard title="Hours by activity">
          <Doughnut data={hoursData} options={doughnutOptions} />
        </ChartCard>

        <ChartCard title="Intensity zones" caption="Minutes in each zone">
          {hasZones
            ? <Doughnut data={zoneData} options={doughnutOptions} />
            : <p className="wo-empty-note">No zone data for this week.</p>}
        </ChartCard>

        <ChartCard title="Distance by activity">
          {distanceList.length === 0 ? (
            <p className="wo-empty-note">No distance recorded this week.</p>
          ) : (
            <ul className="wo-km-list">
              {distanceList.map(([tag, km]) => (
                <li key={tag}>
                  <span className="wo-km-dot" style={{ background: ACTIVITY_TAG_MAP[tag]?.color || '#94a3b8' }} />
                  <span className="wo-km-label">{ACTIVITY_TAG_MAP[tag]?.label || tag}</span>
                  <span className="wo-km-value">{formatKmValue(km)}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard title="Zone minutes">
          <ul className="wo-zone-list">
            {[1, 2, 3, 4, 5].map(z => (
              <li key={z}>
                <span className="wo-km-dot" style={{ background: ZONE_COLORS[z]?.border || '#94a3b8' }} />
                <span className="wo-km-label">Zone {z}</span>
                <span className="wo-km-value">{formatDurationLabel(Math.round(summary.zones[z]))}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>
    </div>
  )
}
