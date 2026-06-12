import { describe, it, expect } from 'vitest'
import {
  emptyDims,
  addDims,
  doseFromMinutesInZone,
  scoreSession,
  scoreSessionFallback,
} from './scoreSession'

describe('dose helpers', () => {
  it('emptyDims is all zero for the five qualities', () => {
    expect(emptyDims()).toEqual({ strength: 0, endurance: 0, vo2max: 0, speed: 0, threshold: 0 })
  })

  it('addDims accumulates in place', () => {
    const a = emptyDims()
    addDims(a, { endurance: 5, threshold: 2 })
    addDims(a, { threshold: 3 })
    expect(a.endurance).toBe(5)
    expect(a.threshold).toBe(5)
  })

  it('doseFromMinutesInZone splits a Z4 minute toward threshold+vo2max', () => {
    const d = doseFromMinutesInZone(10, 4)
    expect(d.threshold).toBeCloseTo(5.5)
    expect(d.vo2max).toBeCloseTo(4.0)
    expect(d.endurance).toBeCloseTo(1.5)
    expect(d.speed).toBe(0)
  })

  it('zone 1 is pure endurance', () => {
    expect(doseFromMinutesInZone(30, 1)).toMatchObject({ endurance: 30, threshold: 0, vo2max: 0 })
  })

  it('unknown zone falls back to a sane (zone 2) split', () => {
    const d = doseFromMinutesInZone(10, 99)
    expect(d.endurance).toBeCloseTo(9)
    expect(d.threshold).toBeCloseTo(1)
  })
})

// Real section shape: warmup/cooldown use durationMin (paceMode:'time');
// interval (paceMode:'time') uses reps + dragSec per rep; intensity comes from
// the workout-level intensityZone, not the section.
describe('scoreSession (structured)', () => {
  const resolveMuscles = (id) => ({ squat: ['quadriceps', 'glutes'] }[id] || [])

  it('scores a Z4 interval run toward threshold+vo2max with a load', () => {
    const workout = {
      activityTag: 'run',
      type: 'interval',
      intensityZone: [4],
      blocks: {
        sections: [
          { kind: 'warmup', paceMode: 'time', durationMin: 12 },
          { kind: 'interval', paceMode: 'time', reps: 5, dragSec: 240, pauseSec: 120 },
          { kind: 'cooldown', paceMode: 'time', durationMin: 8 },
        ],
      },
    }
    const r = scoreSession(workout, { resolveMuscles })
    expect(r.fidelity).toBe('structured')
    expect(r.dims.vo2max).toBeGreaterThan(0)
    expect(r.dims.threshold).toBeGreaterThan(0)
    // Per Z4 minute threshold weight (0.55) > vo2max weight (0.40).
    expect(r.dims.threshold).toBeGreaterThan(r.dims.vo2max)
    // Warm-up + cooldown add endurance (zone 1).
    expect(r.dims.endurance).toBeGreaterThan(0)
    expect(r.load).toBeGreaterThan(0)
    expect(r.musclesWorked).toEqual({})
  })

  it('scores a strength session via musclesWorked', () => {
    const workout = {
      activityTag: 'strength',
      blocks: { sections: [{ kind: 'exercise', exerciseId: 'squat', sets: 5, reps: 5 }] },
    }
    const r = scoreSession(workout, { resolveMuscles })
    expect(r.dims.strength).toBeGreaterThan(0)
    expect(r.dims.endurance).toBe(0)
    expect(r.musclesWorked).toEqual({ quadriceps: 5, glutes: 5 })
    expect(r.load).toBeGreaterThan(0)
  })

  it('routes sprint reps to speed', () => {
    const workout = {
      activityTag: 'run',
      type: 'continuous',
      intensityZone: [2],
      blocks: { sections: [{ kind: 'sprint', reps: 8, sprintSec: 20 }] },
    }
    const r = scoreSession(workout, { resolveMuscles })
    expect(r.dims.speed).toBeGreaterThan(0)
    expect(r.dims.speed).toBeGreaterThan(r.dims.vo2max)
  })
})

describe('scoreSession (fallback, no blocks)', () => {
  it('scores a text-only easy run as endurance', () => {
    const r = scoreSession({ activityTag: 'run', type: 'continuous', intensityZone: [2], distance: '10 km' })
    expect(r.fidelity).toBe('estimated')
    expect(r.dims.endurance).toBeGreaterThan(0)
    expect(r.dims.vo2max).toBe(0)
    expect(r.load).toBeGreaterThan(0)
    expect(r.musclesWorked).toEqual({})
  })

  it('scores a text-only strength session via duration proxy', () => {
    const r = scoreSession({ activityTag: 'strength', type: 'continuous', notes: '45 min' })
    expect(r.dims.strength).toBeGreaterThan(0)
    expect(r.musclesWorked).toEqual({})
    expect(r.fidelity).toBe('estimated')
  })

  it('an empty/unknown session yields zero dims but does not throw', () => {
    const r = scoreSession({})
    expect(r.dims).toEqual({ strength: 0, endurance: 0, vo2max: 0, speed: 0, threshold: 0 })
    expect(r.load).toBe(0)
  })

  it('scoreSessionFallback is exported and usable directly', () => {
    const r = scoreSessionFallback({ activityTag: 'run', type: 'continuous', intensityZone: [1], distance: '5 km' })
    expect(r.dims.endurance).toBeGreaterThan(0)
  })
})
