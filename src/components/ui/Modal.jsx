import { useEffect } from 'react'
import { IconButton } from './index'
import SystemIcon from '../SystemIcon'
import './modal.css'

export function Modal({ open, onClose, title, eyebrow, size = 'md', children, footer }) {
  useEffect(() => {
    if (!open) return undefined
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose?.()
  }

  return (
    <div className="tp-modal-backdrop" onClick={handleBackdrop} role="dialog" aria-modal="true">
      <div className={`tp-modal tp-modal--${size}`}>
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
