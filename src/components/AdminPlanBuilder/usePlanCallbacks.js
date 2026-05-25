import { useMemo, useState } from 'react'
import { getAdjacentWeek } from '../../utils'

export function usePlanCallbacks({
  currentWeek,
  currentYear,
  onWeekChange,
  isThisWeek,
  onAddTemplateToDay,
  panelOrder,
  setPanelOrder,
}) {
  const [bankWindows, setBankWindows] = useState([])

  const visiblePanelIds = useMemo(() => {
    const base = ['bank', 'calendar']
    if (bankWindows.length > 0) base.splice(1, 0, 'extra')
    return panelOrder.filter(panelId => base.includes(panelId))
  }, [bankWindows.length, panelOrder])

  function prevWeek() {
    const previous = getAdjacentWeek(currentWeek, currentYear, -1)
    onWeekChange(previous.week, previous.year)
  }

  function nextWeek() {
    const next = getAdjacentWeek(currentWeek, currentYear, 1)
    onWeekChange(next.week, next.year)
  }

  function handleAddTemplateClick(template) {
    const today = new Date()
    const todayWeekday = ((today.getDay() + 6) % 7) + 1
    const targetWeekday = isThisWeek ? todayWeekday : 1
    return onAddTemplateToDay(template, targetWeekday)
  }

  function handleAddBankWindow() {
    setBankWindows(prev => [...prev, { id: `bank-window-${Date.now()}-${prev.length + 1}` }])
  }

  function handleRemoveBankWindow(windowId) {
    setBankWindows(prev => prev.filter(window => window.id !== windowId))
  }

  function movePanel(panelId, direction) {
    setPanelOrder(prev => {
      const visibleOrder = prev.filter(id => visiblePanelIds.includes(id))
      const currentIndex = visibleOrder.indexOf(panelId)
      if (currentIndex < 0) return prev
      const nextIndex = currentIndex + direction
      if (nextIndex < 0 || nextIndex >= visibleOrder.length) return prev

      const swapped = [...visibleOrder]
      ;[swapped[currentIndex], swapped[nextIndex]] = [swapped[nextIndex], swapped[currentIndex]]

      const swappedSet = new Set(swapped)
      const remaining = prev.filter(id => !swappedSet.has(id))
      return [...swapped, ...remaining]
    })
  }

  return {
    bankWindows,
    visiblePanelIds,
    prevWeek,
    nextWeek,
    handleAddTemplateClick,
    handleAddBankWindow,
    handleRemoveBankWindow,
    movePanel,
  }
}
