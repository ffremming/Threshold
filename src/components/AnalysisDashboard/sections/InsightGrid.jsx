import { ACTIVITY_TAG_MAP, formatDurationLabel, formatKmValue } from '../../../utils'
import ActivityIcon from '../../ActivityIcon'
import { Card, Pill } from '../../ui'
import { Stat } from './primitives'
import { formatMetricValue, getWeekLabel, getWeekMetricValue } from '../utils'
import './insight.css'

export default function InsightGrid({
  focusWeek, peakWeek, topActivityEntries, totals, primaryMetric, strain,
}) {
  return (
    <div className="an-insight-grid">
      <Card className="an-insight">
        <header className="an-insight-head">
          <span className="an-eyebrow">Focus week</span>
          <h3 className="an-insight-title">Week {focusWeek?.week.week}</h3>
        </header>
        <dl className="an-stat-grid">
          <Stat label="Load" value={Math.round(focusWeek?.load || 0)} />
          <Stat label="Time" value={formatDurationLabel(Math.round(focusWeek?.duration || 0))} />
          <Stat label="Distance" value={formatKmValue(focusWeek?.distance || 0)} />
          <Stat label="Hard sessions" value={focusWeek?.hardSessions || 0} />
        </dl>
        <div className="an-pill-row">
          <Pill>Strain {strain}</Pill>
          <Pill>Mechanical {Math.round(focusWeek?.mechanicalLoad || 0)}</Pill>
          {focusWeek?.longestSession ? (
            <Pill>Longest {formatDurationLabel(focusWeek.longestSession.duration)}</Pill>
          ) : null}
        </div>
      </Card>

      <Card className="an-insight">
        <header className="an-insight-head">
          <span className="an-eyebrow">Peak week</span>
          <h3 className="an-insight-title">{peakWeek ? getWeekLabel(peakWeek.week) : 'No data'}</h3>
        </header>
        <p className="an-insight-copy">
          Peak week on selected metric with {peakWeek ? formatMetricValue(primaryMetric, getWeekMetricValue(peakWeek, primaryMetric)) : '0'}.
        </p>
        <dl className="an-stat-grid">
          <Stat label="Load" value={Math.round(peakWeek?.load || 0)} />
          <Stat label="Time" value={formatDurationLabel(Math.round(peakWeek?.duration || 0))} />
          <Stat label="Hard" value={peakWeek?.hardSessions || 0} />
        </dl>
      </Card>

      <Card className="an-insight">
        <header className="an-insight-head">
          <span className="an-eyebrow">Activity signature</span>
          <h3 className="an-insight-title">Where the load comes from</h3>
        </header>
        <div className="an-activity-list">
          {topActivityEntries.length > 0 ? topActivityEntries.map(([activityTag, stats]) => {
            const activity = ACTIVITY_TAG_MAP[activityTag]
            const loadShare = totals.load > 0 ? Math.round((stats.load / totals.load) * 100) : 0
            return (
              <div key={activityTag} className="an-activity-row">
                <span className="an-activity-icon">
                  <ActivityIcon name={activity?.icon || 'annet'} className="tag-icon-svg" />
                </span>
                <div className="an-activity-main">
                  <strong>{activity?.label || 'Other'}</strong>
                  <span>{stats.count} sessions · {formatDurationLabel(Math.round(stats.duration))}</span>
                </div>
                <div className="an-activity-values">
                  <strong className="tp-num">{loadShare}%</strong>
                  <span className="tp-num">{Math.round(stats.load)} load</span>
                </div>
              </div>
            )
          }) : <div className="an-empty-mini">No activity data</div>}
        </div>
      </Card>
    </div>
  )
}
