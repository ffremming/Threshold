import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { formatDurationLabel, formatKmValue } from '../../utils'
import ActivityIcon from '../ActivityIcon'
import BuilderPanelHeader from './BuilderPanelHeader'
import MetricCard from './MetricCard'
import { builderChartOptions, doughnutOptions, trendChartOptions } from './chartOptions'

export default function InsightsPanel({
  visiblePanelIds,
  movePanel,
  weekStats,
  dailyLoadChartData,
  loadingAnalysis,
  focusTrendWeek,
  trendChartData,
  workouts,
  loadMixChartData,
  distanceDistributionChartData,
}) {
  return (
    <aside className="pb-panel pb-panel--insights">
      <BuilderPanelHeader
        title="Ukeoversikt"
        copy="Belastning og distanse oppdateres fortløpende."
        panelId="insights"
        visiblePanelIds={visiblePanelIds}
        onMove={movePanel}
      />

      <div className="pb-metric-grid">
        <MetricCard label="Økter" value={String(weekStats.sessionCount)} helper={`${weekStats.hardCount} harde / ${weekStats.easyCount} rolige`} />
        <MetricCard label="Tid" value={formatDurationLabel(weekStats.totalDuration)} helper="Estimert" />
        <MetricCard label="Load" value={String(weekStats.totalLoad)} helper="Tid × intensitet" />
        <MetricCard label="Mek. load" value={String(weekStats.totalMechanicalLoad)} helper="Aktivitet × distanse" />
      </div>

      <div className="pb-distance">
        <div className="pb-section-title">Distanse per aktivitet</div>
        {weekStats.distanceByActivity.length === 0 ? (
          <div className="pb-empty-copy">Ingen distanse registrert ennå denne uken.</div>
        ) : (
          <ul className="pb-distance-list">
            {weekStats.distanceByActivity.map(activity => (
              <li key={activity.value} className="pb-distance-row">
                <span className="pb-distance-label">
                  <span className="pb-card-icon"><ActivityIcon name={activity.icon} className="tag-icon-svg" /></span>
                  <span>{activity.label}</span>
                </span>
                <strong className="tp-num">{formatKmValue(activity.total)}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pb-chart">
        <div className="pb-section-title">Belastning per dag</div>
        <div className="pb-chart-shell">
          <Bar data={dailyLoadChartData} options={builderChartOptions} />
        </div>
      </div>

      <div className="pb-chart">
        <div className="pb-section-title">Trend rundt valgt uke</div>
        <p className="pb-chart-copy">
          Noen uker før og etter med acute load, km og readiness.
        </p>
        {loadingAnalysis ? (
          <div className="pb-empty-copy">Laster trend…</div>
        ) : (
          <>
            <div className="pb-trend-summary">
              <span>Acute <strong className="tp-num">{Math.round(focusTrendWeek?.acuteLoad || 0)}</strong></span>
              <span>Km <strong className="tp-num">{Number((focusTrendWeek?.distance || 0).toFixed(1))}</strong></span>
              <span>Readiness <strong className="tp-num">{Number((focusTrendWeek?.trainingReadiness || 0).toFixed(2))}</strong></span>
            </div>
            <div className="pb-chart-shell pb-chart-shell--tall">
              <Line data={trendChartData} options={trendChartOptions} />
            </div>
          </>
        )}
      </div>

      <div className="pb-chart">
        <div className="pb-section-title">Belastningsmiks</div>
        {workouts.length === 0 ? (
          <div className="pb-empty-copy">Legg inn økter for å se fordeling.</div>
        ) : (
          <div className="pb-chart-shell">
            <Doughnut data={loadMixChartData} options={doughnutOptions} />
          </div>
        )}
      </div>

      <div className="pb-chart">
        <div className="pb-section-title">Distansefordeling</div>
        {weekStats.distanceByActivity.length === 0 ? (
          <div className="pb-empty-copy">Ingen distanse for denne uken.</div>
        ) : (
          <div className="pb-chart-shell">
            <Doughnut data={distanceDistributionChartData} options={doughnutOptions} />
          </div>
        )}
      </div>

      <div className="pb-generator">
        <div className="pb-section-title">Automatisk generering</div>
        <p className="pb-empty-copy">Plassholder for automatisk generering av treningsplan. Kommer i neste iterasjon.</p>
        <button type="button" className="pb-mini-btn" disabled>
          Generer plan senere
        </button>
      </div>
    </aside>
  )
}
