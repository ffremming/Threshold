import { useEffect, useMemo, useRef, useState } from 'react'
import { ACTIVITY_GROUPS, ACTIVITY_TAGS, ACTIVITY_TAG_MAP } from '../../../utils'
import SportTrigger from './SportTrigger'
import SportPopover from './SportPopover'
import '../sport-picker.css'

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
      <SportTrigger
        open={open}
        selectedTags={selectedTags}
        triggerLabel={triggerLabel}
        onToggleOpen={() => setOpen(o => !o)}
        onClear={clearAll}
      />
      {open && (
        <SportPopover
          inputRef={inputRef}
          search={search}
          setSearch={setSearch}
          selectedTags={selectedTags}
          groupedTags={groupedTags}
          selectedSet={selectedSet}
          counts={counts}
          onToggle={toggle}
          onClear={clearAll}
        />
      )}
    </div>
  )
}
