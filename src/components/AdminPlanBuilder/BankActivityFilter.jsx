import { useEffect, useMemo, useState } from 'react'
import { ACTIVITY_TAGS, ACTIVITY_TAG_MAP } from '../../utils'
import ActivityIcon from '../ActivityIcon'
import { PINNED_ACTIVITY_TAGS } from './constants'

export default function BankActivityFilter({
  visibleActivities,
  activeTagFilter,
  setActiveTagFilter,
  onAddActivity,
  onRemoveActivity,
}) {
  const [showActivityPicker, setShowActivityPicker] = useState(false)

  const visibleTags = useMemo(() => (
    visibleActivities
      .map(value => ACTIVITY_TAG_MAP[value])
      .filter(Boolean)
  ), [visibleActivities])

  const hiddenTags = useMemo(() => (
    ACTIVITY_TAGS.filter(tag => !visibleActivities.includes(tag.value))
  ), [visibleActivities])

  useEffect(() => {
    if (!showActivityPicker) return
    function handleDocClick(event) {
      if (!event.target.closest?.('.pb-activity-picker')) {
        setShowActivityPicker(false)
      }
    }
    document.addEventListener('mousedown', handleDocClick)
    return () => document.removeEventListener('mousedown', handleDocClick)
  }, [showActivityPicker])

  return (
    <div className="pb-filter-row">
      <button
        type="button"
        className={`pb-filter-chip${!activeTagFilter ? ' is-active' : ''}`}
        onClick={() => setActiveTagFilter(null)}
      >Alle</button>
      {visibleTags.map(tag => {
        const isPinned = PINNED_ACTIVITY_TAGS.includes(tag.value)
        return (
          <span key={tag.value} className="pb-filter-chip-wrap">
            <button
              type="button"
              className={`pb-filter-chip${activeTagFilter === tag.value ? ' is-active' : ''}`}
              onClick={() => setActiveTagFilter(activeTagFilter === tag.value ? null : tag.value)}
            >
              <span className="pb-filter-icon" aria-hidden="true"><ActivityIcon name={tag.icon} className="tag-icon-svg" /></span>
              <span>{tag.label}</span>
            </button>
            {!isPinned && onRemoveActivity ? (
              <button
                type="button"
                className="pb-filter-chip-remove"
                onClick={() => onRemoveActivity(tag.value)}
                aria-label={`Skjul ${tag.label}`}
                title={`Skjul ${tag.label}`}
              >×</button>
            ) : null}
          </span>
        )
      })}
      {hiddenTags.length > 0 && onAddActivity ? (
        <div className="pb-activity-picker">
          <button
            type="button"
            className="pb-filter-chip pb-filter-chip--add"
            onClick={() => setShowActivityPicker(value => !value)}
            aria-expanded={showActivityPicker}
          >+ Aktivitet</button>
          {showActivityPicker ? (
            <div className="pb-activity-menu" role="menu">
              {hiddenTags.map(tag => (
                <button
                  key={tag.value}
                  type="button"
                  role="menuitem"
                  className="pb-activity-menu-item"
                  onClick={() => {
                    onAddActivity(tag.value)
                    setShowActivityPicker(false)
                  }}
                >
                  <span className="pb-filter-icon" aria-hidden="true"><ActivityIcon name={tag.icon} className="tag-icon-svg" /></span>
                  <span>{tag.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
