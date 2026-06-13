import { useMemo, useState, useCallback } from 'react'
import {
  EMPTY_CRITERIA,
  FILTER_KEYS,
  applyFilters,
  isCriteriaActive,
} from '../../utils/sessionFilters'

// Shared filter state for any surface that lists sessions/templates.
//
//   const f = useSessionFilters(items, { enabled, resolveMuscles })
//   f.criteria      → the current criteria object
//   f.set.search(x) / f.set.activities(arr) / f.set.toggleZone(z) / …
//   f.filtered      → items after every enabled+active filter
//   f.filtersActive → true when any enabled field is populated
//   f.clearAll()    → reset to defaults
//
// `enabled` declares which filters this surface offers (subset of FILTER_KEYS);
// it gates both the predicates that run and what SessionFilterBar renders.
export function useSessionFilters(items, options = {}) {
  const { enabled = FILTER_KEYS, resolveMuscles } = options
  const [criteria, setCriteria] = useState(EMPTY_CRITERIA)

  const patch = useCallback(p => setCriteria(prev => ({ ...prev, ...p })), [])

  const toggleInArray = useCallback((key, value) => {
    setCriteria(prev => {
      const cur = prev[key]
      const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]
      return { ...prev, [key]: next }
    })
  }, [])

  const set = useMemo(() => ({
    search: v => patch({ search: v }),
    activities: v => patch({ activities: v }),
    toggleZone: z => toggleInArray('zones', z),
    zones: v => patch({ zones: v }),
    toggleType: t => toggleInArray('types', t),
    types: v => patch({ types: v }),
    toggleCategory: c => toggleInArray('categories', c),
    categories: v => patch({ categories: v }),
    duration: v => patch({ duration: v }),
    templateCategory: v => patch({ templateCategory: v }),
  }), [patch, toggleInArray])

  const clearAll = useCallback(() => setCriteria(EMPTY_CRITERIA), [])

  // Whether the (relatively costly) training-category scorer can ever run for
  // this surface — only then do we depend on resolveMuscles.
  const categoriesEnabled = enabled.includes('categories')

  const opts = useMemo(
    () => ({ enabled, resolveMuscles: categoriesEnabled ? resolveMuscles : undefined }),
    [enabled, categoriesEnabled, resolveMuscles],
  )

  const filtered = useMemo(
    () => applyFilters(items || [], criteria, opts),
    [items, criteria, opts],
  )

  const filtersActive = useMemo(
    () => isCriteriaActive(criteria, enabled),
    [criteria, enabled],
  )

  return { criteria, set, filtered, filtersActive, clearAll, enabled }
}
