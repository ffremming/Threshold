// Unified session/template filtering engine (pure).
//
// One criteria shape + one applyFilters function, reused by every surface that
// lists sessions (the plan-builder picker, the library, the coach bank, the
// swap/add modals). Each filter is an independent predicate; applyFilters ANDs
// every ACTIVE field, while values WITHIN a multi-select field are ORed. An
// empty/default criteria returns everything, so a surface can enable just the
// fields it wants and leave the rest inert.

import { ACTIVITY_TAG_MAP } from './activity'
import { normalizeIntensityZones, migrateWorkoutType } from './intensity'
import { sessionDuration } from './weekSummary'
import { sessionCategories } from './sessionCategory'

// All filter keys, in display order. A surface's `enabled` list is a subset.
export const FILTER_KEYS = [
  'search', 'activities', 'zones', 'types', 'categories', 'duration', 'templateCategory',
]

export const EMPTY_CRITERIA = {
  search: '',
  activities: [],
  zones: [],
  types: [],
  categories: [],
  duration: null, // { min: number|null, max: number|null }
  templateCategory: 'All',
}

// Is a single field populated (i.e. would it actually filter anything)?
function fieldActive(key, criteria) {
  const v = criteria[key]
  switch (key) {
    case 'search': return Boolean(v && v.trim())
    case 'activities':
    case 'zones':
    case 'types':
    case 'categories': return Array.isArray(v) && v.length > 0
    case 'duration': return Boolean(v && (v.min != null || v.max != null))
    case 'templateCategory': return Boolean(v && v !== 'All')
    default: return false
  }
}

export function isCriteriaActive(criteria, enabled = FILTER_KEYS) {
  return enabled.some(key => fieldActive(key, criteria))
}

// Full-text search across the human-meaningful fields of a session/template.
// This is the single canonical search used everywhere (replaces the per-surface
// matchesSearch variants).
export function matchesSessionSearch(item, term) {
  const q = (term || '').trim().toLowerCase()
  if (!q) return true
  const tags = Array.isArray(item.tags) ? item.tags : []
  const haystack = [
    item.title,
    item.description,
    item.sessionDetails,
    item.notes,
    item.category,
    item.type,
    item.activityTag,
    ACTIVITY_TAG_MAP[item.activityTag]?.label,
    ...tags,
  ].filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(q)
}

function matchesActivities(item, activities) {
  return activities.includes(item.activityTag)
}

function matchesZones(item, zones) {
  const itemZones = normalizeIntensityZones(item.type, item.intensityZone)
  return itemZones.some(z => zones.includes(z))
}

function matchesTypes(item, types) {
  return types.includes(migrateWorkoutType(item.type))
}

function matchesCategories(item, categories, opts) {
  const cats = sessionCategories(item, opts)
  return cats.some(c => categories.includes(c))
}

function matchesDuration(item, duration) {
  const d = sessionDuration(item)
  if (duration.min != null && d < duration.min) return false
  if (duration.max != null && d > duration.max) return false
  return true
}

function matchesTemplateCategory(item, templateCategory) {
  return templateCategory === 'All' || item.category === templateCategory
}

// Predicate table keyed by filter field — keeps applyFilters declarative and
// makes `enabled` gating trivial.
const PREDICATES = {
  search: (item, c) => matchesSessionSearch(item, c.search),
  activities: (item, c) => matchesActivities(item, c.activities),
  zones: (item, c) => matchesZones(item, c.zones),
  types: (item, c) => matchesTypes(item, c.types),
  categories: (item, c, opts) => matchesCategories(item, c.categories, opts),
  duration: (item, c) => matchesDuration(item, c.duration),
  templateCategory: (item, c) => matchesTemplateCategory(item, c.templateCategory),
}

// Filter `items` by `criteria`. Only fields that are both enabled AND populated
// run. `opts.enabled` defaults to all keys; `opts.resolveMuscles` is threaded to
// the (relatively expensive) training-category scorer.
export function applyFilters(items, criteria, opts = {}) {
  const enabled = opts.enabled || FILTER_KEYS
  const active = enabled.filter(key => fieldActive(key, criteria))
  if (active.length === 0) return items || []
  return (items || []).filter(item =>
    active.every(key => PREDICATES[key](item, criteria, opts)))
}
