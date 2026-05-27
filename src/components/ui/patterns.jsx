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
      'th-shell',
      hasNav && 'th-shell--with-nav',
      hasNav && collapsedNav && 'th-shell--nav-collapsed',
      className,
    )}>
      {hasNav && (
        <>
          <button
            type="button"
            className="th-shell-hamburger"
            aria-label="Show menu"
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
              className="th-shell-nav-scrim"
              aria-label="Close menu"
              onClick={() => setNavOpen(false)}
            />
          )}

          <aside
            className={cx('th-shell-nav', navOpen && 'is-open')}
            aria-label="Hovedmeny"
          >
            <a className="th-shell-nav-brand" href="#top" aria-label="Threshold">
              <span className="th-shell-nav-mark" aria-hidden="true">TH</span>
              <span className="th-shell-nav-wordmark">Threshold</span>
            </a>

            <nav className="th-shell-nav-list">
              {nav.map(item => (
                <button
                  type="button"
                  key={item.key}
                  className={cx('th-shell-nav-item', navActive === item.key && 'is-active')}
                  aria-current={navActive === item.key ? 'page' : undefined}
                  onClick={() => { onNavChange?.(item.key); setNavOpen(false) }}
                >
                  {item.icon && <span className="th-shell-nav-icon" aria-hidden="true">{item.icon}</span>}
                  <span className="th-shell-nav-label">{item.label}</span>
                  {item.badge != null && <span className="th-shell-nav-badge">{item.badge}</span>}
                </button>
              ))}
            </nav>

            {selectedAthlete && (
              <div className="th-shell-nav-context">{selectedAthlete}</div>
            )}

            {account && <div className="th-shell-nav-account">{account}</div>}
          </aside>
        </>
      )}

      <main className="th-shell-body">
        {showHeader && (
          <header className="th-shell-pagehead">
            <div className="th-shell-pagehead-titles">{brand}</div>
            {actions && <div className="th-shell-pagehead-actions">{actions}</div>}
          </header>
        )}

        {banner && <div className="th-shell-banner">{banner}</div>}

        {tabs && (
          <div className="th-shell-tabs">
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
        <IconButton ariaLabel="Back" variant="ghost" onClick={onBack} className="th-shell-back">
          <span aria-hidden="true">‹</span>
        </IconButton>
      )}
      <div className="th-shell-meta">
        {eyebrow && <span className="th-shell-eyebrow">{eyebrow}</span>}
        {title && <h1 className="th-shell-title">{title}</h1>}
      </div>
    </>
  )
}

/* ── Page (consistent inner padding + width) ────────────────────── */
export function Page({ children, wide, className }) {
  return <div className={cx('th-page', wide && 'th-page--wide', className)}>{children}</div>
}

/* ── PageHeader ─────────────────────────────────────────────────── */
export function PageHeader({ eyebrow, title, subtitle, actions, className }) {
  return (
    <header className={cx('th-pageheader', className)}>
      <div className="th-pageheader-titles">
        {eyebrow && <span className="th-pageheader-eyebrow">{eyebrow}</span>}
        {title && <h2 className="th-pageheader-title">{title}</h2>}
        {subtitle && <p className="th-pageheader-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="th-pageheader-actions">{actions}</div>}
    </header>
  )
}

/* ── Section ────────────────────────────────────────────────────── */
export function Section({ title, subtitle, action, padded = true, children, className }) {
  return (
    <section className={cx('th-section', padded && 'th-section--padded', className)}>
      {(title || action) && (
        <header className="th-section-head">
          <div>
            {title && <h3 className="th-section-title">{title}</h3>}
            {subtitle && <p className="th-section-subtitle">{subtitle}</p>}
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
    <div className={cx('th-empty', className)}>
      {icon && <div className="th-empty-icon">{icon}</div>}
      {title && <h3 className="th-empty-title">{title}</h3>}
      {description && <p className="th-empty-desc">{description}</p>}
      {action && <div className="th-empty-action">{action}</div>}
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
  const monthShort = monday.toLocaleString('en', { month: 'short' })
  const monthShortEnd = sunday.toLocaleString('en', { month: 'short' })

  return (
    <div className={cx('th-weeknav', className)}>
      <div className="th-weeknav-titles">
        <button
          type="button"
          className="th-weeknav-eyebrow"
          onClick={onToday}
          title="Go to this week"
        >
          {isThisWeek ? 'This week' : 'Week'}
          {isThisWeek && <span className="th-weeknav-dot" aria-hidden="true" />}
        </button>
        <div className="th-weeknav-headline">
          <button
            className="th-weeknav-arrow"
            onClick={onPrev}
            aria-label="Previous week"
            type="button"
          >‹</button>
          <h1 className="th-weeknav-number th-num">{week}</h1>
          <button
            className="th-weeknav-arrow"
            onClick={onNext}
            aria-label="Next week"
            type="button"
          >›</button>
        </div>
        <span className="th-weeknav-range">
          {monday.getDate()}. {monthShort} – {sunday.getDate()}. {monthShortEnd} {year}
        </span>
      </div>
      {rightSlot && <div className="th-weeknav-controls">{rightSlot}</div>}
    </div>
  )
}

/* ── AthletePicker (simple select wrapper) ──────────────────────── */
export function AthletePicker({ athletes, selectedId, onSelect, currentUserProfile, className }) {
  const items = currentUserProfile && !athletes.some(a => a.uid === currentUserProfile.uid)
    ? [{ uid: currentUserProfile.uid, displayName: `${currentUserProfile.displayName} (you)` }, ...athletes]
    : athletes
  return (
    <select
      className={cx('th-select th-athlete-picker', className)}
      value={selectedId || ''}
      onChange={e => onSelect(e.target.value || null)}
    >
      <option value="">Select athlete…</option>
      {items.map(athlete => (
        <option key={athlete.uid} value={athlete.uid}>{athlete.displayName}</option>
      ))}
    </select>
  )
}

/* ── LayoutToggle (calendar / list) ─────────────────────────────── */
export function LayoutToggle({ value, onChange, className }) {
  return (
    <div className={cx('th-layout-toggle', className)} role="group" aria-label="Visningsform">
      <button
        type="button"
        className={cx('th-layout-toggle-btn', value === 'calendar' && 'is-active')}
        onClick={() => onChange('calendar')}
        aria-pressed={value === 'calendar'}
      >Kalender</button>
      <button
        type="button"
        className={cx('th-layout-toggle-btn', value === 'list' && 'is-active')}
        onClick={() => onChange('list')}
        aria-pressed={value === 'list'}
      >Liste</button>
    </div>
  )
}
