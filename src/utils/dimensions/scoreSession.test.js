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

describe('muscular endurance: continuous, grows with session length (no cliff)', () => {
  const run = (min, zone) => ({ activityTag: 'run', type: 'continuous', intensityZone: [zone],
    blocks: { sections: [{ kind: 'steady', paceMode: 'time', durationMin: min }] } })
  const me = (w) => scoreSession(w).dims.muscular_endurance

  it('accrues continuously — even a short session contributes a little (no trigger)', () => {
    expect(me(run(45, 2))).toBeGreaterThan(0)
    expect(me(run(20, 2))).toBeGreaterThan(0)
  })

  it('grows super-linearly with duration: a 3 h session ≫ a 1 h session', () => {
    const at1h = me(run(60, 2))
    const at3h = me(run(180, 2))
    // quadratic in duration -> ~9x for 3x the time, far more than linear
    expect(at3h).toBeGreaterThan(at1h * 6)
  })

  it('a longer session beats the same total time split into shorter ones', () => {
    const one3h = me(run(180, 2))
    const three1h = 3 * me(run(60, 2)) // same 3 h total, split
    expect(one3h).toBeGreaterThan(three1h * 2)
  })

  it('long hard work weighs more per minute than long easy work', () => {
    const easyPerMin = me(run(180, 2)) / 180
    const hardPerMin = me(run(180, 4)) / 180
    expect(hardPerMin).toBeGreaterThan(easyPerMin)
  })

  it('a text-only long session also accrues muscular endurance', () => {
    expect(scoreSession({ activityTag: 'run', type: 'continuous', intensityZone: [2], notes: '180 min' })
      .dims.muscular_endurance).toBeGreaterThan(0)
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
