import { useEffect, useState } from 'react'

const STORAGE_KEY = 'planBuilder.monthSignals.v1'

function loadStored() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

// Show/hide the month-view per-week load-signal strips. Off by default;
// the choice persists across reloads in localStorage.
export function useMonthSignalsToggle() {
  const [showSignals, setShowSignals] = useState(loadStored)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, showSignals ? 'true' : 'false')
    } catch {
      // ignore quota / disabled storage
    }
  }, [showSignals])

  return { showSignals, setShowSignals }
}
