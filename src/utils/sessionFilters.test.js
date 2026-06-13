import { describe, it, expect } from 'vitest'
import {
  EMPTY_CRITERIA,
  isCriteriaActive,
  matchesSessionSearch,
  applyFilters,
} from './sessionFilters'

const RUN_EASY = {
  id: 'a', title: 'Rolig langtur', description: 'Easy aerobic base',
  activityTag: 'run', type: 'continuous', intensityZone: [1, 2], category: 'Easy',
  title2: '', notes: '90 min rolig', // notes carry duration text
}
const RUN_THRESHOLD = {
  id: 'b', title: '4x8 min terskel', description: 'Threshold reps',
  activityTag: 'run', type: 'interval', intensityZone: 3, category: 'Hard',
  notes: '50 min',
}
const BIKE_VO2 = {
  id: 'c', title: 'VO2 bike', description: 'Hard intervals',
  activityTag: 'bike', type: 'interval', intensityZone: 5, category: 'Hard',
  notes: '40 min',
}
const STRENGTH = {
  id: 'd', title: 'Full body styrke', description: 'Squats and pulls',
  activityTag: 'strength', type: 'continuous', category: 'Hard', notes: '45 min',
}
const ALL = [RUN_EASY, RUN_THRESHOLD, BIKE_VO2, STRENGTH]
const ids = list => list.map(s => s.id)

describe('EMPTY_CRITERIA / isCriteriaActive', () => {
  it('empty criteria is inactive and returns everything', () => {
    expect(isCriteriaActive(EMPTY_CRITERIA)).toBe(false)
    expect(applyFilters(ALL, EMPTY_CRITERIA)).toEqual(ALL)
  })

  it('any populated field makes criteria active', () => {
    expect(isCriteriaActive({ ...EMPTY_CRITERIA, search: 'x' })).toBe(true)
    expect(isCriteriaActive({ ...EMPTY_CRITERIA, activities: ['run'] })).toBe(true)
    expect(isCriteriaActive({ ...EMPTY_CRITERIA, zones: [3] })).toBe(true)
    expect(isCriteriaActive({ ...EMPTY_CRITERIA, types: ['interval'] })).toBe(true)
    expect(isCriteriaActive({ ...EMPTY_CRITERIA, categories: ['vo2max'] })).toBe(true)
    expect(isCriteriaActive({ ...EMPTY_CRITERIA, duration: { min: 30, max: null } })).toBe(true)
    expect(isCriteriaActive({ ...EMPTY_CRITERIA, templateCategory: 'Easy' })).toBe(true)
  })
})

describe('matchesSessionSearch', () => {
  it('matches title, description, activity label, and is case-insensitive', () => {
    expect(matchesSessionSearch(RUN_THRESHOLD, 'terskel')).toBe(true)
    expect(matchesSessionSearch(RUN_THRESHOLD, 'THRESHOLD reps')).toBe(true)
    expect(matchesSessionSearch(BIKE_VO2, 'bike')).toBe(true) // activity label/tag
    expect(matchesSessionSearch(RUN_EASY, 'nomatch')).toBe(false)
  })

  it('an empty term matches everything', () => {
    expect(matchesSessionSearch(RUN_EASY, '')).toBe(true)
  })
})

describe('applyFilters — individual predicates', () => {
  it('search', () => {
    expect(ids(applyFilters(ALL, { ...EMPTY_CRITERIA, search: 'styrke' }))).toEqual(['d'])
  })

  it('activities (multi, OR)', () => {
    expect(ids(applyFilters(ALL, { ...EMPTY_CRITERIA, activities: ['run', 'bike'] })))
      .toEqual(['a', 'b', 'c'])
  })

  it('zones (intersection)', () => {
    // zone 3 → only the threshold session
    expect(ids(applyFilters(ALL, { ...EMPTY_CRITERIA, zones: [3] }))).toEqual(['b'])
    // zones 1 or 5 → easy + vo2
    expect(ids(applyFilters(ALL, { ...EMPTY_CRITERIA, zones: [1, 5] }))).toEqual(['a', 'c'])
  })

  it('types (migrated)', () => {
    expect(ids(applyFilters(ALL, { ...EMPTY_CRITERIA, types: ['interval'] }))).toEqual(['b', 'c'])
    expect(ids(applyFilters(ALL, { ...EMPTY_CRITERIA, types: ['continuous'] }))).toEqual(['a', 'd'])
  })

  it('training categories', () => {
    expect(ids(applyFilters(ALL, { ...EMPTY_CRITERIA, categories: ['vo2max'] }))).toContain('c')
    expect(ids(applyFilters(ALL, { ...EMPTY_CRITERIA, categories: ['strength'] }))).toEqual(['d'])
    expect(ids(applyFilters(ALL, { ...EMPTY_CRITERIA, categories: ['endurance'] }))).toContain('a')
  })

  it('duration bounds (inclusive)', () => {
    // RUN_EASY 90, RUN_THRESHOLD 50, BIKE_VO2 40, STRENGTH 45
    expect(ids(applyFilters(ALL, { ...EMPTY_CRITERIA, duration: { min: 60, max: null } }))).toEqual(['a'])
    expect(ids(applyFilters(ALL, { ...EMPTY_CRITERIA, duration: { min: null, max: 45 } }))).toEqual(['c', 'd'])
    expect(ids(applyFilters(ALL, { ...EMPTY_CRITERIA, duration: { min: 45, max: 50 } }))).toEqual(['b', 'd'])
  })

  it('templateCategory', () => {
    expect(ids(applyFilters(ALL, { ...EMPTY_CRITERIA, templateCategory: 'Easy' }))).toEqual(['a'])
    expect(ids(applyFilters(ALL, { ...EMPTY_CRITERIA, templateCategory: 'All' }))).toEqual(ids(ALL))
  })
})

describe('applyFilters — combined (AND across fields)', () => {
  it('run AND interval AND zone 3', () => {
    const out = applyFilters(ALL, {
      ...EMPTY_CRITERIA, activities: ['run'], types: ['interval'], zones: [3],
    })
    expect(ids(out)).toEqual(['b'])
  })

  it('returns empty when no item satisfies every active field', () => {
    const out = applyFilters(ALL, { ...EMPTY_CRITERIA, activities: ['swim'], zones: [3] })
    expect(out).toEqual([])
  })
})

describe('applyFilters — enabled gating', () => {
  it('only runs predicates whose key is enabled', () => {
    // search is set but not enabled → ignored; activities enabled → applied
    const out = applyFilters(
      ALL,
      { ...EMPTY_CRITERIA, search: 'zzz', activities: ['run'] },
      { enabled: ['activities'] },
    )
    expect(ids(out)).toEqual(['a', 'b'])
  })
})
