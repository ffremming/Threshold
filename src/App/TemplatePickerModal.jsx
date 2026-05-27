import { useMemo, useState } from 'react'
import { EmptyState, Modal, SearchBox, TemplateCard } from '../components/ui'
import { ACTIVITY_TAG_MAP } from '../utils'

function matchesSearch(template, term) {
  if (!term) return true
  const tags = Array.isArray(template.tags) ? template.tags : []
  const haystack = [
    template.title,
    template.description,
    template.category,
    template.type,
    template.activityTag,
    ACTIVITY_TAG_MAP[template.activityTag]?.label,
    ...tags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(term.toLowerCase())
}

export default function TemplatePickerModal({ targetWorkout, templates, loading, onClose, onPick }) {
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(
    () => templates.filter(t => matchesSearch(t, searchQuery.trim())),
    [templates, searchQuery],
  )

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow="Swap session"
      title={`Replace «${targetWorkout.title}»`}
      size="lg"
    >
      {loading ? (
        <EmptyState title="Loading session bank…" />
      ) : templates.length === 0 ? (
        <EmptyState title="Empty session bank" description="You have no sessions in the bank yet." />
      ) : (
        <>
          <div style={{ marginBottom: 'var(--th-space-3)' }}>
            <SearchBox
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search sessions (title, category, type, sport)…"
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              title="No matches"
              description="Try a different search term."
            />
          ) : (
            <div className="ah-template-grid">
              {filtered.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  primaryLabel="Swap to this"
                  onPrimary={() => onPick(template)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
