import { describe, it, expect } from 'vitest'
import { deriveWeekTargets } from './planRamp'
import { weekTargetKey } from './weekTargetTypes'

// Helper: chronological weeks 1..n in 2026.
const weeks = n => Array.from({ length: n }, (_, i) => ({ week: i + 1, year: 2026 }))
const base = (week, distanceKm, durationMin) => ({
  id: `w${week}`, week, year: 2026, base: true, distanceKm, durationMin,
  distribution: null, qualities: [], dayTags: {}, deload: false,
})
const get = (map, week) => map.get(weekTargetKey(week, 2026))

describe('deriveWeekTargets', () => {
  it('with no planSettings, only typed weeks get targets', () => {
    const map = deriveWeekTargets(weeks(3), {
      weekTargets: [base(1, 10, 60)], planSettings: null, bands: [], goals: [],
    })
    expect(get(map, 1)).toMatchObject({ distanceKm: 10, durationMin: 60, source: 'typed' })
    expect(get(map, 2)).toBeUndefined()
  })

  it('ramps following weeks from the base by rampPct', () => {
    const map = deriveWeekTargets(weeks(3), {
      weekTargets: [base(1, 100, 600)],
      planSettings: { rampPct: 10, deloadEveryN: 0, deloadPct: 60, taperPct: 40, taperWeeks: 2 },
      bands: [], goals: [],
    })
    expect(get(map, 1)).toMatchObject({ distanceKm: 100, source: 'typed' })
    expect(get(map, 2).source).toBe('ramped')
    expect(get(map, 2).distanceKm).toBeCloseTo(110)
    expect(get(map, 3).distanceKm).toBeCloseTo(121)
  })

  it('a typed override mid-ramp wins and reseeds the ramp', () => {
    const map = deriveWeekTargets(weeks(4), {
      weekTargets: [base(1, 100, 600), { ...base(3, 200, 1200) }],
      planSettings: { rampPct: 10, deloadEveryN: 0, deloadPct: 60, taperPct: 40, taperWeeks: 2 },
      bands: [], goals: [],
    })
    expect(get(map, 2).distanceKm).toBeCloseTo(110)   // ramped from 100
    expect(get(map, 3)).toMatchObject({ distanceKm: 200, source: 'typed' })
    expect(get(map, 4).distanceKm).toBeCloseTo(220)   // ramps from the override
  })

  it('cadence deload reduces every Nth week and the build resumes after', () => {
    const map = deriveWeekTargets(weeks(5), {
      weekTargets: [base(1, 100, 600)],
      planSettings: { rampPct: 10, deloadEveryN: 4, deloadPct: 50, taperPct: 40, taperWeeks: 2 },
      bands: [], goals: [],
    })
    // weeks 1..3 ramp; week 4 (index 4 % 4 === 0) deloads to 50% of its ramped value
    const ramped4 = 100 * 1.1 ** 3            // ≈ 133.1
    expect(get(map, 4)).toMatchObject({ source: 'deload' })
    expect(get(map, 4).distanceKm).toBeCloseTo(ramped4 * 0.5)
    // week 5 resumes from the pre-deload ramped value, not the reduced one
    expect(get(map, 5).distanceKm).toBeCloseTo(100 * 1.1 ** 4)
  })

  it('manual deload flag reduces that week', () => {
    const map = deriveWeekTargets(weeks(2), {
      weekTargets: [base(1, 100, 600), { ...base(2, null, null), base: false, deload: true }],
      planSettings: { rampPct: 10, deloadEveryN: 0, deloadPct: 60, taperPct: 40, taperWeeks: 2 },
      bands: [], goals: [],
    })
    expect(get(map, 2)).toMatchObject({ source: 'deload' })
    expect(get(map, 2).distanceKm).toBeCloseTo(110 * 0.6)
  })

  it('tapers the weeks before a priority-A goal, stepping down to taperPct', () => {
    // A-race in week 4 (Mon 2026-01-18..Sun 01-24). taperWeeks=2 → weeks 3 and 4 taper, week 4 lowest.
    const map = deriveWeekTargets(weeks(4), {
      weekTargets: [base(1, 100, 600)],
      planSettings: { rampPct: 0, deloadEveryN: 0, deloadPct: 60, taperPct: 40, taperWeeks: 2 },
      bands: [],
      goals: [{ id: 'g', date: '2026-01-22', priority: 'A' }],
    })
    expect(get(map, 3)).toMatchObject({ source: 'taper' })
    expect(get(map, 4)).toMatchObject({ source: 'taper' })
    // final taper week is the lowest (== taperPct of ramped 100)
    expect(get(map, 4).distanceKm).toBeCloseTo(40)
    expect(get(map, 3).distanceKm).toBeGreaterThan(get(map, 4).distanceKm)
  })

  it('reduction band (recovery/taper) overlapping a week deloads it', () => {
    // Band covering week 2 (Mon 2026-01-11..Sun 01-17 local). Use ms epoch bounds.
    const bandStart = new Date('2026-01-11T00:00:00').getTime()
    const bandEnd = new Date('2026-01-17T23:59:59').getTime()
    const map = deriveWeekTargets(weeks(2), {
      weekTargets: [base(1, 100, 600)],
      planSettings: { rampPct: 10, deloadEveryN: 0, deloadPct: 60, taperPct: 40, taperWeeks: 2 },
      bands: [{ id: 'b', type: 'recovery', startDate: bandStart, endDate: bandEnd }],
      goals: [],
    })
    expect(get(map, 2)).toMatchObject({ source: 'deload' })
    expect(get(map, 2).distanceKm).toBeCloseTo(110 * 0.6)
  })
})
