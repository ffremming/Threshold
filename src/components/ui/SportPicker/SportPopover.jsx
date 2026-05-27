import { Check } from 'lucide-react'
import ActivityIcon from '../../ActivityIcon'

export default function SportPopover({
  inputRef,
  search,
  setSearch,
  selectedTags,
  groupedTags,
  selectedSet,
  counts,
  onToggle,
  onClear,
}) {
  return (
    <div className="th-sport-pop" role="dialog" aria-label="Select sport">
      <div className="th-sport-search-row">
        <input
          ref={inputRef}
          type="search"
          className="th-sport-search"
          placeholder="Search sport…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {selectedTags.length > 0 && (
          <button type="button" className="th-sport-clear-btn" onClick={onClear}>
            Clear ({selectedTags.length})
          </button>
        )}
      </div>

      <div className="th-sport-list">
        {groupedTags.length === 0 ? (
          <div className="th-sport-empty">No sports match «{search}».</div>
        ) : (
          groupedTags.map(group => (
            <section key={group.value} className="th-sport-group">
              <header className="th-sport-group-head">{group.label}</header>
              <div className="th-sport-group-items">
                {group.tags.map(tag => {
                  const isSelected = selectedSet.has(tag.value)
                  const count = counts?.get(tag.value) ?? 0
                  return (
                    <button
                      key={tag.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`th-sport-item${isSelected ? ' is-selected' : ''}`}
                      onClick={() => onToggle(tag.value)}
                    >
                      <span className="th-sport-item-icon">
                        <ActivityIcon name={tag.icon} className="tag-icon-svg" />
                      </span>
                      <span className="th-sport-item-label">{tag.label}</span>
                      {counts && (
                        <span className="th-sport-item-count">{count}</span>
                      )}
                      <span className="th-sport-item-check" aria-hidden="true">
                        {isSelected && <Check size={16} />}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
