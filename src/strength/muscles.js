// Muscle vocabulary for the strength system.
//
// The exercise dataset (free-exercise-db) tags each exercise with muscles drawn
// from a fixed vocabulary of 17 names (DATASET_MUSCLES below). The body diagram
// is rendered by `react-body-highlighter`, whose SVG regions use a *different*
// set of muscle keys (HIGHLIGHTER_MUSCLES). DATASET_TO_HIGHLIGHTER bridges the
// two so we can recolour the figure from dataset tags.
//
// Note: the highlighter library exposes both "adductor" and "abductors" region
// keys (the former is an upstream naming quirk). We map the dataset's
// "adductors" -> "adductor" and "abductors" -> "abductors" accordingly.

// The 17 distinct muscle names that appear in exerciseLibrary.json.
export const DATASET_MUSCLES = [
  'abdominals',
  'abductors',
  'adductors',
  'biceps',
  'calves',
  'chest',
  'forearms',
  'glutes',
  'hamstrings',
  'lats',
  'lower back',
  'middle back',
  'neck',
  'quadriceps',
  'shoulders',
  'traps',
  'triceps',
]

// Human-friendly labels for the dataset muscle names (English, matching the UI).
export const MUSCLE_LABELS = {
  abdominals: 'Abs',
  abductors: 'Abductors',
  adductors: 'Adductors',
  biceps: 'Biceps',
  calves: 'Calves',
  chest: 'Chest',
  forearms: 'Forearms',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  lats: 'Lats',
  'lower back': 'Lower back',
  'middle back': 'Mid back',
  neck: 'Neck',
  quadriceps: 'Quads',
  shoulders: 'Shoulders',
  traps: 'Traps',
  triceps: 'Triceps',
}

// Maps a dataset muscle name to one or more react-body-highlighter region keys.
// Some dataset muscles cover multiple SVG regions (e.g. "shoulders" lights up
// both the front and back deltoids). A few have no faithful region and fall
// back to the nearest visible area.
export const DATASET_TO_HIGHLIGHTER = {
  abdominals: ['abs'],
  abductors: ['abductors'],
  adductors: ['adductor'],
  biceps: ['biceps'],
  calves: ['calves'],
  chest: ['chest'],
  forearms: ['forearm'],
  glutes: ['gluteal'],
  hamstrings: ['hamstring'],
  lats: ['upper-back'],
  'lower back': ['lower-back'],
  'middle back': ['upper-back'],
  neck: ['neck'],
  quadriceps: ['quadriceps'],
  shoulders: ['front-deltoids', 'back-deltoids'],
  traps: ['trapezius'],
  triceps: ['triceps'],
}

// Translate a list of dataset muscle names into the set of highlighter region
// keys they cover (deduplicated).
export function toHighlighterMuscles(datasetMuscles = []) {
  const out = new Set()
  for (const m of datasetMuscles) {
    const mapped = DATASET_TO_HIGHLIGHTER[m]
    if (mapped) mapped.forEach(k => out.add(k))
  }
  return [...out]
}

export function muscleLabel(datasetMuscle) {
  return MUSCLE_LABELS[datasetMuscle] || datasetMuscle
}

// Reverse of DATASET_TO_HIGHLIGHTER: a highlighter region key -> the dataset
// muscle names that map onto it. Used when the user clicks a region on the body
// diagram and we need to translate that back into a library filter.
export const HIGHLIGHTER_TO_DATASET = (() => {
  const out = {}
  for (const [datasetMuscle, regions] of Object.entries(DATASET_TO_HIGHLIGHTER)) {
    for (const region of regions) {
      (out[region] ||= []).push(datasetMuscle)
    }
  }
  return out
})()

export function datasetMusclesForRegion(region) {
  return HIGHLIGHTER_TO_DATASET[region] || []
}

// Broad muscle-group buckets for coarse one-tap filtering. Each maps to a set
// of dataset muscle names.
export const MUSCLE_GROUPS = [
  { key: 'push', label: 'Push', muscles: ['chest', 'shoulders', 'triceps'] },
  { key: 'pull', label: 'Pull', muscles: ['lats', 'middle back', 'biceps', 'traps', 'forearms'] },
  { key: 'legs', label: 'Legs', muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'] },
  { key: 'core', label: 'Core', muscles: ['abdominals', 'lower back'] },
]
