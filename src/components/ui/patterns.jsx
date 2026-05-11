import { cx, IconButton } from './index'
import { Tabs } from './Tabs'
import './patterns.css'

/* ── PageShell: sticky brand + tab nav + body ───────────────────── */
export function PageShell({ brand, actions, banner, tabs, tabValue, onTabChange, children, className }) {
  return (
    <div className={cx('tp-shell', className)}>
      <header className="tp-shell-header">
        <div className="tp-shell-header-row">
          <div className="tp-shell-brand">{brand}</div>
          {actions && <div className="tp-shell-actions">{actions}</div>}
        </div>

        {banner && <div className="tp-shell-banner">{banner}</div>}

        {tabs && (
          <div className="tp-shell-tabs">
            <Tabs items={tabs} value={tabValue} onChange={onTabChange} />
          </div>
        )}
      </header>

      <main className="tp-shell-body">{children}</main>
    </div>
  )
}

export function ShellBrand({ onBack, eyebrow, title, mark = 'TP' }) {
  return (
    <>
      {onBack && (
        <IconButton ariaLabel="Tilbake" variant="ghost" onClick={onBack}>
          <span aria-hidden="true">‹</span>
        </IconButton>
      )}
      <div className="tp-shell-mark" aria-hidden="true">{mark}</div>
      <div className="tp-shell-meta">
        {eyebrow && <span className="tp-shell-eyebrow">{eyebrow}</span>}
        {title && <span className="tp-shell-title">{title}</span>}
      </div>
    </>
  )
}

/* ── Page (consistent inner padding + width) ────────────────────── */
export function Page({ children, wide, className }) {
  return <div className={cx('tp-page', wide && 'tp-page--wide', className)}>{children}</div>
}

/* ── PageHeader ─────────────────────────────────────────────────── */
export function PageHeader({ eyebrow, title, subtitle, actions, className }) {
  return (
    <header className={cx('tp-pageheader', className)}>
      <div className="tp-pageheader-titles">
        {eyebrow && <span className="tp-pageheader-eyebrow">{eyebrow}</span>}
        {title && <h2 className="tp-pageheader-title">{title}</h2>}
        {subtitle && <p className="tp-pageheader-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="tp-pageheader-actions">{actions}</div>}
    </header>
  )
}

/* ── Section ────────────────────────────────────────────────────── */
export function Section({ title, subtitle, action, padded = true, children, className }) {
  return (
    <section className={cx('tp-section', padded && 'tp-section--padded', className)}>
      {(title || action) && (
        <header className="tp-section-head">
          <div>
            {title && <h3 className="tp-section-title">{title}</h3>}
            {subtitle && <p className="tp-section-subtitle">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

/* ── EmptyState ─────────────────────────────────────────────────── */
export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div className={cx('tp-empty', className)}>
      {icon && <div className="tp-empty-icon">{icon}</div>}
      {title && <h3 className="tp-empty-title">{title}</h3>}
      {description && <p className="tp-empty-desc">{description}</p>}
      {action && <div className="tp-empty-action">{action}</div>}
    </div>
  )
}

/* ── WeekNav ────────────────────────────────────────────────────── */
export function WeekNav({
  week,
  year,
  monday,
  sunday,
  isThisWeek,
  onPrev,
  onNext,
  onToday,
  rightSlot,
  className,
}) {
  const monthShort = monday.toLocaleString('nb', { month: 'short' })
  const monthShortEnd = sunday.toLocaleString('nb', { month: 'short' })

  return (
    <div className={cx('tp-weeknav', className)}>
      <button className="tp-weeknav-arrow" onClick={onPrev} aria-label="Forrige uke">‹</button>
      <button className="tp-weeknav-info" onClick={onToday} title="Gå til dagens uke">
        <span className="tp-weeknav-eyebrow">{isThisWeek ? 'Denne uken' : 'Uke'}</span>
        <span className="tp-weeknav-number tp-num">
          {week}
          {isThisWeek && <span className="tp-weeknav-dot" aria-hidden="true" />}
        </span>
        <span className="tp-weeknav-range">
          {monday.getDate()}. {monthShort} – {sunday.getDate()}. {monthShortEnd} {year}
        </span>
      </button>
      <button className="tp-weeknav-arrow" onClick={onNext} aria-label="Neste uke">›</button>
      {rightSlot}
    </div>
  )
}

/* ── AthletePicker (simple select wrapper) ──────────────────────── */
export function AthletePicker({ athletes, selectedId, onSelect, currentUserProfile, className }) {
  const items = currentUserProfile && !athletes.some(a => a.uid === currentUserProfile.uid)
    ? [{ uid: currentUserProfile.uid, displayName: `${currentUserProfile.displayName} (deg)` }, ...athletes]
    : athletes
  return (
    <select
      className={cx('tp-select tp-athlete-picker', className)}
      value={selectedId || ''}
      onChange={e => onSelect(e.target.value || null)}
    >
      <option value="">Velg utøver…</option>
      {items.map(athlete => (
        <option key={athlete.uid} value={athlete.uid}>{athlete.displayName}</option>
      ))}
    </select>
  )
}

/* ── LayoutToggle (calendar / list) ─────────────────────────────── */
export function LayoutToggle({ value, onChange, className }) {
  return (
    <div className={cx('tp-layout-toggle', className)} role="group" aria-label="Visningsform">
      <button
        type="button"
        className={cx('tp-layout-toggle-btn', value === 'calendar' && 'is-active')}
        onClick={() => onChange('calendar')}
        aria-pressed={value === 'calendar'}
      >Kalender</button>
      <button
        type="button"
        className={cx('tp-layout-toggle-btn', value === 'list' && 'is-active')}
        onClick={() => onChange('list')}
        aria-pressed={value === 'list'}
      >Liste</button>
    </div>
  )
}
