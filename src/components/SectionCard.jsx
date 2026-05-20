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
  const label = SECTION_LABELS[section.kind] || 'Del'
  // The exercise name doubles as the card title when present.
  const title = section.kind === 'exercise' && section.exerciseName?.trim()
    ? section.exerciseName.trim()
    : label
  return (
    <div className={`tp-block-card tp-block-card--${section.kind}`}>
      <div className="tp-block-card-head">
        <span className="tp-block-card-title">{title}</span>
        <div className="tp-block-card-actions">
          <button
            type="button"
            className="tp-block-card-icon-btn"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Flytt opp"
            title="Flytt opp"
          >
            <ArrowUp size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="tp-block-card-icon-btn"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Flytt ned"
            title="Flytt ned"
          >
            <ArrowDown size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="tp-block-card-icon-btn tp-block-card-remove"
            onClick={onRemove}
            aria-label={`Fjern ${label.toLowerCase()}`}
            title="Fjern del"
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
