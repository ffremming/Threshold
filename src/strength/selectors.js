// Derive muscle-load data for the body heatmap from a session's sections.
//
// Each strength "exercise" section references a library entry via `exerciseId`.
// We weight every working set: a primary muscle gets the full set count, a
// secondary muscle gets half. Summing across all exercises yields a weighted
// "volume" per dataset muscle, which we then bucket into integer intensity
// tiers for react-body-highlighter (its `highlightedColors` are indexed by
// `frequency - 1`, so frequency must be a small positive integer).

import { getExercise } from './library'
import { DATASET_TO_HIGHLIGHTER } from './muscles'

const PRIMARY_WEIGHT = 1
const SECONDARY_WEIGHT = 0.5

// Number of colour tiers the heatmap distinguishes. Must match the length of
// the `highlightedColors` array passed to the Model component.
export const INTENSITY_TIERS = 4

// Sum weighted working sets per dataset muscle across all exercise sections.
// Returns a plain object { datasetMuscle: weightedSets }.
export function aggregateMuscleLoad(sections = []) {
  const load = {}
  const add = (muscle, amount) => {
    if (!muscle || amount <= 0) return
    load[muscle] = (load[muscle] || 0) + amount
  }

  for (const section of sections) {
    if (!section || section.kind !== 'exercise' || !section.exerciseId) continue
    const exercise = getExercise(section.exerciseId)
    if (!exercise) continue
    const sets = Math.max(0, Number(section.sets) || 0)
    if (sets === 0) continue
    for (const m of exercise.primaryMuscles || []) add(m, sets * PRIMARY_WEIGHT)
    for (const m of exercise.secondaryMuscles || []) add(m, sets * SECONDARY_WEIGHT)
  }

  return load
}

// Convert a weighted-load map into a linear intensity tier (1..INTENSITY_TIERS)
// for each muscle, scaled relative to the busiest muscle in the session so the
// heatmap always uses its full colour range.
function loadToTiers(load) {
  const max = Math.max(0, ...Object.values(load))
  if (max <= 0) return {}
  const tiers = {}
  for (const [muscle, amount] of Object.entries(load)) {
    // Map (0, max] onto 1..INTENSITY_TIERS.
    const tier = Math.min(INTENSITY_TIERS, Math.max(1, Math.ceil((amount / max) * INTENSITY_TIERS)))
    tiers[muscle] = tier
  }
  return tiers
}

// Build the `data` array for react-body-highlighter from a session's sections.
// One entry per highlighter region key, carrying its intensity tier as
// `frequency`. Pass the result straight to <Model data={...} />.
export function buildHighlighterData(sections = []) {
  const tiers = loadToTiers(aggregateMuscleLoad(sections))
  const byRegion = {}
  for (const [datasetMuscle, tier] of Object.entries(tiers)) {
    for (const region of DATASET_TO_HIGHLIGHTER[datasetMuscle] || []) {
      // If two dataset muscles map to the same region, keep the strongest tier.
      byRegion[region] = Math.max(byRegion[region] || 0, tier)
    }
  }
  return Object.entries(byRegion).map(([region, frequency]) => ({
    name: region,
    muscles: [region],
    frequency,
  }))
}

// Convenience: highlighter data for a single exercise at a nominal intensity,
// used by the picker preview. Primary muscles get the top tier, secondary a
// lower one.
export function exerciseHighlighterData(exercise) {
  if (!exercise) return []
  const byRegion = {}
  const apply = (muscles, tier) => {
    for (const m of muscles || []) {
      for (const region of DATASET_TO_HIGHLIGHTER[m] || []) {
        byRegion[region] = Math.max(byRegion[region] || 0, tier)
      }
    }
  }
  apply(exercise.primaryMuscles, INTENSITY_TIERS)
  apply(exercise.secondaryMuscles, Math.max(1, Math.ceil(INTENSITY_TIERS / 2)))
  return Object.entries(byRegion).map(([region, frequency]) => ({
    name: region,
    muscles: [region],
    frequency,
  }))
}
