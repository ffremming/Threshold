import { ACTIVITY_TAG_MAP, ACTIVITY_TAGS, ZONE_COLORS } from '../../../utils'
import { averageLastValues, getWeekMetricValue } from '../utils'

export function buildPerformanceChartData(labels, weeklyStats, primaryMetric, selectedMetricMeta) {
  return {
    labels,
    datasets: [
      {
        type: 'bar',
        label: selectedMetricMeta.label,
        data: weeklyStats.map(week => Number(getWeekMetricValue(week, primaryMetric).toFixed(1))),
        backgroundColor: context => {
          const chart = context.chart
          const { chartArea } = chart
          if (!chartArea) return 'rgba(37, 99, 235, 0.75)'
          const gradient = chart.ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
          gradient.addColorStop(0, 'rgba(15, 23, 42, 0.08)')
          gradient.addColorStop(0.15, `${selectedMetricMeta.color}88`)
          gradient.addColorStop(1, selectedMetricMeta.color)
          return gradient
        },
        borderRadius: 14,
        borderSkipped: false,
        order: 2,
      },
      {
        type: 'line',
        label: '3-ukers glidende snitt',
        data: weeklyStats.map((_, index) => Number(averageLastValues(
          weeklyStats.map(week => getWeekMetricValue(week, primaryMetric)),
          3,
          index
        ).toFixed(1))),
        borderColor: '#0f172a',
        pointBackgroundColor: '#0f172a',
        pointBorderWidth: 0,
        pointRadius: 3,
        tension: 0.34,
        order: 1,
      },
    ],
  }
}

export function buildBalanceChartData(labels, weeklyStats) {
  return {
    labels,
    datasets: [
      {
        label: 'Ukesload',
        data: weeklyStats.map(week => week.load),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.16)',
        fill: true,
        tension: 0.32,
        pointRadius: 3,
      },
      {
        label: 'Akutt (3 uker)',
        data: weeklyStats.map(week => Number(week.acuteLoad.toFixed(1))),
        borderColor: '#2563eb',
        tension: 0.28,
        pointRadius: 2,
      },
      {
        label: 'Kronisk (6 uker)',
        data: weeklyStats.map(week => Number(week.chronicLoad.toFixed(1))),
        borderColor: '#16a34a',
        tension: 0.28,
        pointRadius: 2,
      },
      {
        label: 'Akutt/kronisk',
        data: weeklyStats.map(week => Number(week.readinessRatio.toFixed(2))),
        borderColor: '#7c3aed',
        backgroundColor: '#7c3aed',
        pointRadius: 2,
        borderDash: [6, 6],
        yAxisID: 'y1',
        tension: 0.22,
      },
    ],
  }
}

export function buildActivityStackChartData(labels, weeklyStats) {
  return {
    labels,
    datasets: ACTIVITY_TAGS.map(tag => ({
      label: tag.label,
      data: weeklyStats.map(week => Math.round((week.activityLoad[tag.value] || 0) * 10) / 10),
      backgroundColor: tag.color,
      borderRadius: 8,
      borderSkipped: false,
      stack: 'activity',
    })).filter(dataset => dataset.data.some(value => value > 0)),
  }
}

export function buildZoneDoughnutData(zoneTotals) {
  const filtered = Object.entries(zoneTotals).filter(([, value]) => value > 0)
  return {
    labels: filtered.map(([zone]) => `Sone ${zone}`),
    datasets: [{
      data: filtered.map(([, value]) => Math.round(value)),
      backgroundColor: filtered.map(([zone]) => ZONE_COLORS[zone]?.border || '#94a3b8'),
      borderWidth: 0,
      hoverOffset: 10,
    }],
  }
}

export function buildActivityShareChartData(topActivityEntries) {
  return {
    labels: topActivityEntries.map(([activityTag]) => ACTIVITY_TAG_MAP[activityTag]?.label || 'Annet'),
    datasets: [{
      data: topActivityEntries.map(([, stats]) => Math.round(stats.load)),
      backgroundColor: topActivityEntries.map(([activityTag]) => ACTIVITY_TAG_MAP[activityTag]?.color || '#94a3b8'),
      borderWidth: 0,
      hoverOffset: 10,
    }],
  }
}
