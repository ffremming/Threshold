import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import SectionCard from './SectionCard'
import {
  SECTION_LABELS,
  computeSessionTotals,
  createSection,
  formatDistance,
  formatDuration,
  getAddableKinds,
  getSessionDomain,
  normalizeBlocks,
} from '../sessionBlocks'
import './SessionEditor.css'

export default function SessionEditor({ value, onChange, activityTag, workoutType = 'continuous' }) {
  const domain = getSessionDomain(activityTag)
  const addableKinds = getAddableKinds(activityTag)

  const normalized = useMemo(() => {
    const result = normalizeBlocks(value, activityTag)
    if (result) return result
    if (domain === 'strength') {
      return { sections: [createSection('exercise', activityTag)] }
    }
    if (domain === 'duration') {
      return { sections: [createSection('effort', activityTag)] }
    }
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
  }, [value, activityTag, workoutType, domain])

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

  // Strength sessions track no distance — only show total time.
  const showDistanceTotal = domain === 'distance'

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
        {addableKinds.map(kind => (
          <button
            key={kind}
            type="button"
            className={`tp-session-add-btn tp-session-add-btn--${kind}`}
            onClick={() => addSection(kind)}
          >
            <span className="tp-session-add-icon" aria-hidden="true">
              <Plus size={14} strokeWidth={2.5} />
            </span>
            {SECTION_LABELS[kind]}
          </button>
        ))}
      </div>

      <div className="tp-session-totals">
        <div className="tp-session-total">
          <span className="tp-session-total-label">Total tid</span>
          <span className="tp-session-total-value">{formatDuration(totals.totalDuration)}</span>
        </div>
        {showDistanceTotal && (
          <div className="tp-session-total">
            <span className="tp-session-total-label">Total distanse</span>
            <span className="tp-session-total-value">{formatDistance(totals.totalDistance)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
