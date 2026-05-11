import { useEffect, useMemo, useRef, useState } from 'react'
import { ACTIVITY_GROUPS, ACTIVITY_TAGS, ACTIVITY_TAG_MAP } from '../../utils'
import ActivityIcon from '../ActivityIcon'
import './sport-picker.css'

/* ────────────────────────────────────────────────────────────────────
 * SportPicker
 *
 * Searchable dropdown that groups sports by category. Multi-select.
 * Trigger looks like a chip-row, click opens a popover with search +
 * grouped list. Counts (optional) are shown per sport.
 *
 * Props:
 *   value         Array<string>          selected sport values
 *   onChange      (Array<string>) => void
 *   counts        Map<string, number>?   optional counts per sport
 *   limitToValues string[]?              if set, only show sports whose
 *                                        value is in this list (e.g. only
 *                                        sports actually present in data)
 *   placeholder   string?
 * ──────────────────────────────────────────────────────────────────── */

export default function SportPicker({
  value = [],
  onChange,
  counts,
  limitToValues,
  placeholder = 'Alle sporter',
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const rootRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function onDocClick(e) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
    else setSearch('')
  }, [open])

  const visibleTags = useMemo(() => {
    let tags = ACTIVITY_TAGS
    if (limitToValues && limitToValues.length) {
      const allowed = new Set(limitToValues)
      tags = tags.filter(t => allowed.has(t.value) || value.includes(t.value))
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase()
      tags = tags.filter(t => t.label.toLowerCase().includes(term))
    }
    return tags
  }, [search, limitToValues, value])

  const groupedTags = useMemo(() => {
    return ACTIVITY_GROUPS.map(group => ({
      ...group,
      tags: visibleTags.filter(t => (t.group || 'other') === group.value),
    })).filter(g => g.tags.length > 0)
  }, [visibleTags])

  const selectedSet = useMemo(() => new Set(value), [value])

  function toggle(tagValue) {
    if (selectedSet.has(tagValue)) {
      onChange(value.filter(v => v !== tagValue))
    } else {
      onChange([...value, tagValue])
    }
  }

  function clearAll() {
    onChange([])
  }

  const selectedTags = value
    .map(v => ACTIVITY_TAG_MAP[v])
    .filter(Boolean)

  const triggerLabel = selectedTags.length === 0
    ? placeholder
    : selectedTags.length === 1
      ? selectedTags[0].label
      : `${selectedTags.length} sporter`

  return (
    <div className="tp-sport-picker" ref={rootRef}>
      <button
        type="button"
        className={`tp-sport-trigger${selectedTags.length ? ' is-active' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="tp-sport-trigger-icons" aria-hidden="true">
          {selectedTags.length === 0 && (
            <span className="tp-sport-trigger-glyph"><ActivityIcon name="annet" className="tag-icon-svg" /></span>
          )}
          {selectedTags.slice(0, 3).map(tag => (
            <span key={tag.value} className="tp-sport-trigger-glyph">
              <ActivityIcon name={tag.icon} className="tag-icon-svg" />
            </span>
          ))}
        </span>
        <span className="tp-sport-trigger-label">{triggerLabel}</span>
        {selectedTags.length > 0 && (
          <span
            role="button"
            tabIndex={0}
            className="tp-sport-trigger-clear"
            onClick={e => { e.stopPropagation(); clearAll() }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                clearAll()
              }
            }}
            aria-label="Tøm sport-filter"
          >
            ×
          </span>
        )}
        <span className="tp-sport-trigger-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
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
              <button type="button" className="tp-sport-clear-btn" onClick={clearAll}>
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
                          onClick={() => toggle(tag.value)}
                        >
                          <span className="tp-sport-item-icon">
                            <ActivityIcon name={tag.icon} className="tag-icon-svg" />
                          </span>
                          <span className="tp-sport-item-label">{tag.label}</span>
                          {counts && (
                            <span className="tp-sport-item-count">{count}</span>
                          )}
                          <span className="tp-sport-item-check" aria-hidden="true">
                            {isSelected ? '✓' : ''}
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
      )}
    </div>
  )
}
