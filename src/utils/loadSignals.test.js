import { describe, it, expect } from 'vitest'
import { classifyAcwr, computeWeekSignals, buildWeekStats } from './loadSignals'

describe('classifyAcwr', () => {
  it('classifies the band boundaries on the lower-risk side', () => {
    expect(classifyAcwr(0.5)).toBe('undertraining')
    expect(classifyAcwr(0.8)).toBe('safe')   // inclusive lower edge
    expect(classifyAcwr(1.3)).toBe('safe')   // 1.3 is still safe
    expect(classifyAcwr(1.4)).toBe('caution')
    expect(classifyAcwr(1.5)).toBe('caution') // 1.5 is still caution
    expect(classifyAcwr(1.6)).toBe('spike')
  })

  it('returns null for a non-finite or zero ratio (no chronic history yet)', () => {
    expect(classifyAcwr(0)).toBeNull()
    expect(classifyAcwr(NaN)).toBeNull()
    expect(classifyAcwr(Infinity)).toBeNull()
  })
})

// Build a chronological week list with given loads by injecting one workout per
// week whose estimated load we control. We bypass the estimator by giving each
// week a single completed workout and asserting on ramp/acwr structure rather
// than exact load — exact load math is covered by weekSummary tests.
function weeksWithKeys(n) {
  return Array.from({ length: n }, (_, i) => ({
    week: i + 1, year: 2026, key: `2026-${i + 1}`,
  }))
}

describe('buildWeekStats past-week boundary', () => {
  // A week holding one planned-but-not-yet-completed session.
  const planned = [{ activityTag: 'run', type: 'rolig', intensityZone: [2], completed: false, notes: '60 min' }]

  it('counts planned sessions for the current and future weeks', () => {
    const week = { week: 20, year: 2026, key: '2026-20' }
    const byKey = { '2026-20': planned }
    // Today is week 20: week 20 is the current week, not past → planned counts.
    const stats = buildWeekStats(week, byKey, 20, 2026)
    expect(stats.count).toBe(1)
    expect(stats.load).toBeGreaterThan(0)
  })

  it('drops planned sessions only for weeks strictly before today, regardless of the navigation cursor', () => {
    const week = { week: 20, year: 2026, key: '2026-20' }
    const byKey = { '2026-20': planned }
    // Bug repro: the user navigated the cursor forward to week 30, but today is
    // still week 20. Week 20 must NOT be treated as past just because the cursor
    // moved past it — planned sessions there should still count.
    const todayWeek = 20
    const todayYear = 2026
    const stats = buildWeekStats(week, byKey, 30, 2026, null, todayWeek, todayYear)
    expect(stats.count).toBe(1)
    expect(stats.load).toBeGreaterThan(0)
  })

  it('still drops planned sessions for genuinely past weeks', () => {
    const week = { week: 10, year: 2026, key: '2026-10' }
    const byKey = { '2026-10': planned }
    // Today is week 20; week 10 is genuinely past → planned dropped.
    const stats = buildWeekStats(week, byKey, 30, 2026, null, 20, 2026)
    expect(stats.count).toBe(0)
    expect(stats.load).toBe(0)
  })
})

describe('computeWeekSignals', () => {
  it('returns a map keyed by week.key with a signal entry per week', () => {
    const weeks = weeksWithKeys(3)
    const byKey = { '2026-1': [], '2026-2': [], '2026-3': [] }
    const signals = computeWeekSignals(weeks, byKey, 99, 2026) // all weeks are "past"
    expect(Object.keys(signals).sort()).toEqual(['2026-1', '2026-2', '2026-3'])
    for (const key of Object.keys(signals)) {
      expect(signals[key]).toHaveProperty('load')
      expect(signals[key]).toHaveProperty('rampPct')
      expect(signals[key]).toHaveProperty('acwr')
      expect(signals[key]).toHaveProperty('readiness')
      expect(signals[key]).toHaveProperty('settling')
    }
  })

  it('marks the first weeks as settling until chronic has 6 weeks of history', () => {
    const weeks = weeksWithKeys(8)
    const byKey = Object.fromEntries(weeks.map(w => [w.key, []]))
    const signals = computeWeekSignals(weeks, byKey, 99, 2026)
    expect(signals['2026-1'].settling).toBe(true)
    expect(signals['2026-5'].settling).toBe(true)  // only 5 weeks of history
    expect(signals['2026-6'].settling).toBe(false) // 6 weeks of history
    expect(signals['2026-8'].settling).toBe(false)
  })

  it('reports rampPct as null when the previous week had zero load', () => {
    const weeks = weeksWithKeys(2)
    const byKey = { '2026-1': [], '2026-2': [] } // both zero load
    const signals = computeWeekSignals(weeks, byKey, 99, 2026)
    expect(signals['2026-1'].rampPct).toBeNull() // no previous week at all
    expect(signals['2026-2'].rampPct).toBeNull() // previous load is 0
  })

  // One completed run per week. Load = duration * intensity factor, and the
  // factor is identical across these (same type/zone), so load scales linearly
  // with the minutes in `notes` — letting us assert exact ramp % and the
  // acute(3wk) vs chronic(6wk) wiring with real (non-zero) loads.
  const run = mins => [{ activityTag: 'run', type: 'rolig', intensityZone: [2], completed: true, notes: `${mins} min` }]

  it('computes an exact week-over-week ramp from real loads', () => {
    const weeks = weeksWithKeys(2)
    const byKey = { '2026-1': run(60), '2026-2': run(120) } // load doubles
    const signals = computeWeekSignals(weeks, byKey, 99, 2026)
    expect(signals['2026-2'].rampPct).toBeCloseTo(100, 5) // +100%
  })

  it('wires acute(3wk) above chronic(6wk) into a spike when recent load jumps', () => {
    // Weeks 1-6 easy (60 min), weeks 7-8 a sharp 5x block (300 min). Week 8's
    // 3-week acute avg ≈ 3.67·L sits well above the 6-week chronic avg ≈ 2.33·L
    // (L = the easy-week load), so ACWR ≈ 1.57 → spike. This pins the acute(3)
    // vs chronic(6) windowing, not just the structural shape.
    const weeks = weeksWithKeys(8)
    const byKey = Object.fromEntries(
      weeks.map(w => [w.key, run(w.week >= 7 ? 300 : 60)])
    )
    const signals = computeWeekSignals(weeks, byKey, 99, 2026)
    const w8 = signals['2026-8']
    expect(w8.acuteLoad).toBeGreaterThan(w8.chronicLoad)
    expect(w8.acwr).toBeGreaterThan(1.5)
    expect(w8.readiness).toBe('spike')
  })
})

import { computeWeekSeries } from './loadSignals'

describe('computeWeekSeries', () => {
  const run = (mins, km) => [{
    activityTag: 'run', type: 'rolig', intensityZone: [2], completed: true,
    notes: `${mins} min`, distance: `${km} km`,
  }]

  it('returns one ordered entry per week with key/label/distance/duration/load', () => {
    const weeks = [
      { week: 23, year: 2026, key: '2026-23' },
      { week: 24, year: 2026, key: '2026-24' },
    ]
    const byKey = { '2026-23': run(60, 10), '2026-24': run(90, 15) }
    const series = computeWeekSeries(weeks, byKey, 99, 2026)

    expect(series).toHaveLength(2)
    expect(series[0]).toMatchObject({ key: '2026-23', week: 23, year: 2026, label: 'W23' })
    expect(series[1].key).toBe('2026-24')
    expect(series[0].distance).toBeCloseTo(10, 5)
    expect(series[1].distance).toBeCloseTo(15, 5)
    expect(series[0].duration).toBeCloseTo(60, 5)
    expect(series[1].duration).toBeCloseTo(90, 5)
    expect(series[0].load).toBeGreaterThan(0)
    expect(series[1].load).toBeGreaterThan(series[0].load)
  })

  it('emits a zero-filled entry for an empty week', () => {
    const weeks = [{ week: 23, year: 2026, key: '2026-23' }]
    const series = computeWeekSeries(weeks, { '2026-23': [] }, 99, 2026)
    expect(series[0]).toMatchObject({ key: '2026-23', distance: 0, duration: 0, load: 0 })
  })

  it('attaches a dims map per week with all six qualities', () => {
    const weeks = [{ week: 23, year: 2026, key: '2026-23' }]
    const series = computeWeekSeries(weeks, { '2026-23': run(60, 10) }, 99, 2026)
    expect(Object.keys(series[0].dims).sort()).toEqual(
      ['endurance', 'muscular_endurance', 'speed', 'strength', 'threshold', 'vo2max']
    )
    // Zone-2 aerobic work feeds endurance.
    expect(series[0].dims.endurance).toBeGreaterThan(0)
  })

  it('counts planned (non-completed) sessions for a PAST week (planned-only)', () => {
    // The whole trend series is planned-only: even a genuinely-past week (today
    // is W24) counts a planned-but-skipped session — unlike buildWeekStats /
    // computeWeekSignals, which drop it.
    const skipped = [{
      activityTag: 'run', type: 'rolig', intensityZone: [2], completed: false,
      notes: '60 min', distance: '10 km',
    }]
    const weeks = [{ week: 23, year: 2026, key: '2026-23' }]
    // cursor=24, today=24 → W23 is past; planned session must still count.
    const series = computeWeekSeries(weeks, { '2026-23': skipped }, 24, 2026, 24, 2026)
    expect(series[0].duration).toBeCloseTo(60, 5)
    expect(series[0].load).toBeGreaterThan(0)
    expect(series[0].dims.endurance).toBeGreaterThan(0)
  })

  it('still emits activityDistance for the per-sport distance fan-out', () => {
    const weeks = [{ week: 23, year: 2026, key: '2026-23' }]
    const series = computeWeekSeries(weeks, { '2026-23': run(60, 10) }, 99, 2026)
    expect(series[0].activityDistance).toBeTypeOf('object')
    expect(series[0].activityDistance.run).toBeCloseTo(10, 5)
  })
})
