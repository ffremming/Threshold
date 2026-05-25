import { useEffect, useState } from 'react'
import { auth } from '../../firebase'
import {
  DEFAULT_PANEL_ORDER,
  DEFAULT_PANEL_SIZES,
  PINNED_ACTIVITY_TAGS,
  getBuilderLayoutStorageKey,
  getVisibleActivitiesStorageKey,
  readVisibleActivities,
} from './constants'
import { clamp } from './mathUtils'

export function useBuilderLayout() {
  const userId = auth.currentUser?.uid || null
  const layoutKey = getBuilderLayoutStorageKey(userId)
  const visibleKey = getVisibleActivitiesStorageKey(userId)

  const [viewportWidth, setViewportWidth] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth : 1440
  ))
  const [panelOrder, setPanelOrder] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_PANEL_ORDER
    try {
      const saved = JSON.parse(window.localStorage.getItem(layoutKey) || '{}')
      return Array.isArray(saved.panelOrder) ? saved.panelOrder : DEFAULT_PANEL_ORDER
    } catch {
      return DEFAULT_PANEL_ORDER
    }
  })
  const [panelSizes, setPanelSizes] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_PANEL_SIZES
    try {
      const saved = JSON.parse(window.localStorage.getItem(layoutKey) || '{}')
      return {
        ...DEFAULT_PANEL_SIZES,
        ...(saved.panelSizes || {}),
      }
    } catch {
      return DEFAULT_PANEL_SIZES
    }
  })
  const [activeResizer, setActiveResizer] = useState(null)
  const [visibleActivities, setVisibleActivities] = useState(() => readVisibleActivities(userId))

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(visibleKey, JSON.stringify(visibleActivities))
  }, [visibleActivities, visibleKey])

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!activeResizer) return

    function handlePointerMove(event) {
      const deltaX = event.clientX - activeResizer.startX
      setPanelSizes(prev => ({
        ...prev,
        [activeResizer.panelId]: clamp(activeResizer.startWidth + deltaX, activeResizer.minWidth, activeResizer.maxWidth),
      }))
    }

    function handlePointerUp() {
      setActiveResizer(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [activeResizer])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(layoutKey, JSON.stringify({
      panelOrder,
      panelSizes,
    }))
  }, [panelOrder, panelSizes, layoutKey])

  function addVisibleActivity(value) {
    setVisibleActivities(prev => (prev.includes(value) ? prev : [...prev, value]))
  }

  function removeVisibleActivity(value) {
    if (PINNED_ACTIVITY_TAGS.includes(value)) return
    setVisibleActivities(prev => prev.filter(item => item !== value))
  }

  function getResizeBounds(panelId) {
    // Bank/extra grow up to whatever leaves the calendar at least 480px wide,
    // so the splitter never starves the calendar.
    const calendarReserve = 480
    const cap = Math.max(320, viewportWidth - calendarReserve - 64)
    return { minWidth: 280, maxWidth: Math.min(1600, cap) }
  }

  function startResize(panelId, event) {
    event.preventDefault()
    const { minWidth, maxWidth } = getResizeBounds(panelId)
    setActiveResizer({
      panelId,
      startX: event.clientX,
      startWidth: panelSizes[panelId] || DEFAULT_PANEL_SIZES[panelId],
      minWidth,
      maxWidth,
    })
  }

  // Keyboard fallback so panel widths can be adjusted without a pointer.
  function nudgeResize(panelId, deltaX) {
    const { minWidth, maxWidth } = getResizeBounds(panelId)
    setPanelSizes(prev => ({
      ...prev,
      [panelId]: clamp((prev[panelId] || DEFAULT_PANEL_SIZES[panelId]) + deltaX, minWidth, maxWidth),
    }))
  }

  return {
    viewportWidth,
    panelOrder,
    setPanelOrder,
    panelSizes,
    visibleActivities,
    addVisibleActivity,
    removeVisibleActivity,
    startResize,
    nudgeResize,
  }
}
