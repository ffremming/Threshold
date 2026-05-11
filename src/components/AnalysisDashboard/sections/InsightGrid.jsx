import { ACTIVITY_TAG_MAP, formatDurationLabel, formatKmValue } from '../../../utils'
import ActivityIcon from '../../ActivityIcon'
import { Card, Pill } from '../../ui'
import { Stat } from './primitives'
import { formatMetricValue, getWeekLabel, getWeekMetricValue } from '../utils'

export default function InsightGrid({
  focusWeek, peakWeek, topActivityEntries, totals, primaryMetric, strain,
}) {
  return (
    <div className="an-insight-grid">
      <Card className="an-insight">
        <header className="an-insight-head">
          <span className="an-eyebrow">Fokusuke</span>
          <h3 className="an-insight-title">Uke {focusWeek?.week.week}</h3>
        </header>
        <dl className="an-stat-grid">
          <Stat label="Load" value={Math.round(focusWeek?.load || 0)} />
          <Stat label="Tid" value={formatDurationLabel(Math.round(focusWeek?.duration || 0))} />
          <Stat label="Distanse" value={formatKmValue(focusWeek?.distance || 0)} />
          <Stat label="Harde økter" value={focusWeek?.hardSessions || 0} />
        </dl>
        <div className="an-pill-row">
          <Pill>Strain {strain}</Pill>
          <Pill>Mekanisk {Math.round(focusWeek?.mechanicalLoad || 0)}</Pill>
          {focusWeek?.longestSession ? (
            <Pill>Lengste {formatDurationLabel(focusWeek.longestSession.duration)}</Pill>
          ) : null}
        </div>
      </Card>

      <Card className="an-insight">
        <header className="an-insight-head">
          <span className="an-eyebrow">Peak week</span>
          <h3 className="an-insight-title">{peakWeek ? getWeekLabel(peakWeek.week) : 'Ingen data'}</h3>
        </header>
        <p className="an-insight-copy">
          Toppuke på valgt metrikk med {peakWeek ? formatMetricValue(primaryMetric, getWeekMetricValue(peakWeek, primaryMetric)) : '0'}.
        </p>
        <dl className="an-stat-grid">
          <Stat label="Load" value={Math.round(peakWeek?.load || 0)} />
          <Stat label="Tid" value={formatDurationLabel(Math.round(peakWeek?.duration || 0))} />
          <Stat label="Harde" value={peakWeek?.hardSessions || 0} />
        </dl>
      </Card>

      <Card className="an-insight">
        <header className="an-insight-head">
          <span className="an-eyebrow">Aktivitetssignatur</span>
          <h3 className="an-insight-title">Hvor belastningen kommer fra</h3>
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
                  <strong>{activity?.label || 'Annet'}</strong>
                  <span>{stats.count} økter · {formatDurationLabel(Math.round(stats.duration))}</span>
                </div>
                <div className="an-activity-values">
                  <strong className="tp-num">{loadShare}%</strong>
                  <span className="tp-num">{Math.round(stats.load)} load</span>
                </div>
              </div>
            )
          }) : <div className="an-empty-mini">Ingen aktivitetsdata</div>}
        </div>
      </Card>
    </div>
  )
}
