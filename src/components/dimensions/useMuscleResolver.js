// Bridge between the dimensions engine and the strength exercise library.
//
// The engine's scoreSession/scoreWeek accept a `resolveMuscles(exerciseId)`
// callback so they stay pure and testable. This adapter backs that callback
// with the real exercise library (primary + secondary muscles).

import { getExercise } from '../../strength/library'

// Returns a stable resolver function: exerciseId -> dataset muscle names.
export function makeMuscleResolver() {
  return (exerciseId) => {
    const ex = getExercise(exerciseId)
    if (!ex) return []
    return [...(ex.primaryMuscles || []), ...(ex.secondaryMuscles || [])]
  }
}
