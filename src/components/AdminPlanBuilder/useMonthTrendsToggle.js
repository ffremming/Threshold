import { useEffect, useState } from 'react'

const STORAGE_KEY = 'planBuilder.monthTrends.v1'

function loadStored() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

// Show/hide the month-view trend chart panel. Off by default; persists across
// reloads. Independent of useMonthSignalsToggle (separate key, separate state).
export function useMonthTrendsToggle() {
  const [showTrends, setShowTrends] = useState(loadStored)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, showTrends ? 'true' : 'false')
    } catch {
      // ignore quota / disabled storage
    }
  }, [showTrends])

  return { showTrends, setShowTrends }
}
