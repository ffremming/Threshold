import { useMemo, useState } from 'react'
import { ACTIVITY_TAGS, ACTIVITY_TAG_MAP } from '../../utils'
import ActivityIcon from '../ActivityIcon'

const PINNED_ACTIVITY_TAGS = ['run', 'strength']

export default function ActivityPicker({ selected, onSelect }) {
  const [query, setQuery] = useState('')

  const pinned = useMemo(() => (
    PINNED_ACTIVITY_TAGS.map(value => ACTIVITY_TAG_MAP[value]).filter(Boolean)
  ), [])

  const searchResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return []
    return ACTIVITY_TAGS
      .filter(tag => !PINNED_ACTIVITY_TAGS.includes(tag.value))
      .filter(tag => (
        tag.label.toLowerCase().includes(trimmed) ||
        tag.value.toLowerCase().includes(trimmed)
      ))
      .slice(0, 8)
  }, [query])

  const selectedOutsidePinned = selected && !PINNED_ACTIVITY_TAGS.includes(selected)
    ? ACTIVITY_TAG_MAP[selected]
    : null

  return (
    <div className="activity-picker">
      <div className="activity-picker-chips">
        {pinned.map(tag => (
          <ActivityChip key={tag.value} tag={tag} active={selected === tag.value} onClick={() => onSelect(tag.value)} />
        ))}
        {selectedOutsidePinned && (
          <ActivityChip tag={selectedOutsidePinned} active onClick={() => onSelect(selectedOutsidePinned.value)} />
        )}
      </div>
      <input
        type="search"
        className="activity-picker-search"
        placeholder="Søk etter annen aktivitet…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {searchResults.length > 0 && (
        <div className="activity-picker-results">
          {searchResults.map(tag => (
            <button
              key={tag.value}
              type="button"
              className="activity-picker-result"
              onClick={() => { onSelect(tag.value); setQuery('') }}
            >
              <span className="activity-tag-icon"><ActivityIcon name={tag.icon} className="tag-icon-svg" /></span>
              <span>{tag.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ActivityChip({ tag, active, onClick }) {
  return (
    <button
      type="button"
      className={`activity-tag-btn${active ? ' active' : ''}`}
      style={{ '--tag-color': tag.color, '--tag-bg': tag.bg }}
      onClick={onClick}
    >
      <span className="activity-tag-icon"><ActivityIcon name={tag.icon} className="tag-icon-svg" /></span>
      <span>{tag.label}</span>
    </button>
  )
}
