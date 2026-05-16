import { useEffect, useRef } from 'react'
import { IconButton } from './index'
import SystemIcon from '../SystemIcon'
import './modal.css'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function Modal({ open, onClose, title, eyebrow, size = 'md', children, footer }) {
  const modalRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previouslyFocused = typeof document !== 'undefined' ? document.activeElement : null

    function onKey(e) {
      if (e.key === 'Escape') {
        onClose?.()
        return
      }
      if (e.key !== 'Tab' || !modalRef.current) return
      const focusables = modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    // Focus the first focusable element inside the modal on open.
    const focusables = modalRef.current?.querySelectorAll(FOCUSABLE_SELECTOR)
    if (focusables && focusables.length > 0) {
      focusables[0].focus()
    } else if (modalRef.current) {
      modalRef.current.focus()
    }

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [open, onClose])

  if (!open) return null

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose?.()
  }

  return (
    <div className="tp-modal-backdrop" onClick={handleBackdrop} role="dialog" aria-modal="true">
      <div ref={modalRef} tabIndex={-1} className={`tp-modal tp-modal--${size}`}>
        {(title || eyebrow || onClose) && (
          <header className="tp-modal-head">
            <div className="tp-modal-titles">
              {eyebrow && <span className="tp-modal-eyebrow">{eyebrow}</span>}
              {title && <h2 className="tp-modal-title">{title}</h2>}
            </div>
            {onClose && (
              <IconButton ariaLabel="Lukk" variant="ghost" onClick={onClose}>
                <SystemIcon name="close" className="system-icon" />
              </IconButton>
            )}
          </header>
        )}
        <div className="tp-modal-body">{children}</div>
        {footer && <footer className="tp-modal-foot">{footer}</footer>}
      </div>
    </div>
  )
}
