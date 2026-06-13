import { describe, it, expect } from 'vitest'
import { ACTIVITY_TAG_MAP } from '../../utils/activity'
import { QUALITY_ORDER, QUALITY_COLORS, QUALITY_LABELS } from '../../utils/dimensions'
import { TREND_METRICS, buildTrendChartData, trendChartOptions } from './trendChart'

// Series with per-activity breakdowns (as computeWeekSeries now emits).
// run appears every week; bike is absent in W24.
const SPORT_SERIES = [
  { key: '2026-23', label: 'W23', distance: 10, duration: 60, load: 100,
    activityDistance: { run: 6, bike: 4 }, activityDuration: { run: 36, bike: 24 }, activityLoad: { run: 60, bike: 40 } },
  { key: '2026-24', label: 'W24', distance: 12, duration: 90, load: 200,
    activityDistance: { run: 12 }, activityDuration: { run: 90 }, activityLoad: { run: 200 } },
  { key: '2026-25', label: 'W25', distance: 25, duration: 120, load: 300,
    activityDistance: { run: 15, bike: 10 }, activityDuration: { run: 72, bike: 48 }, activityLoad: { run: 180, bike: 120 } },
]

describe('TREND_METRICS', () => {
  it('lists distance, duration, load, and quality', () => {
    expect(TREND_METRICS.map(m => m.value)).toEqual(['distance', 'duration', 'load', 'quality'])
  })
})

// Distance, duration, and load all fan out into one line per activity (no single
// total line, no moving average) — a coach reads the per-activity mix directly.
describe.each([
  ['distance', 'activityDistance', [6, 12, 15], [4, 0, 10]],
  ['duration', 'activityDuration', [36, 90, 72], [24, 0, 48]],
  ['load', 'activityLoad', [60, 200, 180], [40, 0, 120]],
])('buildTrendChartData — %s per-activity', (metric, _mapKey, runVals, bikeVals) => {
  it('emits one line per activity that appears across the weeks', () => {
    const data = buildTrendChartData(SPORT_SERIES, metric)
    expect(data.labels).toEqual(['W23', 'W24', 'W25'])
    const labels = data.datasets.map(d => d.label).sort()
    expect(labels).toEqual([ACTIVITY_TAG_MAP.bike.label, ACTIVITY_TAG_MAP.run.label].sort())
  })

  it('plots each activity per week, with 0 for weeks it is absent', () => {
    const data = buildTrendChartData(SPORT_SERIES, metric)
    const run = data.datasets.find(d => d.label === ACTIVITY_TAG_MAP.run.label)
    const bike = data.datasets.find(d => d.label === ACTIVITY_TAG_MAP.bike.label)
    expect(run.data).toEqual(runVals)
    expect(bike.data).toEqual(bikeVals)
  })

  it('colors each activity line with its canonical activity color', () => {
    const data = buildTrendChartData(SPORT_SERIES, metric)
    const run = data.datasets.find(d => d.label === ACTIVITY_TAG_MAP.run.label)
    expect(run.borderColor).toBe(ACTIVITY_TAG_MAP.run.color)
  })

  it('does not add a moving-average line', () => {
    const data = buildTrendChartData(SPORT_SERIES, metric)
    expect(data.datasets.some(d => /average/i.test(d.label))).toBe(false)
  })
})

const QUALITY_SERIES = [
  { key: '2026-23', label: 'W23', dims: { threshold: 10, vo2max: 20, speed: 0, strength: 5, muscular_endurance: 8, endurance: 40 } },
  { key: '2026-24', label: 'W24', dims: { threshold: 30, vo2max: 25, speed: 12, strength: 15, muscular_endurance: 18, endurance: 60 } },
]

describe('buildTrendChartData — quality', () => {
  it('emits one dataset per quality in QUALITY_ORDER', () => {
    const data = buildTrendChartData(QUALITY_SERIES, 'quality')
    expect(data.datasets.map(d => d.label)).toEqual(QUALITY_ORDER.map(q => QUALITY_LABELS[q]))
  })

  it('plots each quality value per week from the point dims', () => {
    const data = buildTrendChartData(QUALITY_SERIES, 'quality')
    const threshold = data.datasets.find(d => d.label === QUALITY_LABELS.threshold)
    expect(threshold.data).toEqual([10, 30])
    expect(threshold.borderColor).toBe(QUALITY_COLORS.threshold)
  })

  it('does not add a moving-average line for quality', () => {
    const data = buildTrendChartData(QUALITY_SERIES, 'quality')
    expect(data.datasets.some(d => /average/i.test(d.label))).toBe(false)
  })
})

describe('trendChartOptions — quality axis', () => {
  it('uses a fixed 0–100 y-axis for the quality metric', () => {
    const meta = TREND_METRICS.find(m => m.value === 'quality')
    const opts = trendChartOptions(meta)
    expect(opts.scales.y.max).toBe(100)
    expect(opts.scales.y.beginAtZero).toBe(true)
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
