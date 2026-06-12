// Strength scoring — saturation model.
//
// Strength is not zone-based. It is scored from sets-per-muscle with strong
// diminishing returns, combined across muscles with a saturating coverage
// factor so a full week does not require hitting all 17 muscle groups.

import { getSections } from '../../sessionBlocks'
import { STRENGTH_K, COVERAGE_K } from './constants'

// Per-muscle weekly set saturation. Fitted to 3 sets->~50, 6->~80, 9->~90.
export function muscleScore(sets) {
  if (!sets || sets <= 0) return 0
  return 100 * (1 - Math.exp(-STRENGTH_K * sets))
}

// Diminishing returns on the *number* of muscle groups worked.
export function coverageFactor(nMuscles) {
  if (!nMuscles || nMuscles <= 0) return 0
  return nMuscles / (nMuscles + COVERAGE_K)
}

// musclesWorked: { [muscle]: totalSets }. Returns a 0–100-ish strength dose.
export function strengthDose(musclesWorked) {
  const muscles = Object.keys(musclesWorked || {})
  if (muscles.length === 0) return 0
  const perMuscle = muscles.map(m => muscleScore(musclesWorked[m]))
  const mean = perMuscle.reduce((a, b) => a + b, 0) / perMuscle.length
  return mean * coverageFactor(muscles.length)
}

// Sum sets per muscle across a session's structured exercise sections.
// resolveMuscles(exerciseId) -> array of dataset muscle names (see src/strength/muscles.js).
export function musclesWorkedFromSession(workout, resolveMuscles) {
  const out = {}
  if (typeof resolveMuscles !== 'function') return out
  const sections = getSections(workout?.blocks, workout?.activityTag) || []
  for (const s of sections) {
    if (s.kind !== 'exercise') continue
    const sets = Number(s.sets) || 0
    if (sets <= 0) continue
    for (const muscle of resolveMuscles(s.exerciseId) || []) {
      if (!muscle) continue
      out[muscle] = (out[muscle] || 0) + sets
    }
  }
  return out
}
