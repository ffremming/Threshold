// Training-quality dimensions engine — shared constants.
//
// Five physiological qualities scored 0–100 per week from the plan itself.
// See docs/superpowers/specs/2026-06-12-training-quality-dimensions-design.md

export const QUALITIES = ['strength', 'endurance', 'vo2max', 'speed', 'threshold']

// Fixed display order for the radar axes and bars (stable week-to-week).
export const QUALITY_ORDER = ['threshold', 'endurance', 'speed', 'vo2max', 'strength']

export const QUALITY_COLORS = {
  threshold: '#2563eb',
  endurance: '#10b981',
  vo2max: '#f97316',
  speed: '#8b5cf6',
  strength: '#ec4899',
}

export const QUALITY_LABELS = {
  strength: 'Strength',
  endurance: 'Endurance',
  vo2max: 'VO2max',
  speed: 'Speed',
  threshold: 'Threshold',
}

// How a single work-minute in a given intensity zone distributes across qualities.
// Rows are intentionally endurance-heavy at low zones and intensity-heavy at high zones.
export const ZONE_WEIGHTS = {
  1: { endurance: 1.0, threshold: 0.0, vo2max: 0.0, speed: 0.0 },
  2: { endurance: 0.9, threshold: 0.1, vo2max: 0.0, speed: 0.0 },
  3: { endurance: 0.45, threshold: 0.55, vo2max: 0.05, speed: 0.0 },
  4: { endurance: 0.15, threshold: 0.55, vo2max: 0.4, speed: 0.0 },
  5: { endurance: 0.05, threshold: 0.2, vo2max: 0.75, speed: 0.05 },
}

// Sprint / maximal short reps feed mostly the neuromuscular (speed) quality.
export const SPRINT_WEIGHT = { speed: 0.85, vo2max: 0.15, endurance: 0, threshold: 0 }

// Weekly raw-dose that equals a score of 100 for each quality.
// Calibrated (Task 8) so a hard-but-sustainable week lands ~80–90 on its
// dominant quality and an easy/recovery week stays low.
export const REFERENCE_DOSE = {
  threshold: 66, // ~3 hard threshold sessions/wk lands ~85 (calibrated against the hard-week test)
  vo2max: 28, // ~2 VO2 interval sessions/wk
  endurance: 300, // weekly aerobic-base minutes; easy week ~25, big-volume week ~70+
  speed: 18, // regular sprint/strides exposure (quality-minutes)
  strength: 55, // full-body strength ~2x/wk via the saturation model
}

// Decay time constants (weeks) for the analysis "buildup" view only.
// Fast qualities build and fade quickly; base qualities are durable.
export const TAU = { speed: 2, vo2max: 3, threshold: 4, endurance: 6, strength: 7 }

// Strength saturation tuning.
// muscleScore(sets) = 100 * (1 - e^(-STRENGTH_K * sets)); fitted to 3->50, 6->80, 9->90.
export const STRENGTH_K = 0.25
// coverageFactor(n) = n / (n + COVERAGE_K); ~4 muscles -> 0.70, ~8 -> 0.82.
export const COVERAGE_K = 1.714

// Activity tags treated as strength (mirrors STRENGTH_ACTIVITIES in src/sessionBlocks/units.js).
export const STRENGTH_ACTIVITIES = new Set(['strength', 'calisthenics', 'plyometric', 'crossfit'])
