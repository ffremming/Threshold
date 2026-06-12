// Training-quality dimensions engine — shared constants.
//
// Six physiological qualities scored 0–100 per week from the plan itself.
// See docs/superpowers/specs/2026-06-12-training-quality-dimensions-design.md

export const QUALITIES = ['strength', 'endurance', 'muscular_endurance', 'vo2max', 'speed', 'threshold']

// Fixed display order for the radar axes and bars (stable week-to-week).
export const QUALITY_ORDER = ['threshold', 'vo2max', 'speed', 'strength', 'muscular_endurance', 'endurance']

export const QUALITY_COLORS = {
  threshold: '#2563eb',
  endurance: '#10b981',
  muscular_endurance: '#0d9488', // teal — adjacent to endurance, distinct
  vo2max: '#f97316',
  speed: '#8b5cf6',
  strength: '#ec4899',
}

export const QUALITY_LABELS = {
  strength: 'Strength',
  endurance: 'Endurance',
  muscular_endurance: 'Musc. endurance',
  vo2max: 'VO2max',
  speed: 'Speed',
  threshold: 'Threshold',
}

// How a single work-minute in a given intensity zone distributes across the
// intensity qualities (endurance / threshold / vo2max / speed). Muscular
// endurance and strength are handled separately (duration- and set-based).
// Rows are endurance-heavy at low zones, intensity-heavy at high zones.
export const ZONE_WEIGHTS = {
  1: { endurance: 1.0, threshold: 0.0, vo2max: 0.0, speed: 0.0 },
  2: { endurance: 0.9, threshold: 0.1, vo2max: 0.0, speed: 0.0 },
  3: { endurance: 0.45, threshold: 0.55, vo2max: 0.05, speed: 0.0 },
  4: { endurance: 0.15, threshold: 0.55, vo2max: 0.4, speed: 0.0 },
  5: { endurance: 0.05, threshold: 0.2, vo2max: 0.75, speed: 0.05 },
}

// Sprint / maximal short reps feed mostly the neuromuscular (speed) quality.
export const SPRINT_WEIGHT = { speed: 0.85, vo2max: 0.15, endurance: 0, threshold: 0 }

// ── Load curve ─────────────────────────────────────────────────────────────
// Load per work-minute as a function of intensity zone. Deliberately steep so
// interval / high-zone work costs far more than easy Zone 1 time:
//   loadPerMinute(z) = LOAD_BASE + LOAD_SCALE * z^LOAD_EXP
// Z1 ≈ 0.85/min, Z5 ≈ 3.9/min (~4.6× Z1). A 40-min Z4 interval session then
// out-loads a 60-min easy run, matching how much harder intervals actually are.
export const LOAD_BASE = 0.6
export const LOAD_SCALE = 0.25
export const LOAD_EXP = 1.6

// ── Muscular endurance ───────────────────────────────────────────────────────
// Driven only by LONG sustained work, weighted by intensity (long hard > long
// easy), with an S-curve on duration PAST a threshold:
//   below threshold        -> 0
//   at threshold           -> ME_BASELINE (a step up, not from 0)
//   threshold .. +ME_KNEE  -> linear, +ME_SLOPE per excess minute
//   past +ME_KNEE          -> diminishing returns (saturating tail, asymptote +ME_TAIL)
//
// Triggers:
//   - continuous session: total duration >= ME_CONT_THRESHOLD_MIN (2 h)
//   - interval session:   total interval WORK time >= ME_INTERVAL_THRESHOLD_MIN (40 min)
export const ME_CONT_THRESHOLD_MIN = 120 // 2 h continuous before muscular endurance starts
export const ME_INTERVAL_THRESHOLD_MIN = 40 // 40 min total interval work before it starts
export const ME_BASELINE = 20 // value the instant you cross the threshold
export const ME_SLOPE = 1.0 // per excess-minute in the linear region
export const ME_KNEE = 60 // excess minutes where linear gives way to diminishing (e.g. 3 h continuous)
export const ME_TAIL = 25 // extra gain available in the diminishing region (asymptotic)
export const ME_TAIL_KNEE = 45 // decay constant of the diminishing tail
// Intensity weighting: long hard work counts more (0.7 + 0.15*zone).
export const ME_INTENSITY_BASE = 0.7
export const ME_INTENSITY_ZONE_SCALE = 0.15

// Weekly raw-dose that equals a score of 100 for each quality. Calibrated:
//  - threshold: 100 = ~240 min of Zone 3 work/week (240 * 0.55 ≈ 132)
//  - endurance: 100 = ~750 min (12.5 h) of Zone 1/2 aerobic work/week
//  - muscular_endurance: 100 = a big long-work week (~120-min long run + long Z3 intervals)
export const REFERENCE_DOSE = {
  threshold: 132, // ~240 min Zone 3/week
  vo2max: 28, // ~2 VO2 interval sessions/wk
  endurance: 855, // ~900 min (15 h) Zone 1/2/week — elite base; a 10 h week ≈ 67
  muscular_endurance: 355, // ~3 × 3 h long sessions + 2 long threshold sessions/week
  speed: 18, // regular sprint/strides exposure (quality-minutes)
  strength: 55, // full-body strength ~2x/wk via the saturation model
}

// Decay time constants (weeks) for the analysis "buildup" view only.
// Fast qualities build and fade quickly; base qualities are durable.
export const TAU = {
  speed: 2,
  vo2max: 3,
  threshold: 4,
  endurance: 6,
  muscular_endurance: 6,
  strength: 7,
}

// Strength saturation tuning.
// muscleScore(sets) = 100 * (1 - e^(-STRENGTH_K * sets)); fitted to 3->50, 6->80, 9->90.
export const STRENGTH_K = 0.25
// coverageFactor(n) = n / (n + COVERAGE_K); ~4 muscles -> 0.70, ~8 -> 0.82.
export const COVERAGE_K = 1.714

// Activity tags treated as strength (mirrors STRENGTH_ACTIVITIES in src/sessionBlocks/units.js).
export const STRENGTH_ACTIVITIES = new Set(['strength', 'calisthenics', 'plyometric', 'crossfit'])
