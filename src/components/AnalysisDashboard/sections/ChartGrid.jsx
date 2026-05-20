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
      <ChartCard title="Performance trend" caption="Bytt mellom load, tid, distanse og frekvens for å lese periodiseringen fra flere vinkler." span="wide">
        <Bar data={performanceData} options={performanceOptions(currentVisibleIndex)} />
      </ChartCard>
      <ChartCard title="Load balance" caption="Akutt og kronisk last med ratio-linje for å spotte topper og avlastningsbehov." span="wide">
        <Line data={balanceData} options={balanceOptions(currentVisibleIndex)} />
      </ChartCard>
      <ChartCard title="Aktivitetsmiks per uke" caption="Stablede load-barer viser hvordan ulike idretter bygger totalbelastningen." span="wide">
        {activityStackData.datasets.length > 0
          ? <Bar data={activityStackData} options={stackedOptions(currentVisibleIndex)} />
          : <div className="an-empty-mini">Ingen aktivitetsdata</div>}
      </ChartCard>
      <ChartCard title="Sonefordeling tid" caption="Estimert tidsbruk per sone." size="doughnut">
        {zoneDurationData.datasets[0].data.length > 0
          ? <Doughnut data={zoneDurationData} options={doughnutOptions} />
          : <div className="an-empty-mini">Ingen sonedata</div>}
      </ChartCard>
      <ChartCard title="Sonefordeling load" caption="Belastning splittet per sone." size="doughnut">
        {zoneLoadData.datasets[0].data.length > 0
          ? <Doughnut data={zoneLoadData} options={doughnutOptions} />
          : <div className="an-empty-mini">Ingen sonedata</div>}
      </ChartCard>
      <ChartCard title="Load share" caption="Aktiviteter rangert etter bidrag til total treningsstress." size="doughnut">
        {activityShareData.datasets[0].data.length > 0
          ? <Doughnut data={activityShareData} options={doughnutOptions} />
          : <div className="an-empty-mini">Ingen aktivitetsdata</div>}
      </ChartCard>
    </div>
  )
}
