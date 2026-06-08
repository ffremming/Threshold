// Accessors over the bundled free-exercise-db dataset.
//
// The dataset has been trimmed to mainstream strength movements (the
// strength/powerlifting categories on common gym equipment). The raw JSON is
// imported once and indexed by id for O(1) lookups. Search/filter helpers
// power the ExercisePicker UI.

import rawExercises from './exerciseLibrary.json'
import { isFavoriteExercise } from './favorites'

// GitHub CDN base for the (optional, lazy-loaded) demo images.
const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'

export const EXERCISES = rawExercises

const BY_ID = new Map(rawExercises.map(e => [e.id, e]))

export function getExercise(id) {
  return BY_ID.get(id) || null
}

// Resolve a relative image path from a dataset entry to a full CDN URL.
export function exerciseImageUrl(relativePath) {
  if (!relativePath) return null
  return IMAGE_BASE + relativePath
}

// Distinct facet values for filter UI, computed once.
function distinct(field) {
  const set = new Set()
  for (const e of rawExercises) {
    const v = e[field]
    if (v) set.add(v)
  }
  return [...set].sort()
}

export const EQUIPMENT_OPTIONS = distinct('equipment')
export const CATEGORY_OPTIONS = distinct('category')
export const LEVEL_OPTIONS = distinct('level')

// Filter + search the library.
//   query         free-text matched against the exercise name (case-insensitive)
//   equipment     exact match on the equipment field (optional)
//   category      exact match on the category field (optional)
//   muscle        single dataset muscle name; matches primary OR secondary (optional)
//   muscles       array of dataset muscle names; matches if ANY hits primary/secondary
//   favoritesOnly when true, restrict results to curated favorite staples
// `muscle` and `muscles` combine into one set (any-match). Favorites are always
// sorted to the front. Returns at most `limit` results (default 60) to keep the
// picker snappy.
export function searchExercises({ query = '', equipment = '', category = '', muscle = '', muscles = [], favoritesOnly = false, limit = 60 } = {}) {
  const q = query.trim().toLowerCase()
  const muscleSet = new Set([...(muscle ? [muscle] : []), ...muscles])
  const matched = []
  for (const e of rawExercises) {
    if (favoritesOnly && !isFavoriteExercise(e.id)) continue
    if (equipment && e.equipment !== equipment) continue
    if (category && e.category !== category) continue
    if (muscleSet.size > 0) {
      const all = [...(e.primaryMuscles || []), ...(e.secondaryMuscles || [])]
      if (!all.some(m => muscleSet.has(m))) continue
    }
    if (q && !e.name.toLowerCase().includes(q)) continue
    matched.push(e)
  }
  // Stable sort: favorites first, original dataset order preserved within each
  // group (Array.prototype.sort is stable in modern engines).
  matched.sort((a, b) => Number(isFavoriteExercise(b.id)) - Number(isFavoriteExercise(a.id)))
  return matched.slice(0, limit)
}
