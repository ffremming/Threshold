import { describe, it, expect } from 'vitest'
import {
  weekTargetKey, normalizeDistribution, emptyWeekTarget, DEFAULT_PLAN_SETTINGS,
} from './weekTargetTypes'

describe('weekTargetKey', () => {
  it('zero-pads the week to a stable year-week key', () => {
    expect(weekTargetKey(3, 2026)).toBe('2026-03')
    expect(weekTargetKey(40, 2026)).toBe('2026-40')
  })
})

describe('normalizeDistribution', () => {
  it('returns {} for null/empty', () => {
    expect(normalizeDistribution(null)).toEqual({})
    expect(normalizeDistribution({})).toEqual({})
  })
  it('scales shares to sum to 100, dropping non-positive', () => {
    const out = normalizeDistribution({ run: 30, bike: 10, swim: 0 })
    expect(out.run).toBeCloseTo(75)
    expect(out.bike).toBeCloseTo(25)
    expect(out.swim).toBeUndefined()
  })
  it('passes through an already-100 split unchanged', () => {
    expect(normalizeDistribution({ run: 50, bike: 50 })).toEqual({ run: 50, bike: 50 })
  })
})

describe('emptyWeekTarget', () => {
  it('builds a base target keyed by week/year with empty fields', () => {
    const t = emptyWeekTarget(5, 2026, 'id-1')
    expect(t).toMatchObject({
      id: 'id-1', week: 5, year: 2026, base: false,
      distanceKm: null, durationMin: null, distribution: null,
      qualities: [], dayTags: {}, deload: false,
    })
  })
})

describe('DEFAULT_PLAN_SETTINGS', () => {
  it('has sane ramp/deload defaults', () => {
    expect(DEFAULT_PLAN_SETTINGS).toMatchObject({
      rampPct: 5, deloadEveryN: 0, deloadPct: 60, taperPct: 40, taperWeeks: 2,
    })
  })
})
