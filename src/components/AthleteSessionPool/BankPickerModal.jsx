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
      eyebrow="Session bank"
      title="Select session from the bank"
      size="lg"
    >
      <div className="tp-pool-picker">
        <Input
          type="search"
          placeholder="Search the bank…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {filtered.length === 0 ? (
          <EmptyState title="No matches" description="Try adjusting your search." />
        ) : (
          <div className="tp-pool-picker-grid">
            {filtered.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                primaryLabel="Add"
                onPrimary={() => onPick(template)}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
