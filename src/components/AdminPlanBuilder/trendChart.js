import { averageLastValues } from '../../utils/seriesMath'
import { formatDurationLabel, formatKmValue } from '../../utils'

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

// Build chart.js data for the selected metric: a primary line plus its 3-week
// trailing moving average. Planner-local — does not depend on dashboard charts.
// The moving average is computed from raw values and rounded only at the end
// (so it matches the dashboard's MA), while the plotted points are rounded for
// a clean tooltip.
export function buildTrendChartData(series, metric) {
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
