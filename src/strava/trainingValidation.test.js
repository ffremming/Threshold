import { describe, it, expect } from 'vitest'
import {
  intensityDistribution, classifyPolarization, thresholdVo2Load,
  detectSpeedWork, muscularShare, specificityShare, validateTraining,
} from './trainingValidation'

// zoneTotals: minutes in each 1-5 zone
const zoneTotals = { 1: 200, 2: 200, 3: 40, 4: 40, 5: 20 } // 500 min total

describe('intensityDistribution', () => {
  it('buckets zone minutes into easy/threshold/hard %', () => {
    const d = intensityDistribution(zoneTotals)
    expect(d.easyPct).toBe(80)        // (200+200)/500
    expect(d.thresholdPct).toBe(8)    // 40/500
    expect(d.hardPct).toBe(12)        // (40+20)/500
  })
})

describe('classifyPolarization', () => {
  it('labels an 80/20 spread as polarized', () => {
    expect(classifyPolarization({ easyPct: 80, thresholdPct: 8, hardPct: 12 })).toBe('polarized')
  })
  it('labels heavy Z3 as threshold-heavy', () => {
    expect(classifyPolarization({ easyPct: 55, thresholdPct: 35, hardPct: 10 })).toBe('threshold')
  })
  it('labels a broad-base spread as pyramidal', () => {
    expect(classifyPolarization({ easyPct: 70, thresholdPct: 20, hardPct: 10 })).toBe('pyramidal')
  })
})

describe('thresholdVo2Load', () => {
  it('sums Z4+Z5 minutes and share', () => {
    const r = thresholdVo2Load(zoneTotals)
    expect(r.minutes).toBe(60)
    expect(r.pct).toBe(12)
  })
})

describe('detectSpeedWork', () => {
  it('flags laps clearly faster than activity average', () => {
    // speeds in m/s; lap 3 is much faster than the rest
    const laps = [
      { averageSpeed: 3.0, movingTime: 600 },
      { averageSpeed: 3.1, movingTime: 600 },
      { averageSpeed: 4.5, movingTime: 120 },
      { averageSpeed: 3.0, movingTime: 600 },
    ]
    const r = detectSpeedWork(laps)
    expect(r.hasSpeedWork).toBe(true)
    expect(r.fastLaps).toBe(1)
  })
  it('returns false when laps are uniform', () => {
    const laps = [{ averageSpeed: 3.0, movingTime: 600 }, { averageSpeed: 3.05, movingTime: 600 }]
    expect(detectSpeedWork(laps).hasSpeedWork).toBe(false)
  })
})

describe('muscularShare', () => {
  it('computes strength-group load share', () => {
    const activityLoad = { run: 800, strength: 200 }
    expect(muscularShare(activityLoad)).toBe(20)
  })
})

describe('specificityShare', () => {
  it('share of total training load in the dominant discipline', () => {
    const activityLoad = { run: 700, bike: 200, strength: 100 }
    const r = specificityShare(activityLoad)
    expect(r.primary).toBe('run')
    expect(r.pct).toBe(70) // 700 / 1000 total load, rounded
  })

  it('counts non-endurance disciplines in the denominator', () => {
    // A runner who also swims and skis should not read 100%.
    const activityLoad = { run: 500, swim: 300, xc_skiing: 200 }
    const r = specificityShare(activityLoad)
    expect(r.primary).toBe('run')
    expect(r.pct).toBe(50) // 500 / 1000, not 100% of an endurance-only subset
  })

  it('returns null primary when there is no load', () => {
    expect(specificityShare({})).toEqual({ primary: null, pct: 0 })
    expect(specificityShare({ run: 0 })).toEqual({ primary: null, pct: 0 })
  })
})

describe('validateTraining', () => {
  it('produces a dimensioned report with flags', () => {
    const weekStats = {
      zones: zoneTotals,
      activityLoad: { run: 800, strength: 0 },
      workouts: [{ source: 'strava', laps: [
        { averageSpeed: 3.0, movingTime: 600 }, { averageSpeed: 4.5, movingTime: 120 },
      ] }],
    }
    const report = validateTraining(weekStats)
    expect(report.distribution.easyPct).toBe(80)
    expect(report.polarization).toBe('polarized')
    expect(report.thresholdVo2.minutes).toBe(60)
    expect(report.speedWork.hasSpeedWork).toBe(true)
    expect(report.muscular.share).toBe(0)
    expect(report.muscular.flag).toBe('none')      // no muscular work this week
    expect(report.specificity.primary).toBe('run')
    expect(Array.isArray(report.flags)).toBe(true)
  })
})
