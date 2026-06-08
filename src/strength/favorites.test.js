import { describe, it, expect } from 'vitest'
import { FAVORITE_EXERCISE_IDS, isFavoriteExercise } from './favorites'
import { getExercise, searchExercises, EXERCISES } from './library'

describe('favorites', () => {
  it('every favorite id resolves to a real (kept) exercise', () => {
    for (const id of FAVORITE_EXERCISE_IDS) {
      expect(getExercise(id), `favorite "${id}" missing from library`).toBeTruthy()
    }
  })

  it('isFavoriteExercise reflects membership', () => {
    expect(isFavoriteExercise('Barbell_Squat')).toBe(true)
    expect(isFavoriteExercise('definitely-not-a-favorite')).toBe(false)
  })

  it('has no duplicate ids', () => {
    expect(new Set(FAVORITE_EXERCISE_IDS).size).toBe(FAVORITE_EXERCISE_IDS.length)
  })
})

describe('searchExercises favorites behaviour', () => {
  it('favoritesOnly returns only favorites', () => {
    const results = searchExercises({ favoritesOnly: true, limit: 500 })
    expect(results.length).toBe(FAVORITE_EXERCISE_IDS.length)
    expect(results.every(e => isFavoriteExercise(e.id))).toBe(true)
  })

  it('sorts favorites to the front when not restricted', () => {
    const results = searchExercises({ favoritesOnly: false, limit: 500 })
    const firstNonFav = results.findIndex(e => !isFavoriteExercise(e.id))
    const lastFav = results.map(e => isFavoriteExercise(e.id)).lastIndexOf(true)
    // No favorite appears after the first non-favorite.
    expect(lastFav).toBeLessThan(firstNonFav)
  })
})

describe('trimmed dataset', () => {
  it('contains only mainstream strength categories', () => {
    const cats = new Set(EXERCISES.map(e => e.category))
    expect([...cats].sort()).toEqual(['powerlifting', 'strength'])
  })

  it('dropped the bulk of the original 873-entry dataset', () => {
    expect(EXERCISES.length).toBeLessThan(700)
    expect(EXERCISES.length).toBeGreaterThan(300)
  })
})
