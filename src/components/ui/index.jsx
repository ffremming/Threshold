import { forwardRef } from 'react'
import './ui.css'

function cx(...parts) { return parts.filter(Boolean).join(' ') }
export { cx }

/* ── Button ─────────────────────────────────────────────────────── */
export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', block, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'tp-btn',
        variant !== 'primary' && `tp-btn--${variant}`,
        size !== 'md' && `tp-btn--${size}`,
        block && 'tp-btn--block',
        className,
      )}
      {...rest}
    />
  )
})

/* ── Icon button ───────────────────────────────────────────────── */
export const IconButton = forwardRef(function IconButton(
  { variant, size, className, ariaLabel, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      className={cx(
        'tp-icon-btn',
        variant && `tp-icon-btn--${variant}`,
        size && `tp-icon-btn--${size}`,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})

/* ── Card ──────────────────────────────────────────────────────── */
export function Card({ as: Tag = 'div', flush, inset, className, ...rest }) {
  return (
    <Tag
      className={cx('tp-card', flush && 'tp-card--flush', inset && 'tp-card--inset', className)}
      {...rest}
    />
  )
}

/* ── Field + controls ──────────────────────────────────────────── */
export function Field({ label, hint, error, children, className }) {
  return (
    <label className={cx('tp-field', className)}>
      {label && <span className="tp-field-label">{label}</span>}
      {children}
      {error
        ? <span className="tp-field-error">{error}</span>
        : hint && <span className="tp-field-hint">{hint}</span>}
    </label>
  )
}

export const Input = forwardRef(function Input({ error, className, ...rest }, ref) {
  return <input ref={ref} className={cx('tp-input', error && 'tp-input--error', className)} {...rest} />
})

export const Textarea = forwardRef(function Textarea({ error, className, ...rest }, ref) {
  return <textarea ref={ref} className={cx('tp-textarea', error && 'tp-textarea--error', className)} {...rest} />
})

export const Select = forwardRef(function Select({ className, children, ...rest }, ref) {
  return <select ref={ref} className={cx('tp-select', className)} {...rest}>{children}</select>
})

/* ── Chip / Pill / Badge ───────────────────────────────────────── */
export function Chip({ active, onClick, children, className, ...rest }) {
  return (
    <button
      type="button"
      className={cx('tp-chip', active && 'is-active', className)}
      aria-pressed={active}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Pill({ children, className, style, variant }) {
  return (
    <span
      className={cx('tp-pill', variant && `tp-pill--${variant}`, className)}
      style={style}
    >
      {children}
    </span>
  )
}

export function Badge({ children, className }) {
  return <span className={cx('tp-badge', className)}>{children}</span>
}

/* ── Status pill (semantic alias of Pill) ─────────────────────── */
export function StatusPill({ status = 'neutral', children, className }) {
  return <span className={cx('tp-pill', `tp-pill--${status}`, className)}>{children}</span>
}

/* ── Label (standalone, no input attached) ────────────────────── */
export function Label({ children, className, htmlFor }) {
  return <label className={cx('tp-label', className)} htmlFor={htmlFor}>{children}</label>
}

/* ── Stat (KPI block) ─────────────────────────────────────────── */
export function Stat({ label, value, hint, className }) {
  return (
    <div className={cx('tp-stat', className)}>
      {label && <span className="tp-stat-label">{label}</span>}
      {value !== undefined && <span className="tp-stat-value">{value}</span>}
      {hint && <span className="tp-stat-hint">{hint}</span>}
    </div>
  )
}

/* ── List + List.Row (clean tabular list) ────────────────────── */
export function List({ columns, children, className }) {
  const style = columns ? { '--tp-list-columns': columns } : undefined
  return <div className={cx('tp-list', className)} style={style}>{children}</div>
}

List.Header = function ListHeader({ children, columns, className }) {
  const style = columns ? { gridTemplateColumns: columns } : undefined
  return <div className={cx('tp-list-header', className)} style={style}>{children}</div>
}

List.Row = function ListRow({ children, columns, onClick, selected, className }) {
  const style = columns ? { gridTemplateColumns: columns } : undefined
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e) } } : undefined}
      className={cx('tp-list-row', onClick && 'is-clickable', selected && 'is-selected', className)}
      style={style}
    >
      {children}
    </div>
  )
}

/* ── Divider ───────────────────────────────────────────────────── */
export function Divider({ className }) {
  return <hr className={cx('tp-divider', className)} aria-hidden="true" />
}

/* Re-exports for composites + patterns */
export { default as SportPicker } from './SportPicker'
export { Modal } from './Modal'
export { Tabs } from './Tabs'
export { Toolbar, ToolbarGroup, SearchBox } from './Toolbar'
export {
  PageShell,
  ShellBrand,
  Page,
  PageHeader,
  Section,
  EmptyState,
  WeekNav,
  AthletePicker,
  LayoutToggle,
} from './patterns'
export { TemplateCard } from './TemplateCard'
export { WorkoutCard } from './WorkoutCard'
export { ZoneDot, ZoneBadge } from './Zone'
export { ActivityPill } from './ActivityPill'

/* Design system signature elements */
export { cn } from './cn'
export { GradientText, SectionLabel, InvertedSection } from './signature'
export * as motion from './motion'
