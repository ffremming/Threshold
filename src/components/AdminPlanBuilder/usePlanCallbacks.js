import { getAdjacentWeek } from '../../utils'

export function usePlanCallbacks({
  currentWeek,
  currentYear,
  onWeekChange,
  isThisWeek,
  onAddTemplateToDay,
  view,
}) {
  // Bank (Session picker) and the calendar sit side by side — except on the
  // quick-build tab, which fills the period from the bank automatically and so
  // hides the manual picker.
  const visiblePanelIds = view === 'plan' ? ['calendar'] : ['bank', 'calendar']

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

  return {
    visiblePanelIds,
    prevWeek,
    nextWeek,
    handleAddTemplateClick,
  }
}
