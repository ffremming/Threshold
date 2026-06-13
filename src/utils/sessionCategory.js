// Training-category classification for a session.
//
// A session's "category" (Threshold / VO2max / Speed / Endurance / Strength /
// Musc. endurance) is derived from the SAME per-quality stimulus the dimensions
// engine already computes — not a separate taxonomy — so the filter reconciles
// with every other dimensions surface in the app. "Tempo" is not a distinct
// category here: a Z3-dominant session reads as Threshold.

import { scoreSession } from './dimensions/scoreSession'
import {
  QUALITIES, QUALITY_LABELS, QUALITY_COLORS, REFERENCE_DOSE,
} from './dimensions/constants'

// Public, stable-ordered list of categories (matches the radar/bar order).
export const TRAINING_CATEGORIES = [
  'threshold', 'vo2max', 'speed', 'strength', 'muscular_endurance', 'endurance',
]
export const CATEGORY_LABELS = QUALITY_LABELS
export const CATEGORY_COLORS = QUALITY_COLORS

// A quality counts as a category of the session when its score is at least this
// share of the session's largest-quality score. 0.25 keeps a Z4 session tagged as
// both threshold and vo2max while excluding incidental trickle (e.g. the tiny
// endurance carryover of a Z5 session).
const CATEGORY_SHARE = 0.25

// Per-quality raw doses live on wildly different scales (a long session's
// muscular_endurance dose is quadratic in duration and dwarfs every other
// quality's raw number). Comparing raw doses makes nearly every endurance
// session read as "muscular endurance". So we compare each quality on the SAME
// reference-normalized scale the rest of the app uses (scoreWeek/weekScore):
// score = dose / REFERENCE_DOSE[quality]. This is the relative weighting that
// makes the categories balanced and consistent with the radar/bars.
function scoresFor(workout, opts) {
  const { dims } = scoreSession(workout, opts || {})
  const scores = {}
  for (const q of QUALITIES) scores[q] = (dims?.[q] || 0) / REFERENCE_DOSE[q]
  return scores
}

// The single dominant quality of a session, or null when nothing scores.
export function sessionPrimaryCategory(workout, opts) {
  const scores = scoresFor(workout, opts)
  let best = null
  let bestScore = 0
  for (const q of QUALITIES) {
    if (scores[q] > bestScore) {
      bestScore = scores[q]
      best = q
    }
  }
  return bestScore > 0 ? best : null
}

// Every quality the session meaningfully trains (score ≥ CATEGORY_SHARE of the
// max-quality score), in TRAINING_CATEGORIES order. Empty when nothing scores.
export function sessionCategories(workout, opts) {
  const scores = scoresFor(workout, opts)
  let max = 0
  for (const q of QUALITIES) max = Math.max(max, scores[q])
  if (max <= 0) return []
  const cutoff = max * CATEGORY_SHARE
  return TRAINING_CATEGORIES.filter(q => scores[q] >= cutoff)
}
