import { ACTIVITY_TAG_MAP } from '../../utils'

const BUILDER_LAYOUT_BASE_KEY = 'training-planner:builder-layout:v1'
const VISIBLE_ACTIVITIES_BASE_KEY = 'training-planner:builder-visible-activities:v1'

// Per-user keys avoid leaking layout/filter preferences between accounts on
// shared devices.
export function getBuilderLayoutStorageKey(userId) {
  return userId ? `${BUILDER_LAYOUT_BASE_KEY}:${userId}` : BUILDER_LAYOUT_BASE_KEY
}

export function getVisibleActivitiesStorageKey(userId) {
  return userId ? `${VISIBLE_ACTIVITIES_BASE_KEY}:${userId}` : VISIBLE_ACTIVITIES_BASE_KEY
}

export const DEFAULT_PANEL_ORDER = ['bank', 'extra', 'calendar', 'insights']
export const DEFAULT_PANEL_SIZES = {
  bank: 360,
  extra: 360,
  calendar: 980,
  insights: 420,
}

export const PINNED_ACTIVITY_TAGS = ['run', 'walking', 'strength']
export const DEFAULT_VISIBLE_ACTIVITIES = [...PINNED_ACTIVITY_TAGS]

export function readVisibleActivities(userId) {
  if (typeof window === 'undefined') return DEFAULT_VISIBLE_ACTIVITIES
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(getVisibleActivitiesStorageKey(userId)) || 'null'
    )
    if (!Array.isArray(saved)) return DEFAULT_VISIBLE_ACTIVITIES
    const valid = saved.filter(value => ACTIVITY_TAG_MAP[value])
    const withPinned = Array.from(new Set([...PINNED_ACTIVITY_TAGS, ...valid]))
    return withPinned
  } catch {
    return DEFAULT_VISIBLE_ACTIVITIES
  }
}
