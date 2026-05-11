import './layout.css'

function classes(...parts) { return parts.filter(Boolean).join(' ') }

/* ── Page (consistent inner padding + width) ────────────────────── */
export function Page({ children, className, wide = false }) {
  return (
    <div className={classes('tp-page', wide && 'tp-page--wide', className)}>
      {children}
    </div>
  )
}

/* ── PageHeader (title, subtitle, actions, eyebrow) ─────────────── */
export function PageHeader({ eyebrow, title, subtitle, actions, className }) {
  return (
    <header className={classes('tp-pageheader', className)}>
      <div className="tp-pageheader-titles">
        {eyebrow && <span className="tp-pageheader-eyebrow">{eyebrow}</span>}
        {title && <h2 className="tp-pageheader-title">{title}</h2>}
        {subtitle && <p className="tp-pageheader-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="tp-pageheader-actions">{actions}</div>}
    </header>
  )
}

/* ── Section (titled block on a page) ───────────────────────────── */
export function Section({ title, subtitle, action, children, className, padded = true }) {
  return (
    <section className={classes('tp-section', padded && 'tp-section--padded', className)}>
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

/* ── FilterBar (toolbar/filter row with consistent gaps) ────────── */
export function FilterBar({ children, className, sticky = false }) {
  return (
    <div className={classes('tp-filterbar', sticky && 'tp-filterbar--sticky', className)}>
      {children}
    </div>
  )
}

export function FilterGroup({ label, children, className }) {
  return (
    <div className={classes('tp-filtergroup', className)}>
      {label && <span className="tp-filtergroup-label">{label}</span>}
      <div className="tp-filtergroup-items">{children}</div>
    </div>
  )
}

/* ── EmptyState ─────────────────────────────────────────────────── */
export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div className={classes('tp-empty', className)}>
      {icon && <div className="tp-empty-icon" aria-hidden="true">{icon}</div>}
      {title && <h3 className="tp-empty-title">{title}</h3>}
      {description && <p className="tp-empty-desc">{description}</p>}
      {action && <div className="tp-empty-action">{action}</div>}
    </div>
  )
}

/* ── Chip (small pill label/filter) ─────────────────────────────── */
export function Chip({ active, onClick, children, tone, className }) {
  return (
    <button
      type="button"
      className={classes('tp-chip', active && 'is-active', tone && `tp-chip--${tone}`, className)}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}
