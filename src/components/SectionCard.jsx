import { ArrowUp, ArrowDown, X } from 'lucide-react'
import BlockSliders from './BlockSliders'
import { SECTION_LABELS } from '../sessionBlocks'
import './SectionCard.css'

// One editable session part (warmup, interval, exercise, …).
export default function SectionCard({
  section,
  activityTag,
  canMoveUp,
  canMoveDown,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}) {
  const label = SECTION_LABELS[section.kind] || 'Section'
  // The exercise name doubles as the card title when present.
  const title = section.kind === 'exercise' && section.exerciseName?.trim()
    ? section.exerciseName.trim()
    : label
  return (
    <div className={`th-block-card th-block-card--${section.kind}`}>
      <div className="th-block-card-head">
        <span className="th-block-card-title">{title}</span>
        <div className="th-block-card-actions">
          <button
            type="button"
            className="th-block-card-icon-btn"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Move up"
            title="Move up"
          >
            <ArrowUp size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="th-block-card-icon-btn"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Move down"
            title="Move down"
          >
            <ArrowDown size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="th-block-card-icon-btn th-block-card-remove"
            onClick={onRemove}
            aria-label={`Remove ${label.toLowerCase()}`}
            title="Remove section"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
      <BlockSliders
        block={section}
        activityTag={activityTag}
        onChange={onChange}
      />
    </div>
  )
}
