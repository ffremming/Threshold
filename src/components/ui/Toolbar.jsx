import { cx } from './index'
import './toolbar.css'

export function Toolbar({ children, className }) {
  return <div className={cx('th-toolbar', className)}>{children}</div>
}

export function ToolbarGroup({ label, children, className }) {
  return (
    <div className={cx('th-toolbar-group', className)}>
      {label && <span className="th-toolbar-label">{label}</span>}
      <div className="th-toolbar-items">{children}</div>
    </div>
  )
}

export function SearchBox({ value, onChange, placeholder = 'Search…', className }) {
  return (
    <div className={cx('th-searchbox', className)}>
      <span className="th-searchbox-icon" aria-hidden="true">⌕</span>
      <input
        type="search"
        className="th-searchbox-input"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          className="th-searchbox-clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >×</button>
      )}
    </div>
  )
}
