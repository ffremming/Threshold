// Weekly aggregation + buildup series.
//
// scoreWeek: sum session doses, normalize to 0–100 against fixed reference
// doses, and surface per-session detail + muscles worked for the heatmap.
// buildupSeries: the analysis "buildup" view — rolling accumulation with
// per-quality exponential decay (Banister-style, weekly cadence).

import { QUALITIES, REFERENCE_DOSE, TAU } from './constants'
import { emptyDims, addDims, scoreSession } from './scoreSession'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// Normalize a raw weekly dose map to 0–100 per quality against REFERENCE_DOSE.
export function weekScore(rawDose) {
  const out = {}
  for (const q of QUALITIES) {
    out[q] = Math.round(clamp((100 * (rawDose[q] || 0)) / REFERENCE_DOSE[q], 0, 100))
  }
  return out
}

// Score a week's worth of workouts.
// Returns { dims (0–100), rawDims, load, musclesWorked, perSession }.
export function scoreWeek(workouts, opts = {}) {
  const raw = emptyDims()
  const musclesWorked = {}
  let load = 0
  const perSession = []

  for (const w of workouts || []) {
    const s = scoreSession(w, opts)
    addDims(raw, s.dims)
    load += s.load
    for (const m of Object.keys(s.musclesWorked)) {
      musclesWorked[m] = (musclesWorked[m] || 0) + s.musclesWorked[m]
    }
    perSession.push({ workout: w, ...s })
  }

  return { dims: weekScore(raw), rawDims: raw, load: Math.round(load), musclesWorked, perSession }
}

// Rolling accumulation with per-quality decay over a sequence of weekly
// stimulus maps. Steady-state of a constant input equals that input.
export function buildupSeries(weeklyStimulus) {
  const decay = {}
  for (const q of QUALITIES) decay[q] = Math.exp(-1 / TAU[q])
  const cap = emptyDims()
  const out = []
  for (const wk of weeklyStimulus || []) {
    for (const q of QUALITIES) cap[q] = cap[q] * decay[q] + (wk[q] || 0) * (1 - decay[q])
    out.push({ ...cap })
  }
  return out
}
