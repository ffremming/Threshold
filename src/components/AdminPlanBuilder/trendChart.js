import { formatDurationLabel, formatKmValue } from '../../utils'
import { ACTIVITY_TAG_MAP } from '../../utils/activity'
import { QUALITY_ORDER, QUALITY_COLORS, QUALITY_LABELS } from '../../utils/dimensions'

// The metrics the planner trend chart can switch between. `color` is the line
// color; `unit` drives axis/tooltip formatting. Quality is multi-line (one per
// training quality) on a fixed 0–100 axis, so its `unit`/`color` are unused.
export const TREND_METRICS = [
  { value: 'distance', label: 'Distance', unit: 'km', color: '#2563eb' },
  { value: 'duration', label: 'Duration', unit: 'min', color: '#10b981' },
  { value: 'load', label: 'Load', unit: '', color: '#f97316' },
  { value: 'quality', label: 'Quality', unit: '', color: '#64748b' },
]

// Which per-week per-activity map each metric splits on. `distance` is the
// fallback for any unmapped metric.
const ACTIVITY_MAP_KEY = {
  distance: 'activityDistance',
  duration: 'activityDuration',
  load: 'activityLoad',
}

// Distance, duration, and load each split into one line per activity (colored by
// its canonical activity color) instead of a single total line with a moving
// average — a coach reads the per-activity mix directly. Activities are ordered
// by total descending so the legend leads with the biggest contributors. An
// activity plots 0 in weeks it is absent so every line spans the full x-axis.
function buildActivitySplitData(series, mapKey) {
  const totals = {}
  series.forEach(point => {
    const byTag = point[mapKey] || {}
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
          Number(((point[mapKey] || {})[tag] || 0).toFixed(1))),
        borderColor: color,
        backgroundColor: color,
        pointBackgroundColor: color,
        pointRadius: 3,
        tension: 0.32,
      }
    }),
  }
}

// Quality fans out into one line per training quality (0–100), in the stable
// QUALITY_ORDER, colored/labelled by the dimensions engine. Each point reads its
// precomputed per-week dims map (no aggregation here). Styling mirrors the
// analysis-view QualityTrendChart.
function buildQualityChartData(series) {
  return {
    labels: series.map(point => point.label),
    datasets: QUALITY_ORDER.map(q => ({
      label: QUALITY_LABELS[q],
      data: series.map(point => Math.round((point.dims && point.dims[q]) || 0)),
      borderColor: QUALITY_COLORS[q],
      backgroundColor: QUALITY_COLORS[q],
      pointBackgroundColor: QUALITY_COLORS[q],
      tension: 0.34,
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 4,
      spanGaps: true,
    })),
  }
}

// Build chart.js data for the selected metric. Distance, duration, and load all
// fan out into one line per activity (see buildActivitySplitData); quality fans
// out into per-quality lines (see buildQualityChartData). Planner-local — does
// not depend on dashboard charts.
export function buildTrendChartData(series, metric) {
  if (metric === 'quality') return buildQualityChartData(series)
  return buildActivitySplitData(series, ACTIVITY_MAP_KEY[metric] || ACTIVITY_MAP_KEY.distance)
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
  const isQuality = metricMeta?.value === 'quality'
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
          label: context => isQuality
            ? `${context.dataset.label}: ${Math.round(context.parsed.y)}`
            : `${context.dataset.label}: ${formatTick(context.parsed.y, unit)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11, weight: '700' } },
      },
      y: isQuality
        ? {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(148, 163, 184, 0.18)' },
            ticks: { color: '#64748b', font: { size: 11 }, stepSize: 25 },
          }
        : {
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
