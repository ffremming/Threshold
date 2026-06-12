import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import { ChartCard } from '../AnalysisDashboard/sections/primitives'
import { QUALITY_ORDER, QUALITY_COLORS, QUALITY_LABELS, buildupSeries } from '../../utils/dimensions'
import './QualityTrendChart.css'

const VIEWS = [
  { value: 'stimulus', label: 'Weekly stimulus' },
  { value: 'buildup', label: 'Buildup' },
]

const CAPTIONS = {
  stimulus: 'Each week’s prescribed dose per quality (0–100)',
  buildup: 'Rolling accumulation with decay — fitness builds and fades',
}

// Build five line datasets from a per-week dims array. After `nowIndex`, the
// line is dashed to mark planned (not-yet-completed) weeks.
function buildDatasets(perWeekDims, nowIndex) {
  return QUALITY_ORDER.map((q) => ({
    label: QUALITY_LABELS[q],
    data: perWeekDims.map((d) => Math.round((d && d[q]) || 0)),
    borderColor: QUALITY_COLORS[q],
    backgroundColor: QUALITY_COLORS[q],
    tension: 0.34,
    borderWidth: 2,
    pointRadius: 2,
    pointHoverRadius: 4,
    spanGaps: true,
    segment: {
      borderDash: (ctx) =>
        Number.isInteger(nowIndex) && ctx.p0DataIndex >= nowIndex ? [3, 4] : undefined,
    },
  }))
}

function chartOptions(nowIndex) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, boxWidth: 10, font: { size: 11, weight: '600' } },
      },
      nowMarker: { index: nowIndex, label: 'Now' },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11, weight: '700' } } },
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: 'rgba(148, 163, 184, 0.18)' },
        ticks: { color: '#64748b', font: { size: 11 }, stepSize: 25 },
      },
    },
  }
}

// `weeklyDims`: array of per-week { strength, endurance, vo2max, speed, threshold } (0–100).
// `labels`: x-axis week labels. `nowIndex`: index of the current week in the window.
export default function QualityTrendChart({ weeklyDims = [], labels = [], nowIndex = null }) {
  const [view, setView] = useState('stimulus')

  const series = view === 'buildup' ? buildupSeries(weeklyDims) : weeklyDims
  const data = { labels, datasets: buildDatasets(series, nowIndex) }

  return (
    <ChartCard title="Training quality over time" caption={CAPTIONS[view]} span="full">
      <div className="qtc-toggle" role="tablist" aria-label="Chart view" data-view={view}>
        {VIEWS.map((v) => (
          <button
            key={v.value}
            type="button"
            role="tab"
            aria-selected={view === v.value}
            className={`qtc-toggle-btn${view === v.value ? ' is-active' : ''}`}
            onClick={() => setView(v.value)}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="qtc-canvas">
        <Line data={data} options={chartOptions(nowIndex)} />
      </div>
    </ChartCard>
  )
}
