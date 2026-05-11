import { useMemo, useState } from 'react'
import { EmptyState, Input, Modal, TemplateCard } from '../ui'

export default function BankPickerModal({ bankTemplates, onClose, onPick }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return bankTemplates
    return bankTemplates.filter(t =>
      (t.title || '').toLowerCase().includes(term) ||
      (t.category || '').toLowerCase().includes(term) ||
      (t.description || '').toLowerCase().includes(term),
    )
  }, [bankTemplates, search])

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow="Øktbank"
      title="Velg økt fra banken"
      size="lg"
    >
      <div className="tp-pool-picker">
        <Input
          type="search"
          placeholder="Søk i banken…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {filtered.length === 0 ? (
          <EmptyState title="Ingen treff" description="Prøv å justere søket." />
        ) : (
          <div className="tp-pool-picker-grid">
            {filtered.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                primaryLabel="Legg til"
                onPrimary={() => onPick(template)}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
