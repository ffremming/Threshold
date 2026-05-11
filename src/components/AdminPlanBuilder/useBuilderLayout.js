import { useEffect, useState } from 'react'
import {
  BUILDER_LAYOUT_STORAGE_KEY,
  DEFAULT_PANEL_ORDER,
  DEFAULT_PANEL_SIZES,
  PINNED_ACTIVITY_TAGS,
  VISIBLE_ACTIVITIES_STORAGE_KEY,
  readVisibleActivities,
} from './constants'
import { clamp } from './mathUtils'

export function useBuilderLayout() {
  const [viewportWidth, setViewportWidth] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth : 1440
  ))
  const [panelOrder, setPanelOrder] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_PANEL_ORDER
    try {
      const saved = JSON.parse(window.localStorage.getItem(BUILDER_LAYOUT_STORAGE_KEY) || '{}')
      return Array.isArray(saved.panelOrder) ? saved.panelOrder : DEFAULT_PANEL_ORDER
    } catch {
      return DEFAULT_PANEL_ORDER
    }
  })
  const [panelSizes, setPanelSizes] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_PANEL_SIZES
    try {
      const saved = JSON.parse(window.localStorage.getItem(BUILDER_LAYOUT_STORAGE_KEY) || '{}')
      return {
        ...DEFAULT_PANEL_SIZES,
        ...(saved.panelSizes || {}),
      }
    } catch {
      return DEFAULT_PANEL_SIZES
    }
  })
  const [activeResizer, setActiveResizer] = useState(null)
  const [visibleActivities, setVisibleActivities] = useState(readVisibleActivities)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(VISIBLE_ACTIVITIES_STORAGE_KEY, JSON.stringify(visibleActivities))
  }, [visibleActivities])

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
    window.localStorage.setItem(BUILDER_LAYOUT_STORAGE_KEY, JSON.stringify({
      panelOrder,
      panelSizes,
    }))
  }, [panelOrder, panelSizes])

  function addVisibleActivity(value) {
    setVisibleActivities(prev => (prev.includes(value) ? prev : [...prev, value]))
  }

  function removeVisibleActivity(value) {
    if (PINNED_ACTIVITY_TAGS.includes(value)) return
    setVisibleActivities(prev => prev.filter(item => item !== value))
  }

  function startResize(panelId, event) {
    event.preventDefault()
    setActiveResizer({
      panelId,
      startX: event.clientX,
      startWidth: panelSizes[panelId] || DEFAULT_PANEL_SIZES[panelId],
      minWidth: panelId === 'calendar' ? 780 : 280,
      maxWidth: 1600,
    })
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
  }
}
