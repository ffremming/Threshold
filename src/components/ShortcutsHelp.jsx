import { useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
}

const panelStyle = {
  background: '#fff',
  color: '#222',
  borderRadius: 8,
  padding: '20px 24px',
  minWidth: 280,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
  fontSize: 14,
}

const rowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 24,
  padding: '6px 0',
}

const kbdStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  fontFamily: 'monospace',
  background: '#f0f0f0',
  border: '1px solid #ccc',
  borderRadius: 4,
  padding: '2px 6px',
  minHeight: 22,
}

const shortcuts = [
  { id: 'prev', keys: <ArrowLeft size={14} aria-hidden="true" />, desc: 'Previous week' },
  { id: 'next', keys: <ArrowRight size={14} aria-hidden="true" />, desc: 'Next week' },
  { id: 'today', keys: 'T', desc: 'Go to today' },
  { id: 'help', keys: '?', desc: 'Show this help' },
  { id: 'esc', keys: 'Esc', desc: 'Close this help' },
]

export default function ShortcutsHelp({ onClose }) {
  const panelRef = useRef(null)

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        ref={panelRef}
        style={panelStyle}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        tabIndex={-1}
      >
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 16 }}>
          Keyboard shortcuts
        </div>
        {shortcuts.map(s => (
          <div key={s.id} style={rowStyle}>
            <span style={kbdStyle}>{s.keys}</span>
            <span>{s.desc}</span>
          </div>
        ))}
        <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
          Click anywhere or press Esc to close.
        </div>
      </div>
    </div>
  )
}
