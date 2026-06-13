import { describe, it, expect } from 'vitest'
import {
  sessionCategories,
  sessionPrimaryCategory,
  TRAINING_CATEGORIES,
  CATEGORY_LABELS,
} from './sessionCategory'

// Text-only sessions are enough: scoreSession's fallback derives dims from the
// estimated duration (here from distance) + intensity zones, so these fixtures
// score deterministically without structured blocks.
const easyZ2 = { activityTag: 'run', type: 'continuous', intensityZone: [1, 2], title: '60 min rolig' }
const thresholdZ3 = { activityTag: 'run', type: 'interval', intensityZone: 3, title: '40 min terskel' }
const vo2Z5 = { activityTag: 'run', type: 'interval', intensityZone: 5, title: '30 min vo2' }
const strength = { activityTag: 'strength', type: 'continuous', title: '45 min styrke' }
// A long easy ride: the muscular_endurance raw dose is quadratic in duration and
// dwarfs the raw endurance dose, but on each quality's own reference scale this
// is an endurance session that also trains musc. endurance — NOT a ME session.
const longEasyRide = { activityTag: 'bike', type: 'continuous', intensityZone: 2, title: '120 min' }

describe('TRAINING_CATEGORIES', () => {
  it('exposes the six training qualities with labels', () => {
    expect(TRAINING_CATEGORIES).toContain('threshold')
    expect(TRAINING_CATEGORIES).toContain('vo2max')
    expect(TRAINING_CATEGORIES).toContain('speed')
    expect(TRAINING_CATEGORIES).toContain('endurance')
    expect(TRAINING_CATEGORIES).toContain('strength')
    expect(TRAINING_CATEGORIES).toContain('muscular_endurance')
    expect(CATEGORY_LABELS.vo2max).toBe('VO2max')
  })
})

describe('sessionPrimaryCategory', () => {
  it('an easy Z1-2 session is endurance', () => {
    expect(sessionPrimaryCategory(easyZ2)).toBe('endurance')
  })

  it('a Z3 session is threshold', () => {
    expect(sessionPrimaryCategory(thresholdZ3)).toBe('threshold')
  })

  it('a Z5 interval is vo2max', () => {
    expect(sessionPrimaryCategory(vo2Z5)).toBe('vo2max')
  })

  it('a strength session is strength', () => {
    expect(sessionPrimaryCategory(strength)).toBe('strength')
  })

  it('a moderately long easy session stays endurance-primary', () => {
    // Regression: raw-dose comparison made every >70min session read as ME.
    // On the reference scale a 90min easy ride is still endurance-led.
    const ride90 = { activityTag: 'bike', type: 'continuous', intensityZone: 2, title: '90 min' }
    expect(sessionPrimaryCategory(ride90)).toBe('endurance')
  })

  it('returns null when a session has no measurable dose', () => {
    expect(sessionPrimaryCategory({ activityTag: 'run' })).toBeNull()
  })
})

describe('sessionCategories (multi)', () => {
  it('a Z3 session includes threshold', () => {
    expect(sessionCategories(thresholdZ3)).toContain('threshold')
  })

  it('a Z5 interval includes vo2max', () => {
    expect(sessionCategories(vo2Z5)).toContain('vo2max')
  })

  it('only returns qualities with a meaningful share of the dose', () => {
    // An easy session trains endurance overwhelmingly; it must NOT be tagged vo2max.
    const cats = sessionCategories(easyZ2)
    expect(cats).toContain('endurance')
    expect(cats).not.toContain('vo2max')
    expect(cats).not.toContain('speed')
  })

  it('returns an empty array for a session with no dose', () => {
    expect(sessionCategories({ activityTag: 'run' })).toEqual([])
  })

  it('a long easy ride matches BOTH endurance and musc. endurance filters', () => {
    const cats = sessionCategories(longEasyRide)
    expect(cats).toContain('endurance')
    expect(cats).toContain('muscular_endurance')
    expect(cats).not.toContain('vo2max')
  })

  it('accepts an injected resolveMuscles via opts without throwing', () => {
    const cats = sessionCategories(strength, { resolveMuscles: () => [] })
    expect(Array.isArray(cats)).toBe(true)
  })
})
