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
    <Card className="tp-pool-card">
      <div className="tp-pool-card-main">
        <div className="tp-pool-card-titles">
          <h4 className="tp-pool-card-title">{session.title}</h4>
          <div className="tp-pool-card-meta">
            {session.category && <Badge>{session.category}</Badge>}
            {hasStructuredBlocks(session) && (
              <>
                <span className="tp-pool-card-stat">{formatDuration(totals.totalDuration)}</span>
                <span className="tp-pool-card-stat">{formatDistance(totals.totalDistance)}</span>
              </>
            )}
          </div>
          {session.description && (
            <p className="tp-pool-card-desc">{session.description}</p>
          )}
        </div>
      </div>
      <div className="tp-pool-card-actions">
        <IconButton ariaLabel="Rediger" onClick={onEdit}>
          <SystemIcon name="edit" className="system-icon" />
        </IconButton>
        <IconButton ariaLabel="Slett" onClick={onDelete}>
          <SystemIcon name="delete" className="system-icon" />
        </IconButton>
      </div>
    </Card>
  )
}
