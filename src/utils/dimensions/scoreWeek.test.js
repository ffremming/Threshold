import { describe, it, expect } from 'vitest'
import { scoreWeek, weekScore, buildupSeries } from './scoreWeek'
import { REFERENCE_DOSE } from './constants'

describe('weekScore normalization', () => {
  it('maps raw dose to 0-100 against the reference dose, clamped', () => {
    const s = weekScore({ threshold: REFERENCE_DOSE.threshold, vo2max: 0 })
    expect(s.threshold).toBe(100)
    expect(s.vo2max).toBe(0)
  })

  it('clamps above 100', () => {
    expect(weekScore({ threshold: REFERENCE_DOSE.threshold * 3 }).threshold).toBe(100)
  })

  it('half the reference dose scores ~50', () => {
    expect(weekScore({ endurance: REFERENCE_DOSE.endurance / 2 }).endurance).toBe(50)
  })
})

describe('scoreWeek', () => {
  const resolveMuscles = (id) => ({ squat: ['quadriceps', 'glutes'] }[id] || [])

  it('aggregates session doses and exposes musclesWorked + perSession + load', () => {
    const workouts = [
      { activityTag: 'run', type: 'continuous', intensityZone: [2], distance: '10 km' },
      { activityTag: 'strength', blocks: { sections: [{ kind: 'exercise', exerciseId: 'squat', sets: 5, reps: 5 }] } },
    ]
    const r = scoreWeek(workouts, { resolveMuscles })
    expect(r.dims.endurance).toBeGreaterThan(0)
    expect(r.dims.strength).toBeGreaterThan(0)
    expect(r.musclesWorked.quadriceps).toBe(5)
    expect(r.load).toBeGreaterThan(0)
    expect(r.perSession).toHaveLength(2)
    Object.values(r.dims).forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    })
  })

  it('an empty week is all zeros and has no muscle data', () => {
    const r = scoreWeek([], {})
    expect(r.dims).toEqual({ strength: 0, endurance: 0, vo2max: 0, speed: 0, threshold: 0 })
    expect(Object.keys(r.musclesWorked)).toHaveLength(0)
  })
})

// Calibration: realistic weeks should land in sensible ranges.
describe('calibration: realistic weeks land in sensible ranges', () => {
  const easy = (min, zone) => ({ activityTag: 'run', type: 'continuous', intensityZone: [zone], notes: `${min} min` })
  const thresholdSession = (reps, dragSec) => ({
    activityTag: 'run',
    type: 'interval',
    intensityZone: [3],
    blocks: {
      sections: [
        { kind: 'warmup', paceMode: 'time', durationMin: 12 },
        { kind: 'interval', paceMode: 'time', reps, dragSec, pauseSec: 60 },
        { kind: 'cooldown', paceMode: 'time', durationMin: 8 },
      ],
    },
  })

  it('a hard threshold week scores threshold ~75-95', () => {
    const week = [
      thresholdSession(5, 360), // 5 x 6 min
      thresholdSession(4, 480), // 4 x 8 min
      { ...thresholdSession(6, 300), intensityZone: [4] }, // 6 x 5 min @ Z4
      easy(70, 1),
      easy(60, 2),
    ]
    const r = scoreWeek(week, {})
    expect(r.dims.threshold).toBeGreaterThanOrEqual(75)
    expect(r.dims.threshold).toBeLessThanOrEqual(95)
  })

  it('an easy recovery week scores every quality below 45', () => {
    const r = scoreWeek([easy(40, 1), easy(35, 1)], {})
    Object.values(r.dims).forEach(v => expect(v).toBeLessThan(45))
  })
})

describe('buildupSeries', () => {
  it('crests during a block then fades when stimulus stops', () => {
    const stim = [
      { threshold: 30 }, { threshold: 50 }, { threshold: 70 }, { threshold: 85 }, { threshold: 90 }, { threshold: 90 },
      { threshold: 0 }, { threshold: 0 }, { threshold: 0 },
    ]
    const out = buildupSeries(stim)
    const peak = Math.max(...out.map(w => w.threshold))
    expect(out[5].threshold).toBeCloseTo(peak, 0)
    expect(out[8].threshold).toBeLessThan(out[5].threshold)
  })

  it('speed fades faster than endurance after stopping (tau ordering)', () => {
    const stim = [
      { speed: 80, endurance: 80 }, { speed: 80, endurance: 80 }, { speed: 80, endurance: 80 },
      { speed: 0, endurance: 0 }, { speed: 0, endurance: 0 }, { speed: 0, endurance: 0 },
    ]
    const out = buildupSeries(stim)
    expect(out[5].speed).toBeLessThan(out[5].endurance)
  })

  it('steady-state approaches the input level', () => {
    const stim = Array.from({ length: 30 }, () => ({ endurance: 60 }))
    const out = buildupSeries(stim)
    expect(out[29].endurance).toBeGreaterThan(55)
    expect(out[29].endurance).toBeLessThanOrEqual(60.5)
  })

  it('handles an empty series', () => {
    expect(buildupSeries([])).toEqual([])
  })
})
