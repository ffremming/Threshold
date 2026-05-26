import TemplateDragCard from './TemplateDragCard'

export default function SessionColumn({ title, subtitle, sessions, onDragStart, onDragEnd, onAddTemplate, onEditTemplate, onDeleteTemplate }) {
  return (
    <section className="pb-column">
      <header className="pb-column-head">
        <h3 className="pb-column-title">{title}</h3>
        <span className="pb-column-count">{subtitle}</span>
      </header>

      {sessions.length === 0 ? (
        <div className="pb-empty-copy">No sessions in this column.</div>
      ) : (
        <div className="pb-card-list">
          {sessions.map(session => (
            <TemplateDragCard
              key={session.id}
              session={session}
              onDragStart={event => onDragStart(session, event)}
              onDragEnd={onDragEnd}
              onAdd={onAddTemplate}
              onEdit={onEditTemplate}
              onDelete={onDeleteTemplate}
            />
          ))}
        </div>
      )}
    </section>
  )
}
