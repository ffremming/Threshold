import { useState } from 'react'
import { formatDuration, formatLoad, formatPauseLabel } from '../../sessionBlocks'
import ExercisePicker from '../Strength/ExercisePicker'
import SliderRow from './SliderRow'
import {
  DURATION_MAX,
  DURATION_MIN,
  DURATION_STEP,
  LOAD_MAX,
  LOAD_MIN,
  LOAD_STEP,
  REST_MAX,
  REST_MIN,
  REST_STEP,
  SETS_MAX,
  SETS_MIN,
  SETS_STEP,
  SPRINT_REPS_MAX,
  SPRINT_REPS_MIN,
  SPRINT_REPS_STEP,
  SPRINT_SEC_MAX,
  SPRINT_SEC_MIN,
  SPRINT_SEC_STEP,
  STRENGTH_REPS_MAX,
  STRENGTH_REPS_MIN,
  STRENGTH_REPS_STEP,
  formatSeconds,
} from './constants'

// Editor for a strength "exercise" section: name + sets/reps/load/rest.
// Distance and pace are intentionally absent — they make no sense here.
export function StrengthSliders({ block, onPatch }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const chosenName = block.exerciseName?.trim()

  function handleSelect(exercise) {
    onPatch({ exerciseId: exercise.id, exerciseName: exercise.name })
  }

  return (
    <div className="th-block-sliders">
      <label className="th-block-text-field">
        <span className="th-block-text-label">Exercise</span>
        <button
          type="button"
          className={`th-exercise-trigger${chosenName ? '' : ' is-empty'}`}
          onClick={() => setPickerOpen(true)}
        >
          <span>{chosenName || 'Choose an exercise…'}</span>
          <span className="th-exercise-trigger-action">
            {chosenName ? 'Change' : 'Browse'}
          </span>
        </button>
      </label>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelect}
      />

      <SliderRow
        label="Sets"
        value={Math.max(SETS_MIN, Number(block.sets) || 1)}
        min={SETS_MIN}
        max={SETS_MAX}
        step={SETS_STEP}
        display={`${Math.max(SETS_MIN, Number(block.sets) || 1)} sets`}
        onChange={(v) => onPatch({ sets: Math.round(v) })}
      />

      <SliderRow
        label="Repetitions"
        value={Math.max(STRENGTH_REPS_MIN, Number(block.reps) || 1)}
        min={STRENGTH_REPS_MIN}
        max={STRENGTH_REPS_MAX}
        step={STRENGTH_REPS_STEP}
        display={`${Math.max(0, Number(block.reps) || 0)} reps`}
        onChange={(v) => onPatch({ reps: Math.round(v) })}
      />

      <SliderRow
        label="Load"
        value={Math.min(LOAD_MAX, Math.max(LOAD_MIN, Number(block.loadKg) || 0))}
        min={LOAD_MIN}
        max={LOAD_MAX}
        step={LOAD_STEP}
        display={formatLoad(Number(block.loadKg) || 0)}
        onChange={(v) => onPatch({ loadKg: Number(v.toFixed(1)) })}
      />

      <SliderRow
        label="Rest between sets"
        value={Math.min(REST_MAX, Math.max(REST_MIN, Number(block.restSec) || 0))}
        min={REST_MIN}
        max={REST_MAX}
        step={REST_STEP}
        display={formatPauseLabel(Number(block.restSec) || 0)}
        onChange={(v) => onPatch({ restSec: Math.round(v) })}
      />

      <div className="th-block-totals">
        <span className="th-block-total">
          <span className="th-block-total-label">Estimated time</span>
          <span className="th-block-total-value">{formatDuration(block.durationMin)}</span>
        </span>
      </div>
    </div>
  )
}

// Editor for a sprint section: pure time-based work, reps × seconds.
// No distance, pace, or rest — intentionally minimal.
export function SprintSliders({ block, onPatch }) {
  const reps = Math.max(SPRINT_REPS_MIN, Number(block.reps) || 1)
  const sprintSec = Math.max(0, Number(block.sprintSec) || 0)
  return (
    <div className="th-block-sliders">
      <SliderRow
        label="Number of reps"
        value={reps}
        min={SPRINT_REPS_MIN}
        max={SPRINT_REPS_MAX}
        step={SPRINT_REPS_STEP}
        display={`${reps}×`}
        onChange={(v) => onPatch({ reps: Math.round(v) })}
      />

      <SliderRow
        label="Work time"
        value={Math.min(SPRINT_SEC_MAX, Math.max(SPRINT_SEC_MIN, sprintSec || SPRINT_SEC_MIN))}
        min={SPRINT_SEC_MIN}
        max={SPRINT_SEC_MAX}
        step={SPRINT_SEC_STEP}
        display={formatSeconds(sprintSec)}
        onChange={(v) => onPatch({ sprintSec: Math.round(v) })}
      />

      <div className="th-block-totals">
        <span className="th-block-total">
          <span className="th-block-total-label">Total time</span>
          <span className="th-block-total-value">{formatDuration(block.durationMin)}</span>
        </span>
      </div>
    </div>
  )
}

// Editor for a duration-only section (yoga / ball sports / time-based
// warmup & cooldown). Just a single duration slider.
export function DurationSliders({ block, onPatch }) {
  return (
    <div className="th-block-sliders">
      <SliderRow
        label="Duration"
        value={Math.min(DURATION_MAX, Math.max(DURATION_MIN, Number(block.durationMin) || DURATION_MIN))}
        min={DURATION_MIN}
        max={DURATION_MAX}
        step={DURATION_STEP}
        display={formatDuration(block.durationMin)}
        onChange={(v) => onPatch({ durationMin: Math.round(v) })}
      />
    </div>
  )
}
