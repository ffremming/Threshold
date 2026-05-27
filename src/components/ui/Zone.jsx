import { cx } from './index'
import './zone.css'

export function ZoneDot({ zone, className }) {
  if (!zone) return null
  return <span className={cx('th-zone-dot', `th-zone-${zone}`, className)} aria-hidden="true" />
}

export function ZoneBadge({ zone, label, className }) {
  if (!zone) return null
  return (
    <span className={cx('th-zone-badge', `th-zone-${zone}`, className)}>
      <span className="th-zone-badge-dot" aria-hidden="true" />
      <span>{label || `S${zone}`}</span>
    </span>
  )
}
