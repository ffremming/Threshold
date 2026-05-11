import { useMemo } from 'react'
import BlockSliders from './BlockSliders'
import {
  SECTION_LABELS,
  computeSessionTotals,
  createSection,
  formatDistance,
  formatDuration,
  normalizeBlocks,
} from '../sessionBlocks'
import './SessionEditor.css'

const ADDABLE_KINDS = ['warmup', 'steady', 'interval', 'cooldown']

export default function SessionEditor({ value, onChange, activityTag, workoutType = 'continuous' }) {
  const normalized = useMemo(() => {
    const result = normalizeBlocks(value, activityTag)
    if (result) return result
    if (workoutType === 'interval') {
      return {
        sections: [
          createSection('warmup', activityTag),
          createSection('interval', activityTag),
          createSection('cooldown', activityTag),
        ],
      }
    }
    return { sections: [createSection('steady', activityTag)] }
  }, [value, activityTag, workoutType])

  const sections = normalized.sections
  const totals = computeSessionTotals(normalized, activityTag)

  function commit(nextSections) {
    onChange({ sections: nextSections })
  }

  function updateSection(id, next) {
    commit(sections.map(s => (s.id === id ? { ...s, ...next, id } : s)))
  }

  function addSection(kind) {
    commit([...sections, createSection(kind, activityTag)])
  }

  function removeSection(id) {
    commit(sections.filter(s => s.id !== id))
  }

  function moveSection(id, delta) {
    const index = sections.findIndex(s => s.id === id)
    if (index < 0) return
    const target = index + delta
    if (target < 0 || target >= sections.length) return
    const next = [...sections]
    ;[next[index], next[target]] = [next[target], next[index]]
    commit(next)
  }

  return (
    <div className="tp-session-editor">
      {sections.length === 0 ? (
        <div className="tp-session-empty">Legg til en del for å starte.</div>
      ) : (
        sections.map((section, index) => (
          <SectionCard
            key={section.id}
            section={section}
            activityTag={activityTag}
            canMoveUp={index > 0}
            canMoveDown={index < sections.length - 1}
            onChange={(next) => updateSection(section.id, next)}
            onRemove={() => removeSection(section.id)}
            onMoveUp={() => moveSection(section.id, -1)}
            onMoveDown={() => moveSection(section.id, 1)}
          />
        ))
      )}

      <div className="tp-session-add-row">
        {ADDABLE_KINDS.map(kind => (
          <button
            key={kind}
            type="button"
            className={`tp-session-add-btn tp-session-add-btn--${kind}`}
            onClick={() => addSection(kind)}
          >
            <span aria-hidden="true">+</span> {SECTION_LABELS[kind]}
          </button>
        ))}
      </div>

      <div className="tp-session-totals">
        <div className="tp-session-total">
          <span className="tp-session-total-label">Total tid</span>
          <span className="tp-session-total-value">{formatDuration(totals.totalDuration)}</span>
        </div>
        <div className="tp-session-total">
          <span className="tp-session-total-label">Total distanse</span>
          <span className="tp-session-total-value">{formatDistance(totals.totalDistance)}</span>
        </div>
      </div>
    </div>
  )
}

function SectionCard({ section, activityTag, canMoveUp, canMoveDown, onChange, onRemove, onMoveUp, onMoveDown }) {
  const label = SECTION_LABELS[section.kind] || 'Del'
  return (
    <div className={`tp-block-card tp-block-card--${section.kind}`}>
      <div className="tp-block-card-head">
        <span className="tp-block-card-title">{label}</span>
        <div className="tp-block-card-actions">
          <button
            type="button"
            className="tp-block-card-icon-btn"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Flytt opp"
            title="Flytt opp"
          >↑</button>
          <button
            type="button"
            className="tp-block-card-icon-btn"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Flytt ned"
            title="Flytt ned"
          >↓</button>
          <button
            type="button"
            className="tp-block-card-remove"
            onClick={onRemove}
            aria-label={`Fjern ${label.toLowerCase()}`}
            title="Fjern del"
          >×</button>
        </div>
      </div>
      <BlockSliders
        block={section}
        activityTag={activityTag}
        onChange={onChange}
        mode={section.kind === 'interval' ? 'interval' : 'steady'}
      />
    </div>
  )
}
