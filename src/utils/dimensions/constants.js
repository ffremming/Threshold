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
// Each zone credits the quality it actually trains:
//   Z1/Z2 are sub-threshold aerobic base — pure endurance, no threshold.
//   Z3 is the threshold zone (mostly threshold, some aerobic carryover).
//   Z4 straddles threshold and VO2max.
//   Z5 is VO2max work with a touch of neuromuscular speed.
export const ZONE_WEIGHTS = {
  1: { endurance: 1.0, threshold: 0.0, vo2max: 0.0, speed: 0.0 },
  2: { endurance: 1.0, threshold: 0.0, vo2max: 0.0, speed: 0.0 },
  3: { endurance: 0.35, threshold: 0.6, vo2max: 0.05, speed: 0.0 },
  4: { endurance: 0.1, threshold: 0.55, vo2max: 0.35, speed: 0.0 },
  5: { endurance: 0.0, threshold: 0.2, vo2max: 0.75, speed: 0.05 },
}

// Sprint / maximal short reps feed mostly the neuromuscular (speed) quality.
export const SPRINT_WEIGHT = { speed: 0.85, vo2max: 0.15, endurance: 0, threshold: 0 }

// ── Load: Edwards' summated heart-rate-zone TRIMP ────────────────────────────
// Per-session cardio load = Σ (minutes in a zone × that zone's weight), using
// Edwards' canonical zone weights (1–5). This is the most widely cited HR-zone
// load method; it is validated as a load proxy (cross-validates with Banister
// TRIMP r≈0.89 and session-RPE r≈0.67–0.72), though the integer weights
// themselves are acknowledged in the literature to be linear/arbitrary rather
// than physiologically derived.
//   Edwards S. (1993), The Heart Rate Monitor Book. Fleet Feet Press.
//   Foster C et al. (2001), J Strength Cond Res 15:109–115 (validation).
// (A lactate-derived non-linear alternative is Stagno's TRIMPMOD 2007,
//  weights 1.25/1.71/2.54/3.61/5.16 — kept here as a documented option.)
export const EDWARDS_ZONE_WEIGHTS = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }

// ── Muscular endurance ───────────────────────────────────────────────────────
// Long-and-hard only: muscular endurance comes from SUSTAINED effort under load.
// A session must clear TWO gates to contribute anything:
//   1. real clock duration >= ME_RAW_MIN_MINUTES — short sessions score zero no
//      matter how intense (a 45 min Z4 interval set is short → 0).
//   2. effective minutes E = Σ(section_minutes × ME_ZONE_WEIGHTS[zone]) >= ME_EFF_FLOOR.
// Above both, only the excess counts and long efforts dominate mildly super-linearly:
//   dose = (E − ME_EFF_FLOOR) ^ ME_EXPONENT
// Threshold (zone 3) minutes are weighted ×3, so length × intensity contributes
// the most. Anchor: 30 min warmup (Z1) + 30 min Z3 = 120 effective min ("2 h").
export const ME_ZONE_WEIGHTS = { 1: 1, 2: 1.5, 3: 3, 4: 4, 5: 5 }
export const ME_RAW_MIN_MINUTES = 75 // real clock minutes; below this → 0
export const ME_EFF_FLOOR = 90 // effective (zone-weighted) minutes; below this → 0
export const ME_EXPONENT = 1.3 // super-linear so one long effort beats several short

// ── Speed ────────────────────────────────────────────────────────────────────
// Load-based: each sprint rep contributes a fixed dose (continuous, no minimum
// sprint-count gate). Reference is set so ~12 sprints/week (≈ 3 sessions × 4)
// approaches the top of the scale.
export const SPEED_PER_SPRINT = 8

// Weekly raw-dose that equals a score of 100 for each quality. Anchors only set
// the reference; scoring is continuous (clamped to [0,100]). Calibrated to:
//  - endurance: 100 = ~25 h (1500 min) of Zone 1/2 aerobic work/week
//  - vo2max:    100 = ~120 min of Zone 4/5 work/week
//  - threshold: 100 = ~240 min of Zone 3 work/week
//  - speed:     100 = ~12 sprint reps/week (≈ 3 sessions × 4 sprints)
//  - muscular_endurance: 100 = ~3 genuinely long sessions/week (long-threshold + long rides)
export const REFERENCE_DOSE = {
  threshold: 144, // ~240 min Zone 3/week (240 × 0.6 threshold-weight)
  vo2max: 66, // ~120 min Zone 4/5/week
  endurance: 1425, // ~25 h Zone 1/2/week
  muscular_endurance: 4000, // ~3 long sessions/week (see ME model above)
  speed: 96, // ~12 sprint reps/week
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
