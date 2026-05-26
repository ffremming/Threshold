import { cx, Button, IconButton, Pill } from './index'
import { ZoneBadge } from './Zone'
import { ActivityPill } from './ActivityPill'
import {
  ACTIVITY_TAG_MAP,
  formatIntensityZoneLabel,
  normalizeIntensityZones,
  normalizeIntensityZone,
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
  const zone = normalizeIntensityZone(template.type, template.intensityZone)
  const intensityLabel = formatIntensityZoneLabel(normalizeIntensityZones(template.type, template.intensityZone))

  return (
    <article
      className={cx('tp-template-card', className)}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <header className="tp-template-card-head">
        <div className="tp-template-card-titles">
          <h3 className="tp-template-card-title">{template.title}</h3>
          <div className="tp-template-card-meta">
            {template.category && <Pill>{template.category}</Pill>}
            {tag && <ActivityPill tag={tag} />}
          </div>
        </div>
        {pinned && <span className="tp-template-card-pinned" aria-hidden="true">●</span>}
      </header>

      {template.description && (
        <p className="tp-template-card-desc">{template.description}</p>
      )}

      {(zone || template.distance || template.warmup) && (
        <div className="tp-template-card-tags">
          {zone && <ZoneBadge zone={zone} label={intensityLabel} />}
          {template.distance && <Pill>{template.distance}</Pill>}
          {template.warmup && <Pill>Oppv: {template.warmup}</Pill>}
        </div>
      )}

      <footer className="tp-template-card-foot">
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
            className="tp-template-card-secondary"
          >
            {secondaryLabel}
          </Button>
        )}
        <div className="tp-template-card-icon-actions">
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
