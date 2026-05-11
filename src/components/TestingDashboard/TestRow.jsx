import { Button, IconButton, Pill } from '../ui'

export default function TestRow({ test, groupLabel, onEdit, onDelete }) {
  return (
    <article className="td-test">
      <header className="td-test-head">
        <div className="td-test-titles">
          <Pill>{groupLabel}</Pill>
          <h4 className="td-test-title">{test.title}</h4>
        </div>
        <div className="td-test-actions">
          <Button size="sm" variant="secondary" onClick={onEdit}>Rediger</Button>
          <IconButton size="sm" variant="danger" ariaLabel="Slett" onClick={onDelete}>×</IconButton>
        </div>
      </header>

      <dl className="td-test-meta">
        <MetaItem label="Protokoll" value={test.protocol} />
        <MetaItem label="Målepunkt" value={test.metric} />
        <MetaItem label="Siste resultat" value={test.baseline} />
        <MetaItem label="Mål" value={test.target} />
        <MetaItem label="Testdato" value={test.scheduledDate} fallback="Ikke planlagt" />
      </dl>

      {test.notes && <p className="td-test-notes">{test.notes}</p>}
    </article>
  )
}

function MetaItem({ label, value, fallback = 'Ikke satt' }) {
  return (
    <div className="td-meta">
      <dt>{label}</dt>
      <dd>{value || fallback}</dd>
    </div>
  )
}
