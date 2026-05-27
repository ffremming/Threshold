import ActivityIcon from '../../ActivityIcon'

export default function SportTrigger({ open, selectedTags, triggerLabel, onToggleOpen, onClear }) {
  return (
    <button
      type="button"
      className={`th-sport-trigger${selectedTags.length ? ' is-active' : ''}`}
      onClick={onToggleOpen}
      aria-haspopup="listbox"
      aria-expanded={open}
    >
      <span className="th-sport-trigger-icons" aria-hidden="true">
        {selectedTags.length === 0 && (
          <span className="th-sport-trigger-glyph"><ActivityIcon name="annet" className="tag-icon-svg" /></span>
        )}
        {selectedTags.slice(0, 3).map(tag => (
          <span key={tag.value} className="th-sport-trigger-glyph">
            <ActivityIcon name={tag.icon} className="tag-icon-svg" />
          </span>
        ))}
      </span>
      <span className="th-sport-trigger-label">{triggerLabel}</span>
      {selectedTags.length > 0 && (
        <span
          role="button"
          tabIndex={0}
          className="th-sport-trigger-clear"
          onClick={e => { e.stopPropagation(); onClear() }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              onClear()
            }
          }}
          aria-label="Clear sport filter"
        >
          ×
        </span>
      )}
      <span className="th-sport-trigger-caret" aria-hidden="true">▾</span>
    </button>
  )
}
