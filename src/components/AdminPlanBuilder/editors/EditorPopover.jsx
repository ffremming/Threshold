import { useEffect, useRef } from 'react'

// A small fixed-positioned popover anchored at a viewport point, matching the
// month grid's context-menu pattern: dismiss on outside pointerdown, scroll, or
// Escape. Clamps within the viewport so editors near an edge stay visible.
export default function EditorPopover({ at, onClose, children, width = 260 }) {
  const ref = useRef(null)

  useEffect(() => {
    function onPointerDown(event) {
      if (ref.current && ref.current.contains(event.target)) return
      onClose?.()
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('scroll', () => onClose?.(), true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  // Clamp so the popover doesn't overflow the right/bottom edge.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  const left = Math.min(at?.x ?? 0, vw - width - 12)
  const top = Math.min(at?.y ?? 0, vh - 320)

  return (
    <div
      ref={ref}
      className="pb-editor-popover"
      style={{ left: Math.max(8, left), top: Math.max(8, top), width }}
      role="dialog"
      onPointerDown={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
    >
      {children}
    </div>
  )
}
