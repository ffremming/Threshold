// Tracks recently-added exercise ids in localStorage so the picker can offer a
// one-tap "recently used" shortcut. Best-effort: any storage error is ignored
// (private mode, quota, SSR), in which case recents are simply empty.

import { getExercise } from './library'

const KEY = 'threshold.strength.recentExercises'
const MAX = 8

function readIds() {
  try {
    const raw = localStorage.getItem(KEY)
    const ids = raw ? JSON.parse(raw) : []
    return Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : []
  } catch {
    return []
  }
}

// Resolve stored ids to exercise objects, dropping any that no longer exist.
export function getRecentExercises() {
  return readIds().map(getExercise).filter(Boolean)
}

// Record an exercise as just used, moving it to the front (most-recent-first).
export function recordRecentExercise(id) {
  if (!id) return
  try {
    const next = [id, ...readIds().filter(x => x !== id)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore — recents are a convenience, not critical state
  }
}
