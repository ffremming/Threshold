// Shape + helpers for per-week training targets stored on plans/{athleteId}.
// Pure: no React, no Firestore. A weekTarget is keyed by (week, year); the
// distribution maps activityTag → percentage of weekly volume.

// Stable key for a (week, year) pair — zero-padded week so string sort = time
// order within a year. Mirrors getWeekKey's format.
export function weekTargetKey(week, year) {
  return `${year}-${String(week).padStart(2, '0')}`
}

// Normalize an activity distribution to percentages summing to 100. Drops
// non-positive shares; returns {} when nothing positive remains. Tolerant of
// raw weights (e.g. {run:30,bike:10} → {run:75,bike:25}).
export function normalizeDistribution(dist) {
  if (!dist) return {}
  const entries = Object.entries(dist).filter(([, v]) => Number(v) > 0)
  const total = entries.reduce((s, [, v]) => s + Number(v), 0)
  if (total <= 0) return {}
  const out = {}
  for (const [tag, v] of entries) out[tag] = (Number(v) / total) * 100
  return out
}

// A blank week target (a non-base, fully unconstrained week).
export function emptyWeekTarget(week, year, id) {
  return {
    id,
    week: Number(week),
    year: Number(year),
    base: false,
    distanceKm: null,
    durationMin: null,
    distribution: null,
    qualities: [],
    dayTags: {},
    deload: false,
  }
}

// Default block-level ramp configuration when the user first enables the ramp.
export const DEFAULT_PLAN_SETTINGS = {
  rampPct: 5,        // +5%/week build-up
  deloadEveryN: 0,   // recurring deload cadence off by default
  deloadPct: 60,     // deload week = 60% of ramped volume
  taperPct: 40,      // A-race final week = 40% of ramped volume
  taperWeeks: 2,     // taper over the final 2 weeks before an A-race
}
