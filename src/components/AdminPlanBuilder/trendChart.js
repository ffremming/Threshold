import { averageLastValues } from '../../utils/seriesMath'
import { formatDurationLabel, formatKmValue } from '../../utils'
import { ACTIVITY_TAG_MAP } from '../../utils/activity'

// The three metrics the planner trend chart can switch between. `color` is the
// line color; `unit` drives axis/tooltip formatting.
export const TREND_METRICS = [
  { value: 'distance', label: 'Distance', unit: 'km', color: '#2563eb' },
  { value: 'duration', label: 'Duration', unit: 'min', color: '#10b981' },
  { value: 'load', label: 'Load', unit: '', color: '#f97316' },
]

function metricColor(metric) {
  return (TREND_METRICS.find(m => m.value === metric) || TREND_METRICS[0]).color
}

// Distance splits into one line per sport (colored by its canonical activity
// color) instead of a single total line with a moving average — a coach reads
// the per-sport mix directly. Sports are ordered by total distance descending
// so the legend leads with the biggest contributors. A sport plots 0 in weeks
// it is absent so every line spans the full x-axis.
function buildDistanceSportData(series) {
  const totals = {}
  series.forEach(point => {
    const byTag = point.activityDistance || {}
    Object.keys(byTag).forEach(tag => {
      totals[tag] = (totals[tag] || 0) + (byTag[tag] || 0)
    })
  })
  const tags = Object.keys(totals).sort((a, b) => totals[b] - totals[a])

  return {
    labels: series.map(point => point.label),
    datasets: tags.map(tag => {
      const meta = ACTIVITY_TAG_MAP[tag]
      const color = meta?.color || '#64748b'
      return {
        label: meta?.label || tag,
        data: series.map(point =>
          Number(((point.activityDistance || {})[tag] || 0).toFixed(1))),
        borderColor: color,
        backgroundColor: color,
        pointBackgroundColor: color,
        pointRadius: 3,
        tension: 0.32,
      }
    }),
  }
}

// Build chart.js data for the selected metric. Distance fans out into per-sport
// lines (see buildDistanceSportData); duration and load keep a primary line
// plus a 3-week trailing moving average. Planner-local — does not depend on
// dashboard charts. The moving average is computed from raw values and rounded
// only at the end (so it matches the dashboard's MA), while the plotted points
// are rounded for a clean tooltip.
export function buildTrendChartData(series, metric) {
  if (metric === 'distance') return buildDistanceSportData(series)

  const raw = series.map(point => point[metric] || 0)
  const values = raw.map(value => Number(value.toFixed(1)))
  const movingAverage = series.map((_, index) =>
    Number(averageLastValues(raw, 3, index).toFixed(1)))
  const color = metricColor(metric)

  return {
    labels: series.map(point => point.label),
    datasets: [
      {
        label: 'Weekly',
        data: values,
        borderColor: color,
        backgroundColor: `${color}22`,
        fill: true,
        tension: 0.32,
        pointRadius: 3,
        order: 2,
      },
      {
        label: '3-week average',
        data: movingAverage,
        borderColor: '#0f172a',
        pointBackgroundColor: '#0f172a',
        pointBorderWidth: 0,
        pointRadius: 2,
        borderDash: [6, 6],
        tension: 0.3,
        order: 1,
      },
    ],
  }
}

function formatTick(value, unit) {
  if (unit === 'km') return formatKmValue(value)
  if (unit === 'min') return formatDurationLabel(Math.round(value))
  return `${Math.round(value)}`
}

// chart.js options mirroring the dashboard's performance chart style, but
// planner-local and English-labelled. `metricMeta` is a TREND_METRICS entry.
export function trendChartOptions(metricMeta) {
  const unit = metricMeta?.unit || ''
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          boxWidth: 10,
          font: { size: 11, weight: '600' },
        },
      },
      tooltip: {
        intersect: false,
        mode: 'index',
        callbacks: {
          label: context => `${context.dataset.label}: ${formatTick(context.parsed.y, unit)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11, weight: '700' } },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.18)' },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: value => formatTick(value, unit),
        },
      },
    },
  }
}
