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

  // Bank (Session picker) and calendar are always adjacent. The optional extra
  // panel sits on the outer side; panelOrder is only consulted to remember
  // which side (left vs right of the bank+calendar pair) the user prefers.
  const visiblePanelIds = useMemo(() => {
    if (bankWindows.length === 0) return ['bank', 'calendar']
    const extraIdx = panelOrder.indexOf('extra')
    const calIdx = panelOrder.indexOf('calendar')
    const extraOnLeft = extraIdx >= 0 && calIdx >= 0 && extraIdx < calIdx
    return extraOnLeft ? ['extra', 'bank', 'calendar'] : ['bank', 'calendar', 'extra']
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

  // Only the extra panel can move: bank+calendar are a locked pair.
  // Moving extra flips it between the left and right side of that pair.
  function movePanel(panelId, direction) {
    if (panelId !== 'extra') return
    setPanelOrder(prev => {
      const without = prev.filter(id => id !== 'extra')
      const calIdx = without.indexOf('calendar')
      const currentExtraIdx = prev.indexOf('extra')
      const wasOnLeft = currentExtraIdx >= 0 && currentExtraIdx < calIdx
      if (direction < 0 && !wasOnLeft) return ['extra', ...without]
      if (direction > 0 && wasOnLeft) return [...without, 'extra']
      return prev
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
