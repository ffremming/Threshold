import './layout.css'

function classes(...parts) { return parts.filter(Boolean).join(' ') }

/* ── Page (consistent inner padding + width) ────────────────────── */
export function Page({ children, className, wide = false }) {
  return (
    <div className={classes('th-page', wide && 'th-page--wide', className)}>
      {children}
    </div>
  )
}

/* ── PageHeader (title, subtitle, actions, eyebrow) ─────────────── */
export function PageHeader({ eyebrow, title, subtitle, actions, className }) {
  return (
    <header className={classes('th-pageheader', className)}>
      <div className="th-pageheader-titles">
        {eyebrow && <span className="th-pageheader-eyebrow">{eyebrow}</span>}
        {title && <h2 className="th-pageheader-title">{title}</h2>}
        {subtitle && <p className="th-pageheader-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="th-pageheader-actions">{actions}</div>}
    </header>
  )
}

/* ── Section (titled block on a page) ───────────────────────────── */
export function Section({ title, subtitle, action, children, className, padded = true }) {
  return (
    <section className={classes('th-section', padded && 'th-section--padded', className)}>
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

/* ── FilterBar (toolbar/filter row with consistent gaps) ────────── */
export function FilterBar({ children, className, sticky = false }) {
  return (
    <div className={classes('th-filterbar', sticky && 'th-filterbar--sticky', className)}>
      {children}
    </div>
  )
}

export function FilterGroup({ label, children, className }) {
  return (
    <div className={classes('th-filtergroup', className)}>
      {label && <span className="th-filtergroup-label">{label}</span>}
      <div className="th-filtergroup-items">{children}</div>
    </div>
  )
}

/* ── EmptyState ─────────────────────────────────────────────────── */
export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div className={classes('th-empty', className)}>
      {icon && <div className="th-empty-icon" aria-hidden="true">{icon}</div>}
      {title && <h3 className="th-empty-title">{title}</h3>}
      {description && <p className="th-empty-desc">{description}</p>}
      {action && <div className="th-empty-action">{action}</div>}
    </div>
  )
}

/* ── Chip (small pill label/filter) ─────────────────────────────── */
export function Chip({ active, onClick, children, tone, className }) {
  return (
    <button
      type="button"
      className={classes('th-chip', active && 'is-active', tone && `th-chip--${tone}`, className)}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}
