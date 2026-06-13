import { useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import '../AnalysisDashboard/charts/registry'
import { TREND_METRICS, buildTrendChartData, trendChartOptions } from './trendChart'
import { getTrendMetric, setTrendMetric } from './trendMetricStore'

// Trend chart panel for the month view. One line chart with a
// Distance/Duration/Load switcher and a 3-week moving-average line. `series`
// is precomputed by computeWeekSeries — the panel does no aggregation.
// (Show/hide is owned by useMonthTrendsToggle + MonthGridPanel, not here.)
//
// The chosen metric is read from / written to trendMetricStore (module scope)
// so it survives the panel remounting when the user navigates weeks; local
// state would snap back to the default on every week change.
export default function MonthTrendPanel({ series }) {
  const [metric, setMetricState] = useState(getTrendMetric)
  const setMetric = (next) => { setTrendMetric(next); setMetricState(next) }
  const metricMeta = TREND_METRICS.find(m => m.value === metric) || TREND_METRICS[0]

  const safeSeries = series || []
  const data = useMemo(() => buildTrendChartData(safeSeries, metric), [safeSeries, metric])
  const options = useMemo(() => trendChartOptions(metricMeta), [metricMeta])

  return (
    <section className="pb-month-trends" aria-label="Training trend chart">
      <div className="pb-trend-switcher" role="group" aria-label="Trend metric">
        {TREND_METRICS.map(m => (
          <button
            key={m.value}
            type="button"
            className={`pb-trend-metric${m.value === metric ? ' is-active' : ''}`}
            aria-pressed={m.value === metric}
            onClick={() => setMetric(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="pb-trend-canvas">
        <Line data={data} options={options} />
      </div>
    </section>
  )
}
