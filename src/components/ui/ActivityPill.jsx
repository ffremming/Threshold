import { cx } from './index'
import { ACTIVITY_TAG_MAP } from '../../utils'
import ActivityIcon from '../ActivityIcon'
import './activity-pill.css'

export function ActivityPill({ tag, label, icon, size = 'md', className }) {
  const resolved = typeof tag === 'string' ? ACTIVITY_TAG_MAP[tag] : tag
  const iconName = resolved?.icon || icon || 'annet'
  const text = label || resolved?.label || null
  if (!text && !iconName) return null

  return (
    <span className={cx('th-activity-pill', size && `th-activity-pill--${size}`, className)}>
      <span className="th-activity-pill-icon" aria-hidden="true">
        <ActivityIcon name={iconName} className="tag-icon-svg" />
      </span>
      {text && <span>{text}</span>}
    </span>
  )
}
