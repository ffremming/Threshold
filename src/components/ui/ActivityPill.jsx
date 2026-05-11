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
    <span className={cx('tp-activity-pill', size && `tp-activity-pill--${size}`, className)}>
      <span className="tp-activity-pill-icon" aria-hidden="true">
        <ActivityIcon name={iconName} className="tag-icon-svg" />
      </span>
      {text && <span>{text}</span>}
    </span>
  )
}
