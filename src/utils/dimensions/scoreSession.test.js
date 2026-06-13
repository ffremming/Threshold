import { describe, it, expect } from 'vitest'
import {
  emptyDims,
  addDims,
  doseFromMinutesInZone,
  scoreSession,
  scoreSessionFallback,
} from './scoreSession'

const ZERO_DIMS = { strength: 0, endurance: 0, muscular_endurance: 0, vo2max: 0, speed: 0, threshold: 0 }

describe('dose helpers', () => {
  it('emptyDims is all zero for the six qualities', () => {
    expect(emptyDims()).toEqual(ZERO_DIMS)
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
    expect(d.vo2max).toBeCloseTo(3.5)
    expect(d.endurance).toBeCloseTo(1.0)
    expect(d.speed).toBe(0)
  })

  it('zone 1 is pure endurance', () => {
    expect(doseFromMinutesInZone(30, 1)).toMatchObject({ endurance: 30, threshold: 0, vo2max: 0 })
  })

  it('zone 2 is pure aerobic endurance — no threshold load', () => {
    const d = doseFromMinutesInZone(60, 2)
    expect(d.threshold).toBe(0)
    expect(d.vo2max).toBe(0)
    expect(d.endurance).toBeGreaterThan(0)
  })

  it('unknown zone falls back to a sane (zone 2) split — pure endurance', () => {
    const d = doseFromMinutesInZone(10, 99)
    expect(d.endurance).toBeCloseTo(10)
    expect(d.threshold).toBe(0)
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

describe("load: Edwards summated-HR-zone TRIMP (minutes × zone weight)", () => {
  // Continuous sessions are valid for Z1–Z2; Z3+ must be tagged interval (the
  // engine reuses the app's zone normalization, which clamps invalid pairs).
  const contRun = (min, zone) => ({ activityTag: 'run', type: 'continuous', intensityZone: [zone],
    blocks: { sections: [{ kind: 'steady', paceMode: 'time', durationMin: min }] } })
  const ivRun = (min, zone) => ({ activityTag: 'run', type: 'interval', intensityZone: [zone],
    blocks: { sections: [{ kind: 'interval', paceMode: 'time', reps: 1, dragSec: min * 60, pauseSec: 0 }] } })
  const load = (w) => scoreSession(w).load

  it('a pure-zone session loads minutes × the Edwards weight', () => {
    expect(load(contRun(60, 1))).toBe(60) // Z1 weight 1
    expect(load(contRun(60, 2))).toBe(120) // Z2 weight 2
    expect(load(ivRun(60, 3))).toBe(180) // Z3 weight 3
  })

  it('a Z5 minute loads exactly 5× a Z1 minute (Edwards ×1..×5)', () => {
    const z1 = load(contRun(60, 1)) / 60
    const z5 = load(ivRun(60, 5)) / 60
    expect(z5 / z1).toBeCloseTo(5, 5)
  })

  it('a multi-zone tag (Zone 1–2) averages, and structured == text-only', () => {
    const structured = { activityTag: 'run', type: 'continuous', intensityZone: [1, 2],
      blocks: { sections: [{ kind: 'steady', paceMode: 'time', durationMin: 55 }] } }
    const text = { activityTag: 'run', type: 'continuous', intensityZone: [1, 2], notes: '55 min' }
    // 55 min at the average zone 1.5 -> Edwards weight 1.5 -> ~83, NOT 55×2=110.
    expect(scoreSession(structured).load).toBe(83)
    expect(scoreSession(structured).load).toBe(scoreSession(text).load)
    // a genuine pure-Zone-2 session is still the full 55×2 = 110.
    expect(load(contRun(55, 2))).toBe(110)
  })

  it('a 40-min Z4 interval session out-loads a longer 60-min easy run', () => {
    const easy = load(contRun(60, 1)) // 60
    const intervals = load({ activityTag: 'run', type: 'interval', intensityZone: [4],
      blocks: { sections: [
        { kind: 'warmup', paceMode: 'time', durationMin: 12 },
        { kind: 'interval', paceMode: 'time', reps: 5, dragSec: 240, pauseSec: 120 },
        { kind: 'cooldown', paceMode: 'time', durationMin: 8 },
      ] } })
    expect(intervals).toBeGreaterThan(easy)
  })
})

describe('muscular endurance: long-and-hard only (short sessions score zero)', () => {
  const run = (min, zone) => ({ activityTag: 'run', type: 'continuous', intensityZone: [zone],
    blocks: { sections: [{ kind: 'steady', paceMode: 'time', durationMin: min }] } })
  // warmup (Z1) + a work block at `zone`, as separate sections.
  const wuWork = (wuMin, workMin, zone) => ({ activityTag: 'run', type: 'continuous', intensityZone: [zone],
    blocks: { sections: [
      { kind: 'warmup', paceMode: 'time', durationMin: wuMin },
      { kind: 'steady', paceMode: 'time', durationMin: workMin },
    ] } })
  const me = (w) => scoreSession(w).dims.muscular_endurance

  it('a short session contributes zero, even when intense', () => {
    expect(me(run(30, 3))).toBe(0)   // 30 min Z3 tempo: under the 75 min clock floor
    expect(me(wuWork(15, 30, 4))).toBe(0) // 45 min Z4 intervals: short -> zero
    expect(me(wuWork(20, 30, 5))).toBe(0) // 50 min Z5 hard: short -> zero
    expect(me(run(60, 2))).toBe(0)   // 60 min easy: short -> zero
  })

  it('a long easy session that does not clear the effective-minutes floor scores zero', () => {
    // 80 min Z1 = 80 effective minutes, below the 90 eff-min floor.
    expect(me(run(80, 1))).toBe(0)
  })

  it('a long-enough session contributes once both gates pass', () => {
    // 15 wu (Z1) + 60 Z3 = 75 clock min, eff = 15 + 180 = 195 -> qualifies.
    expect(me(wuWork(15, 60, 3))).toBeGreaterThan(0)
  })

  it('grows super-linearly with effective minutes: a 3 h session ≫ a 90 min session', () => {
    const at90 = me(run(90, 2))
    const at180 = me(run(180, 2))
    expect(at180).toBeGreaterThan(at90 * 3)
  })

  it('a longer session beats the same effective time split into shorter ones', () => {
    // one 3 h (qualifies) vs three 1 h easy sessions (each short -> zero).
    expect(me(run(180, 2))).toBeGreaterThan(3 * me(run(60, 2)))
  })

  it('a long threshold session ≫ a long easy session of equal clock time', () => {
    const longThreshold = me(wuWork(30, 90, 3)) // 120 min, eff 300
    const longEasy = me(run(120, 2))            // 120 min, eff 180
    expect(longThreshold).toBeGreaterThan(longEasy * 2)
  })

  it('a text-only long session also accrues muscular endurance', () => {
    expect(scoreSession({ activityTag: 'run', type: 'continuous', intensityZone: [2], notes: '180 min' })
      .dims.muscular_endurance).toBeGreaterThan(0)
  })

  it('a text-only short session scores zero', () => {
    expect(scoreSession({ activityTag: 'run', type: 'continuous', intensityZone: [4], notes: '40 min' })
      .dims.muscular_endurance).toBe(0)
  })
})

describe('speed: per-sprint, continuous (no minimum-count gate)', () => {
  const sprintSession = (reps) => ({ activityTag: 'run', type: 'continuous', intensityZone: [2],
    blocks: { sections: [{ kind: 'sprint', reps, sprintSec: 20 }] } })
  const sp = (w) => scoreSession(w).dims.speed

  it('every sprint rep adds speed — even a single sprint counts', () => {
    expect(sp(sprintSession(1))).toBeGreaterThan(0)
  })

  it('more sprints, more speed (linear in rep count)', () => {
    expect(sp(sprintSession(8))).toBeCloseTo(sp(sprintSession(4)) * 2, 1)
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
    expect(r.dims).toEqual(ZERO_DIMS)
    expect(r.load).toBe(0)
  })

  it('scoreSessionFallback is exported and usable directly', () => {
    const r = scoreSessionFallback({ activityTag: 'run', type: 'continuous', intensityZone: [1], distance: '5 km' })
    expect(r.dims.endurance).toBeGreaterThan(0)
  })
})
