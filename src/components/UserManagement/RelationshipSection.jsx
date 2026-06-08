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
  hideEmail = false,
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
      <div className="th-um-section-body">
        {members.length === 0 ? (
          <p className="th-um-email" style={{ margin: 0 }}>{emptyLabel}</p>
        ) : (
          members.map(member => (
            <div key={member.uid} className="th-rel-row">
              <span className="th-rel-meta">
                <span className="th-rel-name">{member.displayName || 'No name'}</span>
                {!hideEmail && <span className="th-rel-email">{member.email}</span>}
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
          <div className="th-um-section-body" style={{ marginTop: 'var(--th-space-2)' }}>
            <div className="th-rel-meta" style={{ justifyContent: 'space-between' }}>
              <span className="th-rel-name">{assignTitle}</span>
              <IconButton ariaLabel="Cancel" onClick={() => setAssigning(false)}>
                <X size={16} aria-hidden="true" />
              </IconButton>
            </div>
            {unassigned.length === 0 ? (
              <p className="th-rel-email" style={{ margin: 0 }}>{noneLeftLabel}</p>
            ) : (
              unassigned.map(person => (
                <button
                  key={person.uid}
                  type="button"
                  className="th-rel-row"
                  style={{ cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => { onAdd(person); setAssigning(false) }}
                >
                  <span className="th-rel-meta">
                    <span className="th-rel-name">{person.displayName || 'Uten navn'}</span>
                    {!hideEmail && <span className="th-rel-email">{person.email}</span>}
                  </span>
                  <Plus size={16} aria-hidden="true" style={{ color: 'var(--th-accent)' }} />
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </Section>
  )
}
