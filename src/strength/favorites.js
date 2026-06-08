// Curated set of the most common strength staples — the lifts most programs
// are built around. The picker surfaces these first (and offers a "Favorites"
// filter) so the useful movements lead, while the full library stays
// searchable behind them.
//
// Ids reference entries in exerciseLibrary.json. isFavoriteExercise is the
// single source of truth used by the library/search layer.

export const FAVORITE_EXERCISE_IDS = [
  // Squat pattern
  'Barbell_Squat',
  'Front_Barbell_Squat',
  'Goblet_Squat',
  'Leg_Press',
  // Hinge pattern
  'Barbell_Deadlift',
  'Romanian_Deadlift',
  'Sumo_Deadlift',
  'Barbell_Hip_Thrust',
  // Horizontal push
  'Barbell_Bench_Press_-_Medium_Grip',
  'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'Close-Grip_Barbell_Bench_Press',
  'Dumbbell_Bench_Press',
  'Incline_Dumbbell_Press',
  'Pushups',
  // Vertical push
  'Barbell_Shoulder_Press',
  'Standing_Military_Press',
  'Dumbbell_Shoulder_Press',
  'Arnold_Dumbbell_Press',
  // Horizontal pull
  'Bent_Over_Barbell_Row',
  'Bent_Over_Two-Dumbbell_Row',
  'Seated_Cable_Rows',
  // Vertical pull
  'Wide-Grip_Lat_Pulldown',
  'Pullups',
  'Chin-Up',
  // Arms
  'Barbell_Curl',
  'Dumbbell_Bicep_Curl',
  'Hammer_Curls',
  'Triceps_Pushdown',
  'Dips_-_Triceps_Version',
  // Legs (accessory)
  'Barbell_Lunge',
  'Dumbbell_Lunges',
  'Leg_Extensions',
  'Lying_Leg_Curls',
  'Seated_Leg_Curl',
  'Standing_Calf_Raises',
  // Shoulders / upper back
  'Face_Pull',
  'Barbell_Shrug',
  // Core
  'Plank',
  'Cable_Crunch',
  'Hanging_Leg_Raise',
]

const FAVORITE_SET = new Set(FAVORITE_EXERCISE_IDS)

export function isFavoriteExercise(id) {
  return FAVORITE_SET.has(id)
}
