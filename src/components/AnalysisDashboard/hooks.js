import { useEffect, useMemo, useState } from 'react'
import { FILTERS_STORAGE_KEY, METRIC_OPTIONS, RANGE_OPTIONS } from './constants'
import { clampWindowStart } from './utils'

function loadStoredFilters() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function usePersistedFilters() {
  const stored = useMemo(loadStoredFilters, [])
  const storedRange = RANGE_OPTIONS.some(o => o.value === stored?.range) ? stored.range : 12
  const storedMetric = METRIC_OPTIONS.some(o => o.value === stored?.primaryMetric) ? stored.primaryMetric : 'load'
  const storedTag = typeof stored?.activeTagFilter === 'string' ? stored.activeTagFilter : null

  const [range, setRange] = useState(storedRange)
  const [activeTagFilter, setActiveTagFilter] = useState(storedTag)
  const [primaryMetric, setPrimaryMetric] = useState(storedMetric)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify({ range, primaryMetric, activeTagFilter })
      )
    } catch {
      // ignore quota / disabled storage
    }
  }, [range, primaryMetric, activeTagFilter])

  return { range, setRange, activeTagFilter, setActiveTagFilter, primaryMetric, setPrimaryMetric }
}

export function useAnalysisWindow(weeks, currentWeek, currentYear, range) {
  const currentIndex = useMemo(
    () => weeks.findIndex(week => week.week === currentWeek && week.year === currentYear),
    [weeks, currentWeek, currentYear]
  )
  const [windowStart, setWindowStart] = useState(() => clampWindowStart(
    currentIndex === -1 ? 0 : currentIndex - Math.floor(12 / 2),
    weeks.length,
    12
  ))
  const maxWindowStart = Math.max(0, weeks.length - range)

  useEffect(() => {
    const centeredStart = clampWindowStart(
      currentIndex === -1 ? maxWindowStart : currentIndex - Math.floor(range / 2),
      weeks.length,
      range
    )

    setWindowStart(prev => {
      if (prev > maxWindowStart) return maxWindowStart
      if (currentIndex !== -1 && (currentIndex < prev || currentIndex >= prev + range)) {
        return centeredStart
      }
      return prev
    })
  }, [weeks.length, range, currentIndex, maxWindowStart])

  const visibleWeeks = useMemo(() => weeks.slice(windowStart, windowStart + range), [weeks, windowStart, range])

  return { currentIndex, windowStart, setWindowStart, maxWindowStart, visibleWeeks }
}
