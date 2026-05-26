import { Button, IconButton, Pill } from '../ui'
import SystemIcon from '../SystemIcon'

export default function TestRow({ test, groupLabel, onEdit, onDelete }) {
  return (
    <article className="td-test">
      <header className="td-test-head">
        <div className="td-test-titles">
          <Pill>{groupLabel}</Pill>
          <h4 className="td-test-title">{test.title}</h4>
        </div>
        <div className="td-test-actions">
          <Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button>
          <IconButton size="sm" variant="danger" ariaLabel="Delete test" onClick={onDelete}>
            <SystemIcon name="delete" className="system-icon" />
          </IconButton>
        </div>
      </header>

      <dl className="td-test-meta">
        <MetaItem label="Protocol" value={test.protocol} />
        <MetaItem label="Measurement" value={test.metric} />
        <MetaItem label="Last result" value={test.baseline} />
        <MetaItem label="Target" value={test.target} />
        <MetaItem label="Test date" value={test.scheduledDate} fallback="Not scheduled" />
      </dl>

      {test.notes && <p className="td-test-notes">{test.notes}</p>}
    </article>
  )
}

function MetaItem({ label, value, fallback = 'Not set' }) {
  return (
    <div className="td-meta">
      <dt>{label}</dt>
      <dd>{value || fallback}</dd>
    </div>
  )
}
