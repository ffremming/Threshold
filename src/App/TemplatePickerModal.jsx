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
      eyebrow="Bytt økt"
      title={`Erstatt «${targetWorkout.title}»`}
      size="lg"
    >
      {loading ? (
        <EmptyState title="Laster øktbank…" />
      ) : templates.length === 0 ? (
        <EmptyState title="Tom øktbank" description="Du har ingen økter i banken ennå." />
      ) : (
        <>
          <div style={{ marginBottom: 'var(--tp-space-3)' }}>
            <SearchBox
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Søk økter (tittel, kategori, type, sport)…"
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              title="Ingen treff"
              description="Prøv et annet søkeord."
            />
          ) : (
            <div className="ah-template-grid">
              {filtered.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  primaryLabel="Bytt til denne"
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
