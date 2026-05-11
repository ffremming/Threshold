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
