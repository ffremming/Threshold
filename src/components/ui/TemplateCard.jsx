import { cx, Button, IconButton, Pill } from './index'
import { ZoneBadge } from './Zone'
import { ActivityPill } from './ActivityPill'
import {
  ACTIVITY_TAG_MAP,
  formatIntensityZoneLabel,
  normalizeIntensityZones,
  normalizeIntensityZone,
  workoutHasZones,
} from '../../utils'
import SystemIcon from '../SystemIcon'
import './template-card.css'

/* ── TemplateCard
 * Single template tile used in:
 *   - Library (global)          — primaryAction = "+ Add to my session bank"
 *   - Session bank (coach's)    — primaryAction = "Edit" + delete
 *   - Library (admin)           — also shows edit/delete in library
 * ─────────────────────────────────────────────────────────────────── */
export function TemplateCard({
  template,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryVariant,
  primaryActive,
  secondaryLabel,
  onSecondary,
  secondaryDisabled,
  onEdit,
  onDelete,
  pinned,
  className,
  draggable = false,
  onDragStart,
  onDragEnd,
}) {
  const tag = template.activityTag ? ACTIVITY_TAG_MAP[template.activityTag] : null
  const showZone = workoutHasZones(template.activityTag)
  const zone = showZone ? normalizeIntensityZone(template.type, template.intensityZone) : null
  const intensityLabel = showZone
    ? formatIntensityZoneLabel(normalizeIntensityZones(template.type, template.intensityZone))
    : null

  return (
    <article
      className={cx('th-template-card', className)}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <header className="th-template-card-head">
        <div className="th-template-card-titles">
          <h3 className="th-template-card-title">{template.title}</h3>
          <div className="th-template-card-meta">
            {tag && <ActivityPill tag={tag} />}
          </div>
        </div>
        {pinned && <span className="th-template-card-pinned" aria-hidden="true">●</span>}
      </header>

      {template.description && (
        <p className="th-template-card-desc">{template.description}</p>
      )}

      {(zone || template.distance) && (
        <div className="th-template-card-tags">
          {zone && <ZoneBadge zone={zone} label={intensityLabel} />}
          {template.distance && <Pill>{template.distance}</Pill>}
        </div>
      )}

      <footer className="th-template-card-foot">
        {onPrimary && (
          <Button
            block
            size="sm"
            variant={primaryVariant}
            onClick={onPrimary}
            disabled={primaryDisabled}
            className={cx(primaryActive && 'is-active')}
          >
            {primaryLabel}
          </Button>
        )}
        {onSecondary && (
          <Button
            block
            size="sm"
            variant="secondary"
            onClick={onSecondary}
            disabled={secondaryDisabled}
            className="th-template-card-secondary"
          >
            {secondaryLabel}
          </Button>
        )}
        <div className="th-template-card-icon-actions">
          {onEdit && (
            <IconButton ariaLabel="Rediger" onClick={onEdit} size="sm">
              <SystemIcon name="edit" className="system-icon" />
            </IconButton>
          )}
          {onDelete && (
            <IconButton ariaLabel="Delete" onClick={onDelete} size="sm" variant="danger">
              <SystemIcon name="delete" className="system-icon" />
            </IconButton>
          )}
        </div>
      </footer>
    </article>
  )
}
