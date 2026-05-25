import { useState } from 'react'
import { cx, IconButton } from './index'
import { Tabs } from './Tabs'
import './patterns.css'

/* ────────────────────────────────────────────────────────────────────
 * PageShell — left sidebar (logo + primary nav + account) + main area.
 *
 * Renders as a single chrome surface (the sidebar) and lets every page
 * own its own content area. The legacy `brand` / `actions` / `tabs`
 * props remain supported and render inline as a page header above the
 * content — no separate horizontal bar.
 *
 * Mobile: sidebar collapses off-canvas behind a hamburger toggle.
 * ──────────────────────────────────────────────────────────────────── */
export function PageShell({
  brand,
  actions,
  banner,
  tabs,
  tabValue,
  onTabChange,
  nav,
  navActive,
  onNavChange,
  account,
  selectedAthlete,
  collapsedNav,
  children,
  className,
}) {
  const [navOpen, setNavOpen] = useState(false)
  const hasNav = Array.isArray(nav) && nav.length > 0
  const showHeader = brand || actions || tabs || banner

  return (
    <div className={cx(
      'tp-shell',
      hasNav && 'tp-shell--with-nav',
      hasNav && collapsedNav && 'tp-shell--nav-collapsed',
      className,
    )}>
      {hasNav && (
        <>
          <button
            type="button"
            className="tp-shell-hamburger"
            aria-label="Vis meny"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(v => !v)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>

          {navOpen && (
            <button
              type="button"
              className="tp-shell-nav-scrim"
              aria-label="Lukk meny"
              onClick={() => setNavOpen(false)}
            />
          )}

          <aside
            className={cx('tp-shell-nav', navOpen && 'is-open')}
            aria-label="Hovedmeny"
          >
            <a className="tp-shell-nav-brand" href="#top" aria-label="Training Planner">
              <span className="tp-shell-nav-mark" aria-hidden="true">TP</span>
              <span className="tp-shell-nav-wordmark">Training Planner</span>
            </a>

            <nav className="tp-shell-nav-list">
              {nav.map(item => (
                <button
                  type="button"
                  key={item.key}
                  className={cx('tp-shell-nav-item', navActive === item.key && 'is-active')}
                  aria-current={navActive === item.key ? 'page' : undefined}
                  onClick={() => { onNavChange?.(item.key); setNavOpen(false) }}
                >
                  {item.icon && <span className="tp-shell-nav-icon" aria-hidden="true">{item.icon}</span>}
                  <span className="tp-shell-nav-label">{item.label}</span>
                  {item.badge != null && <span className="tp-shell-nav-badge">{item.badge}</span>}
                </button>
              ))}
            </nav>

            {selectedAthlete && (
              <div className="tp-shell-nav-context">{selectedAthlete}</div>
            )}

            {account && <div className="tp-shell-nav-account">{account}</div>}
          </aside>
        </>
      )}

      <main className="tp-shell-body">
        {showHeader && (
          <header className="tp-shell-pagehead">
            <div className="tp-shell-pagehead-titles">{brand}</div>
            {actions && <div className="tp-shell-pagehead-actions">{actions}</div>}
          </header>
        )}

        {banner && <div className="tp-shell-banner">{banner}</div>}

        {tabs && (
          <div className="tp-shell-tabs">
            <Tabs items={tabs} value={tabValue} onChange={onTabChange} />
          </div>
        )}

        {children}
      </main>
    </div>
  )
}

/* ── ShellBrand: inline page-heading bundle (back arrow + eyebrow + title)
 * Lives inside the page content area, not in the chrome.  Kept for
 * back-compat with every PageShell call site. */
export function ShellBrand({ onBack, eyebrow, title }) {
  return (
    <>
      {onBack && (
        <IconButton ariaLabel="Tilbake" variant="ghost" onClick={onBack} className="tp-shell-back">
          <span aria-hidden="true">‹</span>
        </IconButton>
      )}
      <div className="tp-shell-meta">
        {eyebrow && <span className="tp-shell-eyebrow">{eyebrow}</span>}
        {title && <h1 className="tp-shell-title">{title}</h1>}
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

/* ── WeekNav ─────────────────────────────────────────────────────
 * Dissolved into the page heading: large display type, no card,
 * no border. Reads as content. Right-side slot holds inline ghost
 * controls (layout toggle, overview toggle, etc.). */
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
      <div className="tp-weeknav-titles">
        <button
          type="button"
          className="tp-weeknav-eyebrow"
          onClick={onToday}
          title="Gå til denne uken"
        >
          {isThisWeek ? 'Denne uken' : 'Uke'}
          {isThisWeek && <span className="tp-weeknav-dot" aria-hidden="true" />}
        </button>
        <div className="tp-weeknav-headline">
          <button
            className="tp-weeknav-arrow"
            onClick={onPrev}
            aria-label="Forrige uke"
            type="button"
          >‹</button>
          <h1 className="tp-weeknav-number tp-num">{week}</h1>
          <button
            className="tp-weeknav-arrow"
            onClick={onNext}
            aria-label="Neste uke"
            type="button"
          >›</button>
        </div>
        <span className="tp-weeknav-range">
          {monday.getDate()}. {monthShort} – {sunday.getDate()}. {monthShortEnd} {year}
        </span>
      </div>
      {rightSlot && <div className="tp-weeknav-controls">{rightSlot}</div>}
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
