import { describe, it, expect } from 'vitest'
import { TREND_METRICS, buildTrendChartData, trendChartOptions } from './trendChart'

const SERIES = [
  { key: '2026-23', label: 'W23', distance: 10, duration: 60, load: 100 },
  { key: '2026-24', label: 'W24', distance: 20, duration: 90, load: 200 },
  { key: '2026-25', label: 'W25', distance: 30, duration: 120, load: 300 },
]

describe('TREND_METRICS', () => {
  it('lists distance, duration, and load', () => {
    expect(TREND_METRICS.map(m => m.value)).toEqual(['distance', 'duration', 'load'])
  })
})

describe('buildTrendChartData', () => {
  it('uses the selected metric for the primary line', () => {
    const data = buildTrendChartData(SERIES, 'distance')
    expect(data.labels).toEqual(['W23', 'W24', 'W25'])
    expect(data.datasets[0].data).toEqual([10, 20, 30])
  })

  it('switches the primary line when the metric changes', () => {
    const data = buildTrendChartData(SERIES, 'duration')
    expect(data.datasets[0].data).toEqual([60, 90, 120])
  })

  it('adds a 3-week trailing moving-average line as a second dataset', () => {
    const data = buildTrendChartData(SERIES, 'load')
    expect(data.datasets[1].data).toEqual([100, 150, 200])
  })
})

describe('trendChartOptions', () => {
  it('returns a chart.js options object for the given metric meta', () => {
    const meta = TREND_METRICS.find(m => m.value === 'distance')
    const opts = trendChartOptions(meta)
    expect(opts.responsive).toBe(true)
    expect(opts.maintainAspectRatio).toBe(false)
    expect(opts.scales.y.beginAtZero).toBe(true)
  })

  it('formats y-axis ticks by unit (km for distance, time for duration)', () => {
    const distanceTick = trendChartOptions(TREND_METRICS.find(m => m.value === 'distance'))
      .scales.y.ticks.callback(12)
    const durationTick = trendChartOptions(TREND_METRICS.find(m => m.value === 'duration'))
      .scales.y.ticks.callback(90)
    const loadTick = trendChartOptions(TREND_METRICS.find(m => m.value === 'load'))
      .scales.y.ticks.callback(250)
    // distance → km label, duration → time label, load → plain number
    expect(distanceTick).toMatch(/km/i)
    expect(durationTick).not.toMatch(/km/i)
    expect(loadTick).toBe('250')
  })
})
