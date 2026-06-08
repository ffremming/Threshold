import { useMemo, useState } from 'react'
import { Plus, Dumbbell } from 'lucide-react'
import SectionCard from './SectionCard'
import SessionMuscleMap from './Strength/SessionMuscleMap'
import ExercisePicker from './Strength/ExercisePicker'
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
  const [pickerOpen, setPickerOpen] = useState(false)

  function commit(nextSections) {
    onChange({ sections: nextSections })
  }

  // Append a new exercise section pre-filled from a library entry. Used by the
  // multi-add picker so a whole strength session can be assembled quickly.
  function addExerciseFromLibrary(exercise) {
    const section = createSection('exercise', activityTag)
    commit([...sections, { ...section, exerciseId: exercise.id, exerciseName: exercise.name }])
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
    <div className="th-session-editor">
      {sections.length === 0 ? (
        <div className="th-session-empty">Add a section to start.</div>
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

      {domain === 'strength' && (
        <button
          type="button"
          className="th-session-add-exercises"
          onClick={() => setPickerOpen(true)}
        >
          <Dumbbell size={16} strokeWidth={2.25} aria-hidden="true" />
          Add exercises
        </button>
      )}

      <div className="th-session-add-row">
        {addableKinds.map(kind => (
          <button
            key={kind}
            type="button"
            className={`th-session-add-btn th-session-add-btn--${kind}`}
            onClick={() => addSection(kind)}
          >
            <span className="th-session-add-icon" aria-hidden="true">
              <Plus size={14} strokeWidth={2.5} />
            </span>
            {SECTION_LABELS[kind]}
          </button>
        ))}
      </div>

      {domain === 'strength' && (
        <ExercisePicker
          open={pickerOpen}
          multiAdd
          onClose={() => setPickerOpen(false)}
          onSelect={addExerciseFromLibrary}
        />
      )}

      <div className="th-session-totals">
        <div className="th-session-total">
          <span className="th-session-total-label">Total time</span>
          <span className="th-session-total-value">{formatDuration(totals.totalDuration)}</span>
        </div>
        {showDistanceTotal && (
          <div className="th-session-total">
            <span className="th-session-total-label">Total distance</span>
            <span className="th-session-total-value">{formatDistance(totals.totalDistance)}</span>
          </div>
        )}
      </div>

      {domain === 'strength' && <SessionMuscleMap sections={sections} />}
    </div>
  )
}
