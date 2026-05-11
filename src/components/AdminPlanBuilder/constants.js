import { ACTIVITY_TAG_MAP } from '../../utils'

export const BUILDER_LAYOUT_STORAGE_KEY = 'training-planner:builder-layout:v1'
export const DEFAULT_PANEL_ORDER = ['bank', 'extra', 'calendar', 'insights']
export const DEFAULT_PANEL_SIZES = {
  bank: 360,
  extra: 360,
  calendar: 980,
  insights: 420,
}

export const VISIBLE_ACTIVITIES_STORAGE_KEY = 'training-planner:builder-visible-activities:v1'
export const PINNED_ACTIVITY_TAGS = ['run', 'walking', 'strength']
export const DEFAULT_VISIBLE_ACTIVITIES = [...PINNED_ACTIVITY_TAGS]

export function readVisibleActivities() {
  if (typeof window === 'undefined') return DEFAULT_VISIBLE_ACTIVITIES
  try {
    const saved = JSON.parse(window.localStorage.getItem(VISIBLE_ACTIVITIES_STORAGE_KEY) || 'null')
    if (!Array.isArray(saved)) return DEFAULT_VISIBLE_ACTIVITIES
    const valid = saved.filter(value => ACTIVITY_TAG_MAP[value])
    const withPinned = Array.from(new Set([...PINNED_ACTIVITY_TAGS, ...valid]))
    return withPinned
  } catch {
    return DEFAULT_VISIBLE_ACTIVITIES
  }
}
