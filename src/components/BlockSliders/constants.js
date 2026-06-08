export const DISTANCE_MIN = 0
export const DISTANCE_MAX = 50
export const DISTANCE_STEP = 0.1

export const DRAG_MIN = 0.05
export const DRAG_MAX = 10
export const DRAG_STEP = 0.05

export const DRAG_TIME_MIN = 10
export const DRAG_TIME_MAX = 60 * 30
export const DRAG_TIME_STEP = 5

export const REPS_MIN = 1
export const REPS_MAX = 30
export const REPS_STEP = 1

export const PACE_MIN = 180
export const PACE_MAX = 540
export const PACE_STEP = 5

export const SPEED_MIN = 5
export const SPEED_MAX = 50
export const SPEED_STEP = 0.5

export const PAUSE_MIN = 0
export const PAUSE_MAX = 600
export const PAUSE_STEP = 5

export const EST_DISTANCE_MIN = 0
export const EST_DISTANCE_MAX = 10
export const EST_DISTANCE_STEP = 0.05

// Strength session ranges.
export const SETS_MIN = 1
export const SETS_MAX = 10
export const SETS_STEP = 1

export const STRENGTH_REPS_MIN = 1
export const STRENGTH_REPS_MAX = 30
export const STRENGTH_REPS_STEP = 1

export const LOAD_MIN = 0
export const LOAD_MAX = 250
export const LOAD_STEP = 2.5

export const REST_MIN = 0
export const REST_MAX = 300
export const REST_STEP = 5

// Duration-only block range (minutes).
export const DURATION_MIN = 1
export const DURATION_MAX = 180
export const DURATION_STEP = 1

// Sprint block ranges: reps × work seconds.
export const SPRINT_REPS_MIN = 1
export const SPRINT_REPS_MAX = 30
export const SPRINT_REPS_STEP = 1

export const SPRINT_SEC_MIN = 5
export const SPRINT_SEC_MAX = 120
export const SPRINT_SEC_STEP = 5

export function clampPace(pace) {
  if (!Number.isFinite(pace) || pace <= 0) return PACE_MIN
  return Math.min(PACE_MAX, Math.max(PACE_MIN, pace))
}

export function formatSeconds(totalSec) {
  const sec = Math.max(0, Math.round(Number(totalSec) || 0))
  if (sec >= 60) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return s > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${m} min`
  }
  return `${sec}s`
}
