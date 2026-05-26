import { useState } from 'react'
import { Plus, UserMinus, X } from 'lucide-react'
import { Button, IconButton, Section } from '../ui'

export default function RelationshipSection({
  title,
  subtitle,
  emptyLabel,
  members,
  unassigned,
  addLabel,
  assignTitle,
  noneLeftLabel,
  onAdd,
  onRemove,
}) {
  const [assigning, setAssigning] = useState(false)

  const action = unassigned.length > 0 && !assigning
    ? (
      <Button variant="ghost" size="sm" onClick={() => setAssigning(true)}>
        <Plus size={15} aria-hidden="true" /> {addLabel}
      </Button>
    )
    : null

  return (
    <Section title={`${title} (${members.length})`} subtitle={subtitle} action={action}>
      <div className="tp-um-section-body">
        {members.length === 0 ? (
          <p className="tp-um-email" style={{ margin: 0 }}>{emptyLabel}</p>
        ) : (
          members.map(member => (
            <div key={member.uid} className="tp-rel-row">
              <span className="tp-rel-meta">
                <span className="tp-rel-name">{member.displayName || 'No name'}</span>
                <span className="tp-rel-email">{member.email}</span>
              </span>
              <IconButton
                ariaLabel={`Remove link to ${member.displayName || member.email}`}
                onClick={() => onRemove(member)}
              >
                <UserMinus size={16} aria-hidden="true" />
              </IconButton>
            </div>
          ))
        )}

        {assigning && (
          <div className="tp-um-section-body" style={{ marginTop: 'var(--tp-space-2)' }}>
            <div className="tp-rel-meta" style={{ justifyContent: 'space-between' }}>
              <span className="tp-rel-name">{assignTitle}</span>
              <IconButton ariaLabel="Cancel" onClick={() => setAssigning(false)}>
                <X size={16} aria-hidden="true" />
              </IconButton>
            </div>
            {unassigned.length === 0 ? (
              <p className="tp-rel-email" style={{ margin: 0 }}>{noneLeftLabel}</p>
            ) : (
              unassigned.map(person => (
                <button
                  key={person.uid}
                  type="button"
                  className="tp-rel-row"
                  style={{ cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => { onAdd(person); setAssigning(false) }}
                >
                  <span className="tp-rel-meta">
                    <span className="tp-rel-name">{person.displayName || 'Uten navn'}</span>
                    <span className="tp-rel-email">{person.email}</span>
                  </span>
                  <Plus size={16} aria-hidden="true" style={{ color: 'var(--tp-accent)' }} />
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </Section>
  )
}
