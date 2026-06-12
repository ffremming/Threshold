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
    expect(r.dims).toEqual({ strength: 0, endurance: 0, muscular_endurance: 0, vo2max: 0, speed: 0, threshold: 0 })
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

  // Pure Zone-3 interval work, no warm-up/cooldown, so total Z3 minutes are exact.
  const z3Only = (reps, dragSec) => ({
    activityTag: 'run', type: 'interval', intensityZone: [3],
    blocks: { sections: [{ kind: 'interval', paceMode: 'time', reps, dragSec, pauseSec: 60 }] },
  })

  it('threshold anchor: ~240 min of Zone 3 work scores ~100', () => {
    // 4 sessions x 60 min Z3 = 240 min
    const week = [z3Only(6, 600), z3Only(6, 600), z3Only(6, 600), z3Only(6, 600)]
    expect(scoreWeek(week, {}).dims.threshold).toBe(100)
  })

  it('threshold is no longer too easy: ~120 min of Zone 3 lands ~50, not maxed', () => {
    const week = [z3Only(6, 600), z3Only(6, 600)] // 120 min Z3
    const t = scoreWeek(week, {}).dims.threshold
    expect(t).toBeGreaterThanOrEqual(40)
    expect(t).toBeLessThanOrEqual(60)
  })

  it('endurance is no longer too easy: a 4h easy week stays well under 60', () => {
    const r = scoreWeek([easy(120, 1), easy(120, 1)], {}) // 240 min Z1
    expect(r.dims.endurance).toBeLessThan(60)
  })

  it('endurance anchor: ~900 min (15 h) of Zone 1/2 reaches ~100', () => {
    const week = [easy(180, 1), easy(180, 1), easy(180, 1), easy(180, 1), easy(180, 2)]
    expect(scoreWeek(week, {}).dims.endurance).toBe(100)
  })

  it('muscular endurance is hard to max: one 3 h run is well under 100', () => {
    const r = scoreWeek([easy(180, 2)], {})
    expect(r.dims.muscular_endurance).toBeGreaterThan(0)
    expect(r.dims.muscular_endurance).toBeLessThan(40)
  })

  it('muscular endurance anchor: 3 long runs + 2 long threshold sessions ≈ 100', () => {
    const longRun = easy(180, 2) // 3 h
    const longThreshold = {
      activityTag: 'run', type: 'interval', intensityZone: [3],
      blocks: { sections: [{ kind: 'interval', paceMode: 'time', reps: 7, dragSec: 600, pauseSec: 60 }] }, // 70 min Z3
    }
    const week = [longRun, longRun, longRun, longThreshold, longThreshold]
    const me = scoreWeek(week, {}).dims.muscular_endurance
    expect(me).toBeGreaterThanOrEqual(90)
    expect(me).toBeLessThanOrEqual(100)
  })

  it('an easy recovery week scores intensity qualities low', () => {
    const r = scoreWeek([easy(40, 1), easy(35, 1)], {})
    expect(r.dims.threshold).toBeLessThan(20)
    expect(r.dims.vo2max).toBeLessThan(20)
    expect(r.dims.muscular_endurance).toBe(0) // sessions are short
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
