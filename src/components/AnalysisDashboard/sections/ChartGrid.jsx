import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { ChartCard } from './primitives'
import {
  buildActivityShareChartData,
  buildActivityStackChartData,
  buildBalanceChartData,
  buildPerformanceChartData,
  buildZoneDoughnutData,
} from '../charts/data'
import {
  balanceOptions,
  doughnutOptions,
  performanceOptions,
  stackedOptions,
} from '../charts/options'
import './charts.css'

export default function ChartGrid({
  labels, weeklyStats, primaryMetric, selectedMetricMeta,
  zoneTotals, zoneLoadTotals, topActivityEntries, currentVisibleIndex,
}) {
  const performanceData = buildPerformanceChartData(labels, weeklyStats, primaryMetric, selectedMetricMeta)
  const balanceData = buildBalanceChartData(labels, weeklyStats)
  const activityStackData = buildActivityStackChartData(labels, weeklyStats)
  const zoneDurationData = buildZoneDoughnutData(zoneTotals)
  const zoneLoadData = buildZoneDoughnutData(zoneLoadTotals)
  const activityShareData = buildActivityShareChartData(topActivityEntries)

  return (
    <div className="an-chart-grid">
      <ChartCard title="Performance trend" caption="Switch between load, time, distance, and frequency to read the periodization from multiple angles." span="wide">
        <Bar data={performanceData} options={performanceOptions(currentVisibleIndex)} />
      </ChartCard>
      <ChartCard title="Load balance" caption="Acute and chronic load with a ratio line to spot peaks and recovery needs." span="wide">
        <Line data={balanceData} options={balanceOptions(currentVisibleIndex)} />
      </ChartCard>
      <ChartCard title="Activity mix per week" caption="Stacked load bars show how different sports build the total load." span="wide">
        {activityStackData.datasets.length > 0
          ? <Bar data={activityStackData} options={stackedOptions(currentVisibleIndex)} />
          : <div className="an-empty-mini">No activity data</div>}
      </ChartCard>
      <ChartCard title="Zone distribution time" caption="Estimated time spent per zone." size="doughnut">
        {zoneDurationData.datasets[0].data.length > 0
          ? <Doughnut data={zoneDurationData} options={doughnutOptions} />
          : <div className="an-empty-mini">No zone data</div>}
      </ChartCard>
      <ChartCard title="Zone distribution load" caption="Load split per zone." size="doughnut">
        {zoneLoadData.datasets[0].data.length > 0
          ? <Doughnut data={zoneLoadData} options={doughnutOptions} />
          : <div className="an-empty-mini">No zone data</div>}
      </ChartCard>
      <ChartCard title="Load share" caption="Activities ranked by contribution to total training stress." size="doughnut">
        {activityShareData.datasets[0].data.length > 0
          ? <Doughnut data={activityShareData} options={doughnutOptions} />
          : <div className="an-empty-mini">No activity data</div>}
      </ChartCard>
    </div>
  )
}
