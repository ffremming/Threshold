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
    <div className="tp-sport-pop" role="dialog" aria-label="Velg sport">
      <div className="tp-sport-search-row">
        <input
          ref={inputRef}
          type="search"
          className="tp-sport-search"
          placeholder="Søk sport…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {selectedTags.length > 0 && (
          <button type="button" className="tp-sport-clear-btn" onClick={onClear}>
            Tøm ({selectedTags.length})
          </button>
        )}
      </div>

      <div className="tp-sport-list">
        {groupedTags.length === 0 ? (
          <div className="tp-sport-empty">Ingen sporter matcher «{search}».</div>
        ) : (
          groupedTags.map(group => (
            <section key={group.value} className="tp-sport-group">
              <header className="tp-sport-group-head">{group.label}</header>
              <div className="tp-sport-group-items">
                {group.tags.map(tag => {
                  const isSelected = selectedSet.has(tag.value)
                  const count = counts?.get(tag.value) ?? 0
                  return (
                    <button
                      key={tag.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`tp-sport-item${isSelected ? ' is-selected' : ''}`}
                      onClick={() => onToggle(tag.value)}
                    >
                      <span className="tp-sport-item-icon">
                        <ActivityIcon name={tag.icon} className="tag-icon-svg" />
                      </span>
                      <span className="tp-sport-item-label">{tag.label}</span>
                      {counts && (
                        <span className="tp-sport-item-count">{count}</span>
                      )}
                      <span className="tp-sport-item-check" aria-hidden="true">
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
