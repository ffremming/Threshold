import SystemIcon from '../SystemIcon'

export default function RelationshipSection({
  title,
  emptyLabel,
  members,
  unassigned,
  assigningCoach,
  setAssigningCoach,
  onRemove,
  onAdd,
  assignTitle,
  addLabel,
}) {
  return (
    <div className="relationship-section">
      <h3 className="relationship-title">{title} ({members.length})</h3>
      {members.length === 0 ? (
        <div className="empty-state-small">{emptyLabel}</div>
      ) : (
        <div className="relationship-list">
          {members.map(member => (
            <div key={member.uid} className="relationship-item">
              <div className="relationship-info">
                <span className="relationship-name">{member.displayName}</span>
                <span className="relationship-email">{member.email}</span>
              </div>
              <button
                className="btn-remove-rel"
                onClick={() => onRemove(member)}
                title="Fjern kobling"
              >
                <SystemIcon name="unassign" className="button-icon" />
                Fjern
              </button>
            </div>
          ))}
        </div>
      )}

      {unassigned.length > 0 && (
        assigningCoach ? (
          <div className="assign-section">
            <h4 className="assign-title">{assignTitle}</h4>
            <div className="assign-list">
              {unassigned.map(person => (
                <button
                  key={person.uid}
                  className="btn-assign"
                  onClick={() => onAdd(person)}
                >
                  + {person.displayName}
                </button>
              ))}
            </div>
            <button className="btn-cancel-small" onClick={() => setAssigningCoach(false)}>
              Avbryt
            </button>
          </div>
        ) : (
          <button className="btn-add-rel" onClick={() => setAssigningCoach(true)}>
            {addLabel}
          </button>
        )
      )}
    </div>
  )
}
