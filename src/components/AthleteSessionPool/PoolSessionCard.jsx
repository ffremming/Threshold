import { Badge, Card, IconButton } from '../ui'
import SystemIcon from '../SystemIcon'
import {
  computeSessionTotals,
  formatDistance,
  formatDuration,
  hasStructuredBlocks,
} from '../../sessionBlocks'

export default function PoolSessionCard({ session, onEdit, onDelete }) {
  const totals = hasStructuredBlocks(session)
    ? computeSessionTotals(session.blocks, session.activityTag)
    : { totalDuration: 0, totalDistance: 0 }
  return (
    <Card className="th-pool-card">
      <div className="th-pool-card-main">
        <div className="th-pool-card-titles">
          <h4 className="th-pool-card-title">{session.title}</h4>
          <div className="th-pool-card-meta">
            {session.category && <Badge>{session.category}</Badge>}
            {hasStructuredBlocks(session) && (
              <>
                <span className="th-pool-card-stat">{formatDuration(totals.totalDuration)}</span>
                <span className="th-pool-card-stat">{formatDistance(totals.totalDistance)}</span>
              </>
            )}
          </div>
          {session.description && (
            <p className="th-pool-card-desc">{session.description}</p>
          )}
        </div>
      </div>
      <div className="th-pool-card-actions">
        <IconButton ariaLabel="Edit" onClick={onEdit}>
          <SystemIcon name="edit" className="system-icon" />
        </IconButton>
        <IconButton ariaLabel="Delete" onClick={onDelete}>
          <SystemIcon name="delete" className="system-icon" />
        </IconButton>
      </div>
    </Card>
  )
}
