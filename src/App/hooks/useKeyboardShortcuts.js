import { useEffect, useRef } from 'react'

// Global keyboard shortcuts for week navigation and the help overlay.
// State and callbacks are read through a ref so the listener is bound once
// and never needs to re-attach when state changes.
export function useKeyboardShortcuts({
  isModalOpen,
  showShortcutsHelp,
  setShowShortcutsHelp,
  prevWeek,
  nextWeek,
  goToToday,
}) {
  const stateRef = useRef({})
  stateRef.current = {
    isModalOpen,
    showShortcutsHelp,
    setShowShortcutsHelp,
    prevWeek,
    nextWeek,
    goToToday,
  }

  useEffect(() => {
    function isTypingTarget(target) {
      if (!target) return false
      const tag = target.tagName
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
      )
    }

    function handleKeyDown(event) {
      if (isTypingTarget(event.target)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const s = stateRef.current

      if (event.key === 'Escape' && s.showShortcutsHelp) {
        event.preventDefault()
        s.setShowShortcutsHelp(false)
        return
      }

      if (s.isModalOpen) return

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          s.prevWeek()
          break
        case 'ArrowRight':
          event.preventDefault()
          s.nextWeek()
          break
        case 't':
        case 'T':
          event.preventDefault()
          s.goToToday()
          break
        case '?':
          event.preventDefault()
          s.setShowShortcutsHelp(prev => !prev)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
