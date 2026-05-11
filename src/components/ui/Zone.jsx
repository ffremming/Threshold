import { cx } from './index'
import './zone.css'

export function ZoneDot({ zone, className }) {
  if (!zone) return null
  return <span className={cx('tp-zone-dot', `tp-zone-${zone}`, className)} aria-hidden="true" />
}

export function ZoneBadge({ zone, label, className }) {
  if (!zone) return null
  return (
    <span className={cx('tp-zone-badge', `tp-zone-${zone}`, className)}>
      <span className="tp-zone-badge-dot" aria-hidden="true" />
      <span>{label || `S${zone}`}</span>
    </span>
  )
}
