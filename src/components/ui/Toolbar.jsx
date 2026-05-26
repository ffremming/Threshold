import { cx } from './index'
import './toolbar.css'

export function Toolbar({ children, className }) {
  return <div className={cx('tp-toolbar', className)}>{children}</div>
}

export function ToolbarGroup({ label, children, className }) {
  return (
    <div className={cx('tp-toolbar-group', className)}>
      {label && <span className="tp-toolbar-label">{label}</span>}
      <div className="tp-toolbar-items">{children}</div>
    </div>
  )
}

export function SearchBox({ value, onChange, placeholder = 'Search…', className }) {
  return (
    <div className={cx('tp-searchbox', className)}>
      <span className="tp-searchbox-icon" aria-hidden="true">⌕</span>
      <input
        type="search"
        className="tp-searchbox-input"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          className="tp-searchbox-clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >×</button>
      )}
    </div>
  )
}
