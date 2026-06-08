import { describe, it, expect } from 'vitest'
import { searchExercises, getExercise } from './library'

describe('searchExercises muscle filtering', () => {
  it('filters by a single muscle (primary or secondary)', () => {
    const results = searchExercises({ muscle: 'biceps', limit: 500 })
    expect(results.length).toBeGreaterThan(0)
    for (const e of results) {
      const all = [...(e.primaryMuscles || []), ...(e.secondaryMuscles || [])]
      expect(all).toContain('biceps')
    }
  })

  it('filters by any of several muscles (OR semantics)', () => {
    const set = ['chest', 'shoulders', 'triceps']
    const results = searchExercises({ muscles: set, limit: 500 })
    expect(results.length).toBeGreaterThan(0)
    for (const e of results) {
      const all = [...(e.primaryMuscles || []), ...(e.secondaryMuscles || [])]
      expect(all.some(m => set.includes(m))).toBe(true)
    }
  })

  it('combines a text query with a muscle filter', () => {
    const results = searchExercises({ query: 'press', muscles: ['chest'], limit: 500 })
    for (const e of results) {
      expect(e.name.toLowerCase()).toContain('press')
      const all = [...(e.primaryMuscles || []), ...(e.secondaryMuscles || [])]
      expect(all).toContain('chest')
    }
  })

  it('respects the result limit', () => {
    expect(searchExercises({ limit: 5 }).length).toBe(5)
  })

  it('returns nothing for an impossible muscle filter', () => {
    expect(searchExercises({ muscles: ['not-a-muscle'], limit: 500 })).toHaveLength(0)
  })

  it('getExercise resolves a known id and null otherwise', () => {
    expect(getExercise('Barbell_Squat')?.name).toBe('Barbell Squat')
    expect(getExercise('nope')).toBeNull()
  })
})
