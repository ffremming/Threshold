import { useEffect } from 'react'
import { Layers, StickyNote, Trophy } from 'lucide-react'

// Right-click menu for the week view: add a band / note / competition for the
// dragged day-range. Reuses the month context-menu styling. Dismisses on
// outside pointerdown, scroll, or Escape.
export default function WeekAnnotationMenu({ menu, onClose, onAddBand, onAddNote, onAddGoal }) {
  useEffect(() => {
    if (!menu) return
    function dismiss(event) {
      if (event.target?.closest?.('.pb-month-context-menu')) return
      onClose?.()
    }
    function onKey(event) { if (event.key === 'Escape') onClose?.() }
    window.addEventListener('pointerdown', dismiss, true)
    window.addEventListener('scroll', () => onClose?.(), true)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', dismiss, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu, onClose])

  if (!menu) return null
  return (
    <div className="pb-month-context-menu" style={{ left: menu.x, top: menu.y }} role="menu">
      <button type="button" className="pb-month-context-item" role="menuitem" onClick={onAddBand}>
        <Layers aria-hidden="true" strokeWidth={2} /><span>Add band…</span>
      </button>
      <button type="button" className="pb-month-context-item" role="menuitem" onClick={onAddNote}>
        <StickyNote aria-hidden="true" strokeWidth={2} /><span>Add note…</span>
      </button>
      <button type="button" className="pb-month-context-item" role="menuitem" onClick={onAddGoal}>
        <Trophy aria-hidden="true" strokeWidth={2} /><span>Add competition…</span>
      </button>
    </div>
  )
}
