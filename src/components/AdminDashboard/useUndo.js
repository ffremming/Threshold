import { useCallback, useEffect, useRef } from 'react'

function isTypingTarget(target) {
  if (!target) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

// Single-step undo for plan edits. Each undoable action registers a compensating
// function via pushUndo(run); Cmd/Ctrl+Z runs the latest one (a reverse write to
// Firestore) and clears the slot. No redo, no multi-step history.
//
// `enabled` gates the keyboard listener (e.g. only on the plan-builder tab) and
// `modalOpen` suppresses it while a dialog/form owns the keyboard.
export function useUndo({ enabled = true, modalOpen = false } = {}) {
  const entryRef = useRef(null)
  const runningRef = useRef(false)

  const pushUndo = useCallback((run) => {
    if (typeof run !== 'function') return
    entryRef.current = run
  }, [])

  const clearUndo = useCallback(() => { entryRef.current = null }, [])

  const undo = useCallback(async () => {
    const run = entryRef.current
    if (!run || runningRef.current) return
    entryRef.current = null
    runningRef.current = true
    try {
      await run()
    } finally {
      runningRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    function onKeyDown(event) {
      if (modalOpen || isTypingTarget(event.target)) return
      const mod = event.metaKey || event.ctrlKey
      if (!mod || event.shiftKey) return // Shift+Z reserved for future redo
      if (event.key.toLowerCase() !== 'z') return
      if (!entryRef.current) return
      event.preventDefault()
      undo()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [enabled, modalOpen, undo])

  return { pushUndo, clearUndo, undo }
}
